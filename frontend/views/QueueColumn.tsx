import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutline";
import { JSONTree } from "react-json-tree";
import useMessagePoller from "../hooks/useMessagePoller";
import useQueueActions from "../hooks/useQueueActions";
import useInterval from "../hooks/useInterval";
import SendMessageDialog from "../components/SendMessageDialog";
import Alert from "../components/Alert";
import { Queue, SqsMessage } from "../types";
import { formatRelativeTime, toLocaleString, getJsonOrRawData } from "../utils/time";
import { callApi } from "../api/Http";
import { JSON_TREE_THEME } from "../theme";

interface QueueColumnProps {
  queues: Queue[];
  queue: Queue | null;
  onSelectQueue: (queueName: string) => void;
  reloadQueues: () => void;
  globalPaused: boolean;
  showBorder: boolean;
  onRemove?: () => void;
}

const QueueColumn = ({
  queues,
  queue,
  onSelectQueue,
  reloadQueues,
  globalPaused,
  showBorder,
  onRemove,
}: QueueColumnProps) => {
  const poller = useMessagePoller(queue, globalPaused);
  const actions = useQueueActions(queue, reloadQueues, poller.clearMessages);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bodyView, setBodyView] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmDeleteQueue, setConfirmDeleteQueue] = useState(false);
  const [deletingMsg, setDeletingMsg] = useState<SqsMessage | null>(null);

  // Refresh queue attributes — faster when messages are present, slower when empty
  const knownCount = Math.max(
    parseInt(queue?.QueueAttributes?.ApproximateNumberOfMessages ?? "0", 10),
    poller.messages.length,
  );
  const attrRefreshMs = queue && !globalPaused ? (knownCount > 0 ? 3000 : 10000) : null;
  useInterval(reloadQueues, attrRefreshMs);

  const isActive = queue != null && !globalPaused && !poller.pollingPaused;

  const handleExpand = (msgId: string) =>
    setExpandedId((prev) => (prev === msgId ? null : msgId));

  const handleCopy = (body: string) => {
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const confirmDeleteMsg = () => {
    if (!deletingMsg || !queue) return;
    callApi({
      method: "POST",
      action: "DeleteMessage",
      queue,
      message: deletingMsg,
      onSuccess: () => {
        poller.removeMessage(deletingMsg.messageId!);
        setExpandedId(null);
        setDeletingMsg(null);
      },
      onError: () => setDeletingMsg(null),
    });
  };

  const error = poller.error || actions.error;
  const clearError = () => {
    poller.clearError();
    actions.clearError();
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: showBorder ? "4px solid #0A0A0A" : "none",
        minWidth: 0,
      }}
    >
      {/* Column header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: queue ? 0.75 : 0 }}>
          {onRemove && (
            <Tooltip title="Close column">
              <IconButton size="small" onClick={onRemove} aria-label="Close column">
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Autocomplete
            options={queues}
            getOptionLabel={(q) => q.QueueName}
            value={queue}
            onChange={(_, q) => q && onSelectQueue(q.QueueName)}
            disabled={queues.length === 0}
            disableClearable
            isOptionEqualToValue={(a, b) => a.QueueName === b.QueueName}
            size="small"
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select queue…"
                sx={{ "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: "13px" } }}
              />
            )}
            renderOption={(props, q) => {
              const count = parseInt(q.QueueAttributes?.ApproximateNumberOfMessages ?? "0", 10);
              return (
                <li {...props} key={q.QueueName}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                    <Typography sx={{ fontFamily: "monospace", fontSize: "13px", flexGrow: 1 }}>{q.QueueName}</Typography>
                    {count > 0 && <Chip size="small" label={count} />}
                  </Box>
                </li>
              );
            }}
          />
          {queue && (
            <>
              {(() => {
                const approx = parseInt(queue.QueueAttributes?.ApproximateNumberOfMessages ?? "0", 10);
                const count = Math.max(approx, poller.messages.length);
                return count > 0 ? (
                  <Chip label={count} size="small" variant="outlined"
                    sx={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700 }} />
                ) : null;
              })()}
              <Tooltip title={isActive ? "Pause polling" : "Resume polling"}>
                <IconButton size="small" onClick={() => poller.setPollingPaused((p) => !p)}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%",
                    bgcolor: isActive ? "success.main" : "action.disabled",
                    animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
        {queue && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <SendMessageDialog disabled={!queue} onSubmit={actions.sendMessageToCurrentQueue} queue={queue} />
            <Button size="small" variant="text" color="error" onClick={() => setConfirmPurge(true)}>
              Purge
            </Button>
            <Button size="small" variant="text" color="error" onClick={() => setConfirmDeleteQueue(true)}>
              Delete
            </Button>
            <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
              <Button size="small" variant="text"
                onClick={() => setBodyView("tree")}
                sx={{ color: bodyView === "tree" ? "text.primary" : "text.disabled", fontWeight: bodyView === "tree" ? 700 : 400 }}
              >Tree</Button>
              <Button size="small" variant="text"
                onClick={() => setBodyView("raw")}
                sx={{ color: bodyView === "raw" ? "text.primary" : "text.disabled", fontWeight: bodyView === "raw" ? 700 : 400 }}
              >Raw</Button>
            </Box>
          </Box>
        )}
      </Box>

      {error && (
        <Box sx={{ px: 1.5, pt: 1, flexShrink: 0 }}>
          <Alert message={error} severity="error" onClose={clearError} />
        </Box>
      )}

      {!queue && (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary" variant="body2">
            Select a queue
          </Typography>
        </Box>
      )}

      {queue && poller.messages.length === 0 && (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          <Typography color="text.secondary" variant="body2">
            No messages
          </Typography>
          <Typography color="text.secondary" variant="caption">
            Polling every 3s
          </Typography>
        </Box>
      )}

      {queue && poller.messages.length > 0 && (
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {poller.messages.map((msg) => (
            <Accordion
              key={msg.messageId}
              expanded={expandedId === msg.messageId}
              onChange={() => handleExpand(msg.messageId!)}
              disableGutters
              sx={{
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                width: "100%",
                minWidth: 0,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                sx={{ minHeight: 48, px: 2, overflow: "hidden" }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", width: "100%", overflow: "hidden", mr: 1, gap: 0.25 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700 }}>
                      {msg.messageId?.slice(0, 8)}…
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {msg.messageAttributes?.SentTimestamp
                        ? formatRelativeTime(new Date(parseInt(msg.messageAttributes.SentTimestamp)))
                        : ""}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {msg.messageBody.slice(0, 60)}{msg.messageBody.length > 60 ? "…" : ""}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  bgcolor: "#FAFAFA",
                  borderTop: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, mr: "auto" }}
                  >
                    Body
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy"}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(msg.messageBody)}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete message">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMsg(msg);
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    p: 1.5,
                    overflow: "hidden",
                  }}
                >
                  {bodyView === "tree" ? (
                    <Box sx={{ overflowX: "auto" }}>
                      <JSONTree
                        data={getJsonOrRawData(msg.messageBody)}
                        theme={JSON_TREE_THEME}
                        invertTheme={false}
                        keyPath={["message"]}
                        hideRoot
                      />
                    </Box>
                  ) : (
                    <Box
                      component="pre"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        m: 0,
                        overflowX: "auto",
                      }}
                    >
                      {msg.messageBody}
                    </Box>
                  )}
                </Box>
                {msg.customAttributes &&
                  Object.keys(msg.customAttributes).length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                        Attributes
                      </Typography>
                      <Box sx={{ border: "1px solid", borderColor: "divider", p: 1.5, overflowX: "auto" }}>
                        <JSONTree
                          data={msg.customAttributes}
                          theme={JSON_TREE_THEME}
                          invertTheme={false}
                          keyPath={["attributes"]}
                          hideRoot
                        />
                      </Box>
                    </Box>
                  )}
                <Box
                  sx={{
                    mt: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                  }}
                >
                  {(
                    [
                      [
                        "Receive Count",
                        msg.messageAttributes?.ApproximateReceiveCount,
                      ],
                      ["Sender", msg.messageAttributes?.SenderId],
                      ["Group", msg.messageAttributes?.MessageGroupId],
                      [
                        "First Received",
                        msg.messageAttributes
                          ?.ApproximateFirstReceiveTimestamp
                          ? toLocaleString(
                              msg.messageAttributes
                                .ApproximateFirstReceiveTimestamp,
                            )
                          : undefined,
                      ],
                    ] as [string, string | undefined][]
                  )
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <Box
                        key={label}
                        sx={{ display: "flex", gap: 1 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ minWidth: 90 }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <Dialog
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        maxWidth="xs"
      >
        <DialogTitle>Purge Queue?</DialogTitle>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmPurge(false)}>
            Keep Messages
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmPurge(false);
              actions.purgeCurrentQueue();
            }}
          >
            Purge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteQueue}
        onClose={() => setConfirmDeleteQueue(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Queue?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete{" "}
            <Box
              component="span"
              sx={{ fontFamily: "monospace", fontWeight: 600 }}
            >
              {queue?.QueueName}
            </Box>
            . This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmDeleteQueue(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDeleteQueue(false);
              actions.deleteCurrentQueue();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deletingMsg != null}
        onClose={() => setDeletingMsg(null)}
        maxWidth="xs"
      >
        <DialogTitle>Delete message?</DialogTitle>
        <DialogActions>
          <Button variant="text" onClick={() => setDeletingMsg(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteMsg}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QueueColumn;
