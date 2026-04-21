import { useState, useEffect } from "react";
import { callApi } from "../api/Http";
import { Queue, AwsRegion } from "../types";

interface UseQueueListReturn {
  queues: Queue[];
  region: AwsRegion;
  isLoading: boolean;
  disabledStatus: boolean;
  error: string;
  reloadQueues: () => void;
  clearError: () => void;
  changeRegion: (region: string) => void;
}

/** Fetches the queue list and AWS region. Exposes reloadQueues to trigger a re-fetch.
 *  When initialRegion is provided, the queue fetch is sequenced after SetRegion completes
 *  so the GET always hits the correct region. */
const useQueueList = (initialRegion?: string): UseQueueListReturn => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [region, setRegion] = useState<AwsRegion>({ region: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [disabledStatus, setDisabledStatus] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  // When initialRegion is set, hold off fetching queues until SetRegion finishes.
  const [readyForFetch, setReadyForFetch] = useState(!initialRegion);

  const reloadQueues = () => setReloadCount(c => c + 1);

  useEffect(() => {
    if (!readyForFetch) return;
    callApi({
      method: "GET",
      onSuccess: (data: Queue[]) => {
        setQueues(data);
        setDisabledStatus(data.length === 0);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err);
        setIsLoading(false);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadCount, readyForFetch]);

  useEffect(() => {
    if (initialRegion) {
      callApi({
        method: "POST",
        action: "SetRegion",
        queue: { QueueName: "" } as Queue,
        region: initialRegion,
        onSuccess: (data: AwsRegion) => {
          setRegion(data);
          setReadyForFetch(true);
        },
        onError: setError,
      });
    } else {
      callApi({
        method: "POST",
        action: "GetRegion",
        queue: { QueueName: "" } as Queue,
        onSuccess: setRegion,
        onError: setError,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearError = () => setError("");

  const changeRegion = (newRegion: string) => {
    callApi({
      method: "POST",
      action: "SetRegion",
      queue: { QueueName: "" } as Queue,
      region: newRegion,
      onSuccess: (data: AwsRegion) => {
        setRegion(data);
        reloadQueues();
      },
      onError: setError,
    });
  };

  return { queues, region, isLoading, disabledStatus, error, reloadQueues, clearError, changeRegion };
};

export default useQueueList;
