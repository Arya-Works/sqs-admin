import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert as MuiAlert, AlertTitle, Box, Container } from "@mui/material";
import useQueueList from "../hooks/useQueueList";
import useInterval from "../hooks/useInterval";
import { callApi } from "../api/Http";
import Alert from "../components/Alert";
import AppShell from "./AppShell";
import QueueColumn from "./QueueColumn";
import { Queue } from "../types";

const MIN_COLUMN_PX = 320;
const REGION_PARAM = "region";

/** djb2 hash → 6-char base-36 string. Compresses queue names in the URL. */
const hashQueue = (name: string): string => {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = (((h << 5) + h) ^ name.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).padStart(6, "0").slice(0, 6);
};

const slotParam = (i: number) => `q${i + 1}`;
const COUNT_PARAM = "c";

/** Multi-column layout — column count and queue selections all in the URL.
 *  Queue names are hashed (djb2, 6 base-36 chars) to keep URLs compact.
 *  Format: ?c=3&q1=abc123&q3=def456  (absent qN = empty column) */
const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRegion = searchParams.get(REGION_PARAM) ?? undefined;
  const { queues, region, isLoading, isLocalStack, error: listError, reloadQueues, clearError: clearListError, changeRegion } = useQueueList(urlRegion);

  // Keep queue attributes (message counts) fresh for all queues, including unselected ones
  useInterval(reloadQueues, 10_000);

  const maxColumns = Math.max(1, Math.floor(window.innerWidth / MIN_COLUMN_PX));
  const columnCount = Math.min(
    Math.max(1, parseInt(searchParams.get(COUNT_PARAM) ?? "1", 10) || 1),
    maxColumns,
  );

  // Migrate old ?cols= or ?q1=queueName (unhashed) params to new hashed format.
  // Include region.region in deps so migration runs once region is known, avoiding a
  // race where the region sync effect would otherwise overwrite the migrated URL.
  useEffect(() => {
    if (searchParams.get(COUNT_PARAM)) return;
    if (queues.length === 0) return;

    const params = new URLSearchParams();
    if (region.region) params.set(REGION_PARAM, region.region);

    // Legacy ?cols= format
    const cols = searchParams.get("cols");
    if (cols) {
      const names = cols.split("~").map((n) => n || null);
      params.set(COUNT_PARAM, String(names.length));
      names.forEach((name, i) => {
        if (name) params.set(slotParam(i), hashQueue(name));
      });
      setSearchParams(params, { replace: true });
      return;
    }

    // Legacy ?q1=queueName (unhashed) or ?queue=
    const legacy: (string | null)[] = [];
    let i = 0;
    let q = searchParams.get(`q${i + 1}`);
    while (q !== null) { legacy.push(q); i++; q = searchParams.get(`q${i + 1}`); }
    const oldQueue = searchParams.get("queue");
    if (legacy.length === 0) legacy.push(oldQueue ?? queues[0].QueueName);

    params.set(COUNT_PARAM, String(legacy.length));
    legacy.forEach((name, idx) => {
      if (name) params.set(slotParam(idx), hashQueue(name));
    });
    setSearchParams(params, { replace: true });
  }, [queues, region.region]);

  const getSlotQueue = (i: number): Queue | null => {
    const h = searchParams.get(slotParam(i));
    if (!h) return null;
    return queues.find((q) => hashQueue(q.QueueName) === h) ?? null;
  };

  const setSlotQueue = (i: number, queueName: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(slotParam(i), hashQueue(queueName));
    setSearchParams(params);
  };

  const setCount = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set(COUNT_PARAM, String(next));
    // Clear slots beyond the new count
    for (let i = next; i < columnCount; i++) params.delete(slotParam(i));
    setSearchParams(params);
  };

  const addColumn = () => {
    if (columnCount < maxColumns) setCount(columnCount + 1);
  };

  const removeColumn = (index: number) => {
    const params = new URLSearchParams(searchParams);
    // Shift slots left
    for (let i = index; i < columnCount - 1; i++) {
      const next = params.get(slotParam(i + 1));
      if (next) params.set(slotParam(i), next);
      else params.delete(slotParam(i));
    }
    params.delete(slotParam(columnCount - 1));
    params.set(COUNT_PARAM, String(Math.max(1, columnCount - 1)));
    setSearchParams(params);
  };

  // After GetRegion resolves, write the region into the URL.
  // Guard on COUNT_PARAM: if migration hasn't run yet, it will include the region
  // itself. Without this guard, region sync would overwrite the migrated URL with
  // a stale copy of searchParams from the same render cycle.
  useEffect(() => {
    if (!region.region) return;
    if (!searchParams.get(COUNT_PARAM)) return;
    if (searchParams.get(REGION_PARAM)) return;
    const params = new URLSearchParams(searchParams);
    params.set(REGION_PARAM, region.region);
    setSearchParams(params, { replace: true });
  }, [region.region, searchParams, setSearchParams]);

  const handleRegionChange = (newRegion: string) => {
    changeRegion(newRegion);
    const params = new URLSearchParams(searchParams);
    params.set(REGION_PARAM, newRegion);
    setSearchParams(params, { replace: true });
  };

  const handleCreateQueue = (queue: Queue) => {
    callApi({ method: "POST", action: "CreateQueue", queue, onSuccess: reloadQueues, onError: () => {} });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Box
        sx={{
          display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden",
          maxWidth: Math.max(columnCount * 480, 1440),
          transition: "max-width 0.3s ease",
          width: "100%", mx: "auto",
          bgcolor: "background.paper",
          borderLeft: "1px solid", borderRight: "1px solid", borderColor: "divider",
        }}
      >
        <AppShell
          region={region}
          onCreateQueue={handleCreateQueue}
          canAddColumn={columnCount < maxColumns}
          onAddColumn={addColumn}
          onRegionChange={handleRegionChange}
          isLocalStack={isLocalStack}
        />
        {listError && (
          <Container maxWidth="md" sx={{ mt: 1 }}>
            <Alert message={listError} severity="error" onClose={clearListError} />
          </Container>
        )}
        {!isLoading && queues.length === 0 && (
          <Container maxWidth="md" sx={{ mt: 1 }}>
            <MuiAlert severity="info">
              <AlertTitle>No Queues</AlertTitle>
              {`No queues in region: ${region.region || "eu-central-1"}`}
            </MuiAlert>
          </Container>
        )}
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
          {Array.from({ length: columnCount }, (_, i) => (
            <QueueColumn
              key={i}
              queues={queues}
              queue={getSlotQueue(i)}
              onSelectQueue={(name) => setSlotQueue(i, name)}
              reloadQueues={reloadQueues}
              showBorder={i < columnCount - 1}
              onRemove={columnCount > 1 ? () => removeColumn(i) : undefined}
              isLoadingQueues={isLoading}
              isLocalStack={isLocalStack}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Overview;
