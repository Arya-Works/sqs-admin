import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

interface QueueHeaderProps {
  lastUpdatedAt: Date | null;
  consecutiveEmptyCount: React.MutableRefObject<number>;
}

/** Formats a Date as a human-readable relative time string. */
const formatRelativeTime = (date: Date): string => {
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 60) return `Last updated ${elapsed}s ago`;
  if (elapsed < 3600) return `Last updated ${Math.floor(elapsed / 60)}m ago`;
  return `Last updated ${Math.floor(elapsed / 3600)}h ago`;
};

/** Messages toolbar showing header and relative time since last poll. Owns the
 *  1-second forceUpdate ticker — QueueHeader is the sole consumer of formatRelativeTime. */
const QueueHeader = ({ lastUpdatedAt, consecutiveEmptyCount }: QueueHeaderProps) => {
  const [, forceUpdate] = useState(0);

  // Re-render every second so formatRelativeTime stays current.
  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const id = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
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
  );
};

export default QueueHeader;
