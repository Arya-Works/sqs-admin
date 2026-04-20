import React, { useState, useEffect } from "react";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  GlobalStyles,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutline";
import CreateQueueDialog from "../components/CreateQueueDialog";
import SendMessageDialog from "../components/SendMessageDialog";
import { Queue, AwsRegion, SqsMessage } from "../types";
import { formatRelativeTime } from "../utils/time";

interface AppShellProps {
  queues: Queue[];
  region: AwsRegion;
  selectedQueue: Queue | null;
  pollingPaused: boolean;
  perQueuePaused: Record<string, boolean>;
  disabledStatus: boolean;
  onSelectQueue: (queueName: string) => void;
  onToggleGlobalPause: () => void;
  onToggleQueuePause: (queueName: string) => void;
  onCreateQueue: (queue: Queue) => void;
  onDeleteQueue: () => void;
  onSendMessage: (message: SqsMessage) => void;
  onPurgeQueue: () => void;
  lastUpdatedAt: Date | null;
  consecutiveEmptyCount: React.MutableRefObject<number>;
}

/** Top AppBar: queue selector dropdown, actions overflow menu, pause toggle, region badge. */
const AppShell = ({
  queues,
  region,
  selectedQueue,
  pollingPaused,
  perQueuePaused,
  disabledStatus,
  onSelectQueue,
  onToggleGlobalPause,
  onToggleQueuePause,
  onCreateQueue,
  onDeleteQueue,
  onSendMessage,
  onPurgeQueue,
  lastUpdatedAt,
  consecutiveEmptyCount,
}: AppShellProps) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-render every second so formatRelativeTime stays current (migrated from QueueHeader)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  const isSelectedQueueActive =
    selectedQueue != null &&
    !pollingPaused &&
    !perQueuePaused[selectedQueue.QueueName];

  return (
    <>
      <GlobalStyles
        styles={{
          "@keyframes pulse": {
            "0%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.5, transform: "scale(1.3)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      />
      <AppBar position="static" sx={{ bgcolor: "#6750A4" }}>
        <Toolbar>
          {/* Left slot: app title */}
          <Typography variant="h6" sx={{ mr: 2, flexShrink: 0 }}>
            SQS Admin
          </Typography>

          {/* Queue selector with search */}
          <Autocomplete
            options={queues}
            getOptionLabel={(q) => q.QueueName}
            value={selectedQueue}
            onChange={(_, queue) => queue && onSelectQueue(queue.QueueName)}
            disabled={queues.length === 0}
            disableClearable
            isOptionEqualToValue={(a, b) => a.QueueName === b.QueueName}
            noOptionsText="No matching queues"
            sx={{ minWidth: 240, maxWidth: 480 }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                placeholder={queues.length === 0 ? `No queues in ${region.region}` : "Search queues…"}
                sx={{
                  "& .MuiInputBase-input": { color: "#fff", fontFamily: "monospace", fontSize: "14px" },
                  "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.6)", opacity: 1 },
                  "& .MuiInput-underline:before": { borderBottomColor: "rgba(255,255,255,0.4)" },
                  "& .MuiInput-underline:hover:before": { borderBottomColor: "#fff" },
                  "& .MuiInput-underline:after": { borderBottomColor: "#fff" },
                  "& .MuiSvgIcon-root": { color: "#fff" },
                }}
              />
            )}
            renderOption={(props, queue) => {
              const count = parseInt(queue.QueueAttributes?.ApproximateNumberOfMessages ?? "0", 10);
              return (
                <li {...props} key={queue.QueueName}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", flexWrap: "wrap" }}>
                    <Typography sx={{ fontFamily: "monospace", fontSize: "13px", wordBreak: "break-all", flexGrow: 1 }}>
                      {queue.QueueName}
                    </Typography>
                    {count > 0 && <Chip size="small" label={count} />}
                  </Box>
                </li>
              );
            }}
          />

          {/* Per-queue polling dot for selected queue */}
          {selectedQueue && (
            <Tooltip
              title={
                isSelectedQueueActive
                  ? `Pause polling for ${selectedQueue.QueueName}`
                  : `Resume polling for ${selectedQueue.QueueName}`
              }
            >
              <IconButton
                size="small"
                onClick={() => onToggleQueuePause(selectedQueue.QueueName)}
                aria-label={
                  isSelectedQueueActive
                    ? `Pause polling for ${selectedQueue.QueueName}`
                    : `Resume polling for ${selectedQueue.QueueName}`
                }
                sx={{ ml: 1 }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: isSelectedQueueActive
                      ? "success.main"
                      : "action.disabled",
                    animation: isSelectedQueueActive
                      ? "pulse 1.5s ease-in-out infinite"
                      : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          {/* Stale timestamp — shown when polling has produced empties (migrated from QueueHeader) */}
          {lastUpdatedAt &&
            consecutiveEmptyCount.current > 0 &&
            consecutiveEmptyCount.current < 3 && (
              <Typography
                variant="caption"
                sx={{ ml: 1, color: "rgba(255,255,255,0.7)" }}
                aria-live="polite"
              >
                {formatRelativeTime(lastUpdatedAt)}
              </Typography>
            )}

          {/* Queue action buttons — visible inline on wider screens */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, ml: 1 }}>
            <Box
              sx={{
                "& .MuiButton-contained": {
                  bgcolor: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.28)", boxShadow: "none" },
                  "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.38)" },
                },
              }}
            >
              <SendMessageDialog
                disabled={!selectedQueue || disabledStatus}
                onSubmit={onSendMessage}
                queue={selectedQueue ?? { QueueName: "" }}
              />
            </Box>
            <Button
              variant="outlined"
              size="small"
              disabled={!selectedQueue || disabledStatus}
              onClick={() => setConfirmPurge(true)}
              sx={{
                color: "#ff8a80",
                borderColor: "rgba(255,100,100,0.45)",
                textTransform: "none",
                "&:hover": { borderColor: "#ff8a80", bgcolor: "rgba(255,100,100,0.08)" },
                "&.Mui-disabled": { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.15)" },
              }}
            >
              Purge Queue
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!selectedQueue || disabledStatus}
              onClick={() => setConfirmDelete(true)}
              sx={{
                color: "#ff8a80",
                borderColor: "rgba(255,100,100,0.45)",
                textTransform: "none",
                "&:hover": { borderColor: "#ff8a80", bgcolor: "rgba(255,100,100,0.08)" },
                "&.Mui-disabled": { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.15)" },
              }}
            >
              Delete Queue
            </Button>
          </Box>

          {/* Overflow menu — only on narrow screens where buttons don't fit */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <Tooltip title="Queue actions">
              <IconButton
                aria-label="Queue actions"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ color: "#fff", ml: 1 }}
              >
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem
                disableGutters
                sx={{ px: 0 }}
                disabled={!selectedQueue || disabledStatus}
              >
                <SendMessageDialog
                  disabled={!selectedQueue || disabledStatus}
                  onSubmit={(msg) => {
                    setMenuAnchor(null);
                    onSendMessage(msg);
                  }}
                  queue={selectedQueue ?? { QueueName: "" }}
                />
              </MenuItem>
              <MenuItem
                disabled={!selectedQueue || disabledStatus}
                onClick={() => {
                  setMenuAnchor(null);
                  setConfirmPurge(true);
                }}
                sx={{ color: "error.main" }}
              >
                Purge Queue
              </MenuItem>
              <MenuItem
                disabled={!selectedQueue || disabledStatus}
                onClick={() => {
                  setMenuAnchor(null);
                  setConfirmDelete(true);
                }}
                sx={{ color: "error.main" }}
              >
                Delete Queue
              </MenuItem>
            </Menu>
          </Box>

          {/* Right slot: region badge, global pause, create queue */}
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Chip
              label={region.region}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }}
            />
            <Tooltip
              title={pollingPaused ? "Resume all polling" : "Pause all polling"}
            >
              <IconButton
                onClick={onToggleGlobalPause}
                aria-label={
                  pollingPaused ? "Resume all polling" : "Pause all polling"
                }
                sx={{
                  color: pollingPaused ? "rgba(255,255,255,0.5)" : "#fff",
                }}
              >
                {pollingPaused ? <PlayCircleOutline /> : <PauseCircleOutline />}
              </IconButton>
            </Tooltip>
            <CreateQueueDialog onSubmit={onCreateQueue} />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Purge Queue confirmation dialog */}
      <Dialog
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        maxWidth="xs"
      >
        <DialogTitle>Purge Queue</DialogTitle>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmPurge(false)}>
            Keep Messages
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmPurge(false);
              onPurgeQueue();
            }}
          >
            Purge Queue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Queue confirmation dialog */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Queue?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete{" "}
            <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
              {selectedQueue?.QueueName}
            </Box>
            . All messages will be lost and this cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDelete(false);
              onDeleteQueue();
            }}
          >
            Delete Queue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppShell;
