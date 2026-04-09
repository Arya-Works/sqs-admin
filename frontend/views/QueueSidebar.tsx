import React from "react";
import {
  Box,
  Button,
  Divider,
  Drawer,
  GlobalStyles,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutline";
import CreateQueueDialog from "../components/CreateQueueDialog";
import SendMessageDialog from "../components/SendMessageDialog";
import { Queue, AwsRegion, SqsMessage } from "../types";

interface QueueSidebarProps {
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
}

const a11yProps = (id: string, index: number) => ({
  "aria-controls": `queue-${id}-${index}`,
});

/** Left navigation drawer: queue list, action buttons, and per-queue polling dots. */
const QueueSidebar = ({
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
}: QueueSidebarProps) => {
  return (
    <Box>
      <GlobalStyles styles={{
        "@keyframes pulse": {
          "0%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.5, transform: "scale(1.3)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      }} />
      <Drawer
        sx={{
          width: 402,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 402,
            boxSizing: "border-box",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <List>
          <ListItem>
            <Typography variant="h6" margin={"auto"}>
              SQS Admin UI
            </Typography>
            <Typography variant="subtitle2" margin={"auto"}>
              {import.meta.env.REACT_APP_VERSION}
            </Typography>
            <Typography variant="subtitle2" margin={"auto"}>
              {region.region}
            </Typography>
            <Tooltip title={pollingPaused ? "Resume all polling" : "Pause all polling"}>
              <IconButton
                size="medium"
                color={pollingPaused ? "inherit" : "primary"}
                onClick={onToggleGlobalPause}
                aria-label={pollingPaused ? "Resume all polling" : "Pause all polling"}
                sx={{ ml: "auto" }}
              >
                {pollingPaused ? <PlayCircleOutline /> : <PauseCircleOutline />}
              </IconButton>
            </Tooltip>
          </ListItem>
          <ListItem>
            <Toolbar
              sx={{
                gap: 1,
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
              }}
            >
              <CreateQueueDialog onSubmit={onCreateQueue} />
              <Button
                variant="contained"
                disabled={disabledStatus}
                onClick={onDeleteQueue}
              >
                Delete Queue
              </Button>
              <SendMessageDialog
                disabled={disabledStatus}
                onSubmit={onSendMessage}
                queue={selectedQueue!}
              />
              <Button
                variant="contained"
                disabled={disabledStatus}
                onClick={onPurgeQueue}
              >
                Purge Queue
              </Button>
            </Toolbar>
          </ListItem>
        </List>
        <Divider />
        <Divider />
        <List>
          {queues?.map((queue, index) => {
            const isQueuePollingActive = !pollingPaused && !perQueuePaused[queue.QueueName];
            return (
              <ListItem
                key={queue.QueueName}
                {...a11yProps("item", index)}
                onClick={() => onSelectQueue(queue.QueueName)}
                disablePadding
              >
                <ListItemButton selected={selectedQueue?.QueueName === queue.QueueName}>
                  <ListItemIcon>
                    <Box
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onToggleQueuePause(queue.QueueName);
                      }}
                      aria-label={isQueuePollingActive ? `Pause polling for ${queue.QueueName}` : `Resume polling for ${queue.QueueName}`}
                      role="button"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: isQueuePollingActive ? "success.main" : "action.disabled",
                        cursor: "pointer",
                        p: 0.5,
                        animation: isQueuePollingActive ? "pulse 1.5s ease-in-out infinite" : "none",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={queue.QueueName}
                    primaryTypographyProps={{
                      style: {
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </Box>
  );
};

export default QueueSidebar;
