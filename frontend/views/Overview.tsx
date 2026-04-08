import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert as MuiAlert,
  AlertTitle,
  Button,
  Container,
  Divider,
  Drawer,
  GlobalStyles,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { AwsRegion, Queue, SqsMessage } from "../types";
import CreateQueueDialog from "../components/CreateQueueDialog";
import Alert from "../components/Alert";
import useInterval from "../hooks/useInterval";
import SendMessageDialog from "../components/SendMessageDialog";
import { callApi } from "../api/Http";
import MessageItem from "../components/MessageItem";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutline";
import Box from "@mui/material/Box";

const a11yProps = (id: string, index: number) => {
  return {
    "aria-controls": `queue-${id}-${index}`,
  };
};

const formatRelativeTime = (date: Date): string => {
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 60) return `Last updated ${elapsed}s ago`;
  if (elapsed < 3600) return `Last updated ${Math.floor(elapsed / 60)}m ago`;
  return `Last updated ${Math.floor(elapsed / 3600)}h ago`;
};

const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queues, setQueues] = useState([] as Queue[]);
  const [messages, setMessages] = useState([] as SqsMessage[]);
  const [reload, triggerReload] = useState(true);
  const [error, setError] = useState("");
  const [disabledStatus, setDisabledStatus] = useState(true);
  const [region, setRegion] = useState({ region: "" } as AwsRegion);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const consecutiveEmptyCount = useRef(0);
  const [, forceUpdate] = useState(0);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [perQueuePaused, setPerQueuePaused] = useState<Record<string, boolean>>({});

  const selectedQueueName = searchParams.get("queue");
  const selectedQueue = queues.find(q => q.QueueName === selectedQueueName) ?? queues[0] ?? null;

  useInterval(async () => {
    if (!pollingPaused && !perQueuePaused[selectedQueue?.QueueName ?? ""]) {
      await receiveMessageFromCurrentQueue();
    }
  }, 3000);

  useEffect(() => {
    if (selectedQueue) {
      receiveMessageFromCurrentQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueue?.QueueName]);

  useEffect(() => {
    receiveRegion();
  }, []);

  useEffect(() => {
    callApi({
      method: "GET",
      onSuccess: (data: Queue[]) => {
        setQueues(data);
        if (data.length > 0) {
          setDisabledStatus(false);
          // If URL has no queue param or the named queue doesn't exist, fall back to first queue
          const urlQueue = searchParams.get("queue");
          if (!urlQueue || !data.find(q => q.QueueName === urlQueue)) {
            setSearchParams({ queue: data[0].QueueName }, { replace: true });
          }
        } else {
          setDisabledStatus(true);
        }
      },
      onError: setError,
    });
  }, [reload]);

  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const id = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  const selectQueue = (queueName: string) => {
    setMessages([]);
    consecutiveEmptyCount.current = 0;
    setLastUpdatedAt(null);
    setSearchParams({ queue: queueName });
  };

  const receiveMessageFromCurrentQueue = async () => {
    if (selectedQueue?.QueueUrl) {
      await callApi({
        method: "POST",
        action: "GetMessages",
        queue: selectedQueue,
        onSuccess: (data: SqsMessage[]) => {
          if (data.length > 0) {
            consecutiveEmptyCount.current = 0;
            setMessages(data);
            setLastUpdatedAt(new Date());
          } else {
            consecutiveEmptyCount.current += 1;
            if (consecutiveEmptyCount.current >= 3) {
              setMessages([]);
            }
            // else: hold existing messages — do NOT call setMessages
          }
        },
        onError: setError,
      });
    }
  };

  const receiveRegion = async () => {
    await callApi({
      method: "POST",
      action: "GetRegion",
      onSuccess: setRegion,
      queue: { QueueName: "" } as Queue,
      onError: setError,
    });
  };

  const createNewQueue = async (queue: Queue) => {
    await callApi({
      method: "POST",
      action: "CreateQueue",
      queue: queue,
      onSuccess: () => {
        setTimeout(() => {
          triggerReload(!reload);
        }, 1000);
      },
      onError: setError,
    });
  };

  const purgeCurrentQueue = async () => {
    await callApi({
      method: "POST",
      action: "PurgeQueue",
      queue: selectedQueue!,
      onSuccess: () => {
        setMessages([]);
        consecutiveEmptyCount.current = 0;
        setLastUpdatedAt(null);
      },
      onError: setError,
    });
  };

  const deleteCurrentQueue = async () => {
    await callApi({
      method: "POST",
      action: "DeleteQueue",
      queue: selectedQueue!,
      onSuccess: () => {
        setMessages([]);
        consecutiveEmptyCount.current = 0;
        setLastUpdatedAt(null);
        setTimeout(() => {
          triggerReload(!reload);
        }, 1000);
      },
      onError: setError,
    });
  };

  const sendMessageToCurrentQueue = async (message: SqsMessage) => {
    let queueUrl = selectedQueue?.QueueUrl || null;
    if (queueUrl !== null) {
      if (
        selectedQueue?.QueueName.endsWith(".fifo") &&
        !message.messageAttributes?.MessageGroupId
      ) {
        setError(
          "You need to set a MessageGroupID when sending Messages to a FIFO queue",
        );
        return;
      }
      await callApi({
        method: "POST",
        action: "SendMessage",
        queue: selectedQueue!,
        message: message,
        onSuccess: () => {},
        onError: setError,
      });
    } else {
      setError("Could not send message to non-existent queue");
    }
  };

  return (
    <>
      <GlobalStyles styles={{
        "@keyframes pulse": {
          "0%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.5, transform: "scale(1.3)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        }
      }} />
      <Box sx={{ display: "flex" }}>
      <Box>
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
                  onClick={() => setPollingPaused(p => !p)}
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
                <CreateQueueDialog onSubmit={createNewQueue} />
                <Button
                  variant="contained"
                  disabled={disabledStatus}
                  onClick={deleteCurrentQueue}
                >
                  Delete Queue
                </Button>
                <SendMessageDialog
                  disabled={disabledStatus}
                  onSubmit={sendMessageToCurrentQueue}
                  queue={selectedQueue!}
                />
                <Button
                  variant="contained"
                  disabled={disabledStatus}
                  onClick={purgeCurrentQueue}
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
                  onClick={() => selectQueue(queue.QueueName)}
                  disablePadding
                >
                  <ListItemButton selected={selectedQueue?.QueueName === queue.QueueName}>
                    <ListItemIcon>
                      <Box
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setPerQueuePaused(prev => ({
                            ...prev,
                            [queue.QueueName]: !prev[queue.QueueName]
                          }));
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
      <Box sx={{ flexGrow: 1 }}>
        <Grid size={{ xs: 12 }}>
          <Toolbar>
            <Typography variant="h6">Messages</Typography>
            {lastUpdatedAt && consecutiveEmptyCount.current > 0 && consecutiveEmptyCount.current < 3 && (
              <Typography variant="body2" sx={{ ml: "auto", color: "text.secondary" }} aria-live="polite">
                {formatRelativeTime(lastUpdatedAt)}
              </Typography>
            )}
          </Toolbar>
        </Grid>
        <Grid size={{ xs: 12 }}>
          {error !== "" ? (
            <Container maxWidth="md">
              <Alert
                message={error}
                severity={"error"}
                onClose={() => setError("")}
              />
            </Container>
          ) : null}
          {queues?.length === 0 ? (
            <Container maxWidth="md">
              <MuiAlert severity="info">
                <AlertTitle>No Queue</AlertTitle>
                {`No Queues exist in region: ${region.region ? region.region : "eu-central-1"}`}
              </MuiAlert>
            </Container>
          ) : null}
        </Grid>
        <Grid size={{ xs: 12 }}>
          {selectedQueue && (
            <Box sx={{ p: 3 }}>
              <Typography component={"span"}>
                {messages.length === 0 && consecutiveEmptyCount.current >= 3 ? (
                  <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", mt: 4, py: 2 }}>
                    No messages in this queue
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {messages?.map((message, index) => (
                      <Grid key={message.messageId ?? index} size={{ xs: 12 }} {...a11yProps("gridItem", index)}>
                        <Paper>
                          <MessageItem
                            key={message.messageId ?? index}
                            data={message}
                            {...a11yProps("messageItem", index)}
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Typography>
            </Box>
          )}
        </Grid>
      </Box>
    </Box>
    </>
  );
};

export default Overview;
