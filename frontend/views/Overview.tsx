import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import useQueueList from "../hooks/useQueueList";
import useMessagePoller from "../hooks/useMessagePoller";
import useQueueActions from "../hooks/useQueueActions";
import QueueSidebar from "./QueueSidebar";
import QueueDetail from "./QueueDetail";

/** Composition shell: wires hooks to view components. No business logic. */
const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { queues, region, disabledStatus, error: listError, reloadQueues, clearError: clearListError } = useQueueList();
  const selectedQueueName = searchParams.get("queue");
  const selectedQueue = queues.find(q => q.QueueName === selectedQueueName) ?? queues[0] ?? null;
  const poller = useMessagePoller(selectedQueue);
  const actions = useQueueActions(selectedQueue, reloadQueues, poller.clearMessages);
  const error = listError || poller.error || actions.error;
  const clearAllErrors = () => { clearListError(); poller.clearError(); actions.clearError(); };
  const selectQueue = (queueName: string) => setSearchParams({ queue: queueName });

  useEffect(() => {
    if (queues.length > 0) {
      const urlQueue = searchParams.get("queue");
      if (!urlQueue || !queues.find(q => q.QueueName === urlQueue)) {
        setSearchParams({ queue: queues[0].QueueName }, { replace: true });
      }
    }
  }, [queues, searchParams, setSearchParams]);

  return (
    <Box sx={{ display: "flex" }}>
      <QueueSidebar
        queues={queues}
        region={region}
        selectedQueue={selectedQueue}
        pollingPaused={poller.pollingPaused}
        perQueuePaused={poller.perQueuePaused}
        disabledStatus={disabledStatus}
        onSelectQueue={selectQueue}
        onToggleGlobalPause={() => poller.setPollingPaused(p => !p)}
        onToggleQueuePause={(name) => poller.setPerQueuePaused(prev => ({ ...prev, [name]: !prev[name] }))}
        onCreateQueue={actions.createNewQueue}
        onDeleteQueue={actions.deleteCurrentQueue}
        onSendMessage={actions.sendMessageToCurrentQueue}
        onPurgeQueue={actions.purgeCurrentQueue}
      />
      <QueueDetail
        queues={queues}
        region={region}
        selectedQueue={selectedQueue}
        messages={poller.messages}
        consecutiveEmptyCount={poller.consecutiveEmptyCount}
        lastUpdatedAt={poller.lastUpdatedAt}
        error={error}
        onClearError={clearAllErrors}
      />
    </Box>
  );
};

export default Overview;
