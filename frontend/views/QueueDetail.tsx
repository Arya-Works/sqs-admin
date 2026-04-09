import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import { Alert as MuiAlert, AlertTitle } from "@mui/material";
import Alert from "../components/Alert";
import QueueHeader from "./QueueHeader";
import MessageList from "./MessageList";
import { Queue, AwsRegion, SqsMessage } from "../types";

interface QueueDetailProps {
  queues: Queue[];
  region: AwsRegion;
  selectedQueue: Queue | null;
  messages: SqsMessage[];
  consecutiveEmptyCount: React.MutableRefObject<number>;
  lastUpdatedAt: Date | null;
  error: string;
  onClearError: () => void;
}

/** Right-side panel: messages header, error/info alerts, and the message list. */
const QueueDetail = ({
  queues,
  region,
  selectedQueue,
  messages,
  consecutiveEmptyCount,
  lastUpdatedAt,
  error,
  onClearError,
}: QueueDetailProps) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <QueueHeader lastUpdatedAt={lastUpdatedAt} consecutiveEmptyCount={consecutiveEmptyCount} />
      <Grid size={{ xs: 12 }}>
        {error !== "" ? (
          <Container maxWidth="md">
            <Alert
              message={error}
              severity={"error"}
              onClose={onClearError}
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
        <MessageList
          messages={messages}
          consecutiveEmptyCount={consecutiveEmptyCount}
          selectedQueue={selectedQueue}
        />
      </Grid>
    </Box>
  );
};

export default QueueDetail;
