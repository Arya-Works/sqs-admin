import { useState, useEffect, useRef } from "react";
import useInterval from "./useInterval";
import { callApi } from "../api/Http";
import { Queue, SqsMessage } from "../types";

interface UseMessagePollerReturn {
  messages: SqsMessage[];
  lastUpdatedAt: Date | null;
  isLoading: boolean;
  hasLoaded: boolean;
  consecutiveEmptyCount: React.MutableRefObject<number>;
  clearMessages: () => void;
  refreshMessages: () => void;
  removeMessage: (messageId: string) => void;
  clearError: () => void;
  error: string;
}

/** Polls SQS for messages every second. Accumulates messages — only clears on queue switch,
 *  purge, or explicit delete. */
const useMessagePoller = (selectedQueue: Queue | null): UseMessagePollerReturn => {
  const [messages, setMessages] = useState<SqsMessage[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const consecutiveEmptyCount = useRef(0);
  const [error, setError] = useState("");

  const pollMessages = async () => {
    if (!selectedQueue?.QueueUrl) return;

    setIsLoading(true);
    await callApi({
      method: "POST",
      action: "GetMessages",
      queue: selectedQueue,
      onSuccess: (data: SqsMessage[]) => {
        setIsLoading(false);
        setHasLoaded(true);
        if (data.length > 0) {
          consecutiveEmptyCount.current = 0;
          setMessages(data);
          setLastUpdatedAt(new Date());
        } else {
          consecutiveEmptyCount.current += 1;
          // Hold existing messages on empty response — VisibilityTimeout means messages
          // are temporarily invisible, not gone. Never auto-clear from polling.
        }
      },
      onError: (err) => { setIsLoading(false); setHasLoaded(true); setError(err); },
    });
  };

  // Always points to the latest pollMessages without adding it as an effect dep.
  // useInterval already does this internally; the ref lets the queue-switch effect
  // call the current version without listing a recreated function in its dep array.
  const pollMessagesRef = useRef(pollMessages);
  pollMessagesRef.current = pollMessages;

  useInterval(async () => {
    await pollMessages();
  }, selectedQueue ? 1000 : null);

  useEffect(() => {
    consecutiveEmptyCount.current = 0;
    setMessages([]);
    setLastUpdatedAt(null);
    setHasLoaded(false);
    if (selectedQueue?.QueueName) {
      pollMessagesRef.current();
    }
  }, [selectedQueue?.QueueName]);

  const clearMessages = () => {
    setMessages([]);
    consecutiveEmptyCount.current = 0;
    setLastUpdatedAt(null);
  };

  const refreshMessages = () => {
    clearMessages();
    setHasLoaded(false);
    pollMessagesRef.current();
  };

  const removeMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
  };

  const clearError = () => setError("");

  return {
    messages,
    lastUpdatedAt,
    isLoading,
    hasLoaded,
    consecutiveEmptyCount,
    clearMessages,
    refreshMessages,
    removeMessage,
    clearError,
    error,
  };
};

export default useMessagePoller;
