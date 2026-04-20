import { useState, useEffect, useRef } from "react";
import useInterval from "./useInterval";
import { callApi } from "../api/Http";
import { Queue, SqsMessage } from "../types";

interface UseMessagePollerReturn {
  messages: SqsMessage[];
  lastUpdatedAt: Date | null;
  consecutiveEmptyCount: React.MutableRefObject<number>;
  pollingPaused: boolean;
  setPollingPaused: React.Dispatch<React.SetStateAction<boolean>>;
  perQueuePaused: Record<string, boolean>;
  setPerQueuePaused: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  clearMessages: () => void;
  removeMessage: (messageId: string) => void;
  clearError: () => void;
  error: string;
}

/** Polls SQS for messages every 3 seconds. Implements stale-while-revalidate: holds stale
 *  messages until 3 consecutive empty responses, then clears. */
const useMessagePoller = (selectedQueue: Queue | null): UseMessagePollerReturn => {
  const [messages, setMessages] = useState<SqsMessage[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const consecutiveEmptyCount = useRef(0);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [perQueuePaused, setPerQueuePaused] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const pollMessages = async () => {
    if (!selectedQueue?.QueueUrl) return;

    await callApi({
      method: "POST",
      action: "GetMessages",
      queue: selectedQueue,
      onSuccess: (data: SqsMessage[]) => {
        if (data.length > 0) {
          consecutiveEmptyCount.current = 0;
          setMessages(data);
          setLastUpdatedAt(new Date());
        } else {
          consecutiveEmptyCount.current += 1;
          if (consecutiveEmptyCount.current >= 3) {
            setMessages([]);
          }
          // else: hold existing messages — stale-while-revalidate
        }
      },
      onError: setError,
    });
  };

  useInterval(async () => {
    if (!pollingPaused && !perQueuePaused[selectedQueue?.QueueName ?? ""]) {
      await pollMessages();
    }
  }, 3000);

  useEffect(() => {
    consecutiveEmptyCount.current = 0;
    setMessages([]);
    setLastUpdatedAt(null);
    if (selectedQueue) {
      pollMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueue?.QueueName]);

  /** Narrows the interface per ISP — callers don't need raw setMessages access. */
  const clearMessages = () => {
    setMessages([]);
    consecutiveEmptyCount.current = 0;
    setLastUpdatedAt(null);
  };

  /** Narrow removal — mirrors clearMessages per ISP. Pure filter, no side effects beyond state. */
  const removeMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
  };

  const clearError = () => setError("");

  return {
    messages,
    lastUpdatedAt,
    consecutiveEmptyCount,
    pollingPaused,
    setPollingPaused,
    perQueuePaused,
    setPerQueuePaused,
    clearMessages,
    removeMessage,
    clearError,
    error,
  };
};

export default useMessagePoller;
