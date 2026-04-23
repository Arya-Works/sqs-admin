import { useState, useEffect, useRef } from "react";
import { callApi } from "../api/Http";
import { Queue, AwsRegion } from "../types";

interface UseQueueListReturn {
  queues: Queue[];
  region: AwsRegion;
  isLoading: boolean;
  isLocalStack: boolean;
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
  const [isLocalStack, setIsLocalStack] = useState(true);
  const [disabledStatus, setDisabledStatus] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const hasLoadedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownModeRef = useRef<boolean | null>(null);
  // When initialRegion is set, hold off fetching queues until SetRegion finishes.
  const [readyForFetch, setReadyForFetch] = useState(!initialRegion);
  // Snapshot the mount-time URL region so the setup effect runs exactly once.
  // Subsequent region changes go through changeRegion, not this effect.
  const initialRegionRef = useRef(initialRegion);

  const reloadQueues = () => setReloadCount(c => c + 1);

  useEffect(() => {
    if (!readyForFetch) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    callApi({
      method: "GET",
      onSuccess: (data: Queue[]) => {
        hasLoadedRef.current = true;
        setQueues(data);
        setDisabledStatus(data.length === 0);
        setIsLoading(false);
      },
      onError: (err) => {
        setIsLoading(false);
        if (hasLoadedRef.current) {
          // Server restarted or unreachable — clear stale data and retry quickly.
          setQueues([]);
          setDisabledStatus(true);
          retryTimerRef.current = setTimeout(reloadQueues, 2000);
        } else {
          setError(err);
        }
      },
    });
  }, [reloadCount, readyForFetch]);

  useEffect(() => {
    callApi({
      method: "POST",
      action: "GetMode",
      queue: { QueueName: "" } as Queue,
      onSuccess: (data: { localstack: boolean }) => {
        if (typeof data?.localstack !== "boolean") return;
        if (knownModeRef.current !== null && knownModeRef.current !== data.localstack) {
          window.location.reload();
          return;
        }
        knownModeRef.current = data.localstack;
        setIsLocalStack(data.localstack);
      },
      onError: () => {},
    });
  }, [reloadCount]);

  useEffect(() => {
    if (initialRegionRef.current) {
      callApi({
        method: "POST",
        action: "SetRegion",
        queue: { QueueName: "" } as Queue,
        region: initialRegionRef.current,
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
  }, []);

  useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

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

  return { queues, region, isLoading, isLocalStack, disabledStatus, error, reloadQueues, clearError, changeRegion };
};

export default useQueueList;
