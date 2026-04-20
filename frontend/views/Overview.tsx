import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert as MuiAlert, AlertTitle, Box, Container, Typography } from "@mui/material";
import useQueueList from "../hooks/useQueueList";
import useMessagePoller from "../hooks/useMessagePoller";
import useQueueActions from "../hooks/useQueueActions";
import Alert from "../components/Alert";
import AppShell from "./AppShell";
import MessageInbox from "./MessageInbox";
import MessageDetail from "./MessageDetail";
import { SqsMessage } from "../types";
import { callApi } from "../api/Http";

/** Composition shell: wires hooks to the three-pane layout. No business logic. */
const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    queues,
    region,
    disabledStatus,
    error: listError,
    reloadQueues,
    clearError: clearListError,
  } = useQueueList();
  const selectedQueueName = searchParams.get("queue");
  const selectedQueue =
    queues.find((q) => q.QueueName === selectedQueueName) ?? queues[0] ?? null;
  const poller = useMessagePoller(selectedQueue);
  const actions = useQueueActions(
    selectedQueue,
    reloadQueues,
    poller.clearMessages,
  );
  const error = listError || poller.error || actions.error;
  const clearAllErrors = () => {
    clearListError();
    poller.clearError();
    actions.clearError();
  };
  const selectQueue = (queueName: string) =>
    setSearchParams({ queue: queueName });

  // Selected message state — transient UI state, not domain state
  const [selectedMessage, setSelectedMessage] = useState<SqsMessage | null>(
    null,
  );

  // Clear selected message when queue changes
  useEffect(() => {
    setSelectedMessage(null);
  }, [selectedQueue?.QueueName]);

  // Clear selected message when it disappears from the messages list (e.g., after purge)
  useEffect(() => {
    if (
      selectedMessage &&
      !poller.messages.find(
        (m) => m.messageId === selectedMessage.messageId,
      )
    ) {
      setSelectedMessage(null);
    }
  }, [poller.messages, selectedMessage]);

  const handleDeleteMessage = (message: SqsMessage) => {
    if (!selectedQueue) return;
    // Compute remaining locally BEFORE dispatching state update — React state is async,
    // and reading poller.messages after removeMessage would return stale data.
    const currentIndex = poller.messages.findIndex(
      (m) => m.messageId === message.messageId,
    );
    const remaining = poller.messages.filter(
      (m) => m.messageId !== message.messageId,
    );
    callApi({
      method: "POST",
      action: "DeleteMessage",
      queue: selectedQueue,
      message: message,
      onSuccess: () => {
        poller.removeMessage(message.messageId!);
        if (remaining.length === 0) {
          setSelectedMessage(null);
        } else {
          const nextIndex = Math.min(currentIndex, remaining.length - 1);
          setSelectedMessage(remaining[nextIndex]);
        }
      },
      onError: (err: string) => {
        // eslint-disable-next-line no-console
        console.error("DeleteMessage failed:", err);
      },
    });
  };

  useEffect(() => {
    if (queues.length > 0) {
      const urlQueue = searchParams.get("queue");
      if (!urlQueue || !queues.find((q) => q.QueueName === urlQueue)) {
        setSearchParams({ queue: queues[0].QueueName }, { replace: true });
      }
    }
  }, [queues, searchParams, setSearchParams]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppShell
        queues={queues}
        region={region}
        selectedQueue={selectedQueue}
        pollingPaused={poller.pollingPaused}
        perQueuePaused={poller.perQueuePaused}
        disabledStatus={disabledStatus}
        onSelectQueue={selectQueue}
        onToggleGlobalPause={() => poller.setPollingPaused((p) => !p)}
        onToggleQueuePause={(name) =>
          poller.setPerQueuePaused((prev) => ({
            ...prev,
            [name]: !prev[name],
          }))
        }
        onCreateQueue={actions.createNewQueue}
        onDeleteQueue={actions.deleteCurrentQueue}
        onSendMessage={actions.sendMessageToCurrentQueue}
        onPurgeQueue={actions.purgeCurrentQueue}
        lastUpdatedAt={poller.lastUpdatedAt}
        consecutiveEmptyCount={poller.consecutiveEmptyCount}
      />
      {error !== "" && (
        <Container maxWidth="md" sx={{ mt: 1 }}>
          <Alert message={error} severity="error" onClose={clearAllErrors} />
        </Container>
      )}
      {queues?.length === 0 && (
        <Container maxWidth="md" sx={{ mt: 1 }}>
          <MuiAlert severity="info">
            <AlertTitle>No Queue</AlertTitle>
            {`No Queues exist in region: ${region.region ? region.region : "eu-central-1"}`}
          </MuiAlert>
        </Container>
      )}
      {/* Content area: show split only when there are messages to display */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {poller.messages.length > 0 ? (
          // Split layout: inbox (38%) + detail (62%)
          <>
            <MessageInbox
              messages={poller.messages}
              selectedMessageId={selectedMessage?.messageId ?? null}
              consecutiveEmptyCount={poller.consecutiveEmptyCount}
              selectedQueue={selectedQueue}
              onSelectMessage={setSelectedMessage}
            />
            <MessageDetail
              message={selectedMessage}
              onDelete={handleDeleteMessage}
            />
          </>
        ) : (
          // Full-width empty state — no split when nothing to show
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <Typography variant="body1">
              {!selectedQueue
                ? "Select a queue to view messages"
                : "No messages in this queue"}
            </Typography>
            {selectedQueue && (
              <Typography variant="caption">
                Polling every 3s — messages will appear as they arrive
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Overview;
