import { useState, useEffect } from "react";
import { callApi } from "../api/Http";
import { Queue, AwsRegion } from "../types";

interface UseQueueListReturn {
  queues: Queue[];
  region: AwsRegion;
  disabledStatus: boolean;
  error: string;
  reloadQueues: () => void;
  clearError: () => void;
}

/** Fetches the queue list and AWS region. Exposes reloadQueues to trigger a re-fetch. */
const useQueueList = (): UseQueueListReturn => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [region, setRegion] = useState<AwsRegion>({ region: "" });
  const [disabledStatus, setDisabledStatus] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  // Increments the counter — replaces the old boolean triggerReload toggle.
  const reloadQueues = () => setReloadCount(c => c + 1);

  useEffect(() => {
    callApi({
      method: "GET",
      onSuccess: (data: Queue[]) => {
        setQueues(data);
        setDisabledStatus(data.length === 0);
      },
      onError: setError,
    });
    // URL fallback logic (setting the queue param) stays in Overview.tsx.
  }, [reloadCount]);

  useEffect(() => {
    callApi({
      method: "POST",
      action: "GetRegion",
      queue: { QueueName: "" } as Queue,
      onSuccess: setRegion,
      onError: setError,
    });
  }, []);

  const clearError = () => setError("");

  return { queues, region, disabledStatus, error, reloadQueues, clearError };
};

export default useQueueList;
