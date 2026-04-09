import { useState } from "react";
import { callApi } from "../api/Http";
import { Queue, SqsMessage } from "../types";

interface UseQueueActionsReturn {
  createNewQueue: (queue: Queue) => Promise<void>;
  deleteCurrentQueue: () => Promise<void>;
  purgeCurrentQueue: () => Promise<void>;
  sendMessageToCurrentQueue: (message: SqsMessage) => Promise<void>;
  clearError: () => void;
  error: string;
}

/** Provides the four SQS mutation handlers. Accepts callbacks so cross-hook coordination
 *  happens without direct coupling between hooks. reloadQueues is invoked directly on
 *  success (no delayed scheduling). */
const useQueueActions = (
  selectedQueue: Queue | null,
  reloadQueues: () => void,
  clearMessages: () => void,
): UseQueueActionsReturn => {
  const [error, setError] = useState("");

  const createNewQueue = async (queue: Queue) => {
    await callApi({
      method: "POST",
      action: "CreateQueue",
      queue,
      onSuccess: reloadQueues,
      onError: setError,
    });
  };

  const deleteCurrentQueue = async () => {
    await callApi({
      method: "POST",
      action: "DeleteQueue",
      queue: selectedQueue!,
      onSuccess: () => {
        clearMessages();
        reloadQueues();
      },
      onError: setError,
    });
  };

  const purgeCurrentQueue = async () => {
    await callApi({
      method: "POST",
      action: "PurgeQueue",
      queue: selectedQueue!,
      onSuccess: clearMessages,
      onError: setError,
    });
  };

  const sendMessageToCurrentQueue = async (message: SqsMessage) => {
    const queueUrl = selectedQueue?.QueueUrl || null;
    if (queueUrl === null) {
      setError("Could not send message to non-existent queue");
      return;
    }
    if (
      selectedQueue?.QueueName.endsWith(".fifo") &&
      !message.messageAttributes?.MessageGroupId
    ) {
      setError("You need to set a MessageGroupID when sending Messages to a FIFO queue");
      return;
    }
    await callApi({
      method: "POST",
      action: "SendMessage",
      queue: selectedQueue!,
      message,
      onSuccess: () => {},
      onError: setError,
    });
  };

  const clearError = () => setError("");

  return {
    createNewQueue,
    deleteCurrentQueue,
    purgeCurrentQueue,
    sendMessageToCurrentQueue,
    clearError,
    error,
  };
};

export default useQueueActions;
