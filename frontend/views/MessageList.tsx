import React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MessageItem from "../components/MessageItem";
import { SqsMessage, Queue } from "../types";

interface MessageListProps {
  messages: SqsMessage[];
  consecutiveEmptyCount: React.MutableRefObject<number>;
  selectedQueue: Queue | null;
}

const a11yProps = (id: string, index: number) => ({
  "aria-controls": `queue-${id}-${index}`,
});

/** Renders the message grid or empty state for the currently selected queue. */
const MessageList = ({ messages, consecutiveEmptyCount, selectedQueue }: MessageListProps) => {
  if (!selectedQueue) return null;

  return (
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
  );
};

export default MessageList;
