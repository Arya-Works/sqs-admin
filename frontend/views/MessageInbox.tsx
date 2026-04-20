import React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  Typography,
} from "@mui/material";
import { SqsMessage, Queue } from "../types";
import { formatRelativeTime } from "../utils/time";

interface MessageInboxProps {
  messages: SqsMessage[];
  selectedMessageId: string | null;
  consecutiveEmptyCount: React.MutableRefObject<number>;
  selectedQueue: Queue | null;
  onSelectMessage: (message: SqsMessage) => void;
}

/** Left panel: scrollable inbox-style message rows. Replaces MessageList grid layout. */
const MessageInbox = ({
  messages,
  selectedMessageId,
  consecutiveEmptyCount,
  selectedQueue,
  onSelectMessage,
}: MessageInboxProps) => {
  if (!selectedQueue) {
    return (
      <Box
        sx={{
          width: "38%",
          flexShrink: 0,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a queue to view messages
        </Typography>
      </Box>
    );
  }

  if (messages.length === 0 && consecutiveEmptyCount.current >= 3) {
    return (
      <Box
        sx={{
          width: "38%",
          flexShrink: 0,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No messages in this queue
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "38%",
        flexShrink: 0,
        overflowY: "auto",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <List disablePadding>
        {messages.map((message, index) => (
          <React.Fragment key={message.messageId ?? index}>
            {index > 0 && <Divider sx={{ mx: 2 }} />}
            <ListItemButton
              selected={message.messageId === selectedMessageId}
              onClick={() => onSelectMessage(message)}
              aria-label={`Message ${message.messageId ?? index}`}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                py: 1,
                px: 2,
                minHeight: 56,
                "&.Mui-selected": {
                  bgcolor: "rgba(103,80,164,0.08)",
                },
              }}
            >
              {/* Line 1: relative timestamp (left) + MessageId monospace (right) */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {message.messageAttributes?.SentTimestamp
                    ? formatRelativeTime(
                        new Date(
                          parseInt(message.messageAttributes.SentTimestamp),
                        ),
                      )
                    : ""}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "text.secondary",
                  }}
                >
                  {message.messageId}
                </Typography>
              </Box>
              {/* Line 2: body preview truncated to 60 chars */}
              <Typography variant="body1">
                {message.messageBody.slice(0, 60)}
                {message.messageBody.length > 60 ? "\u2026" : ""}
              </Typography>
            </ListItemButton>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default MessageInbox;
