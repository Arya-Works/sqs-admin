import React from "react";
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import PauseCircleOutline from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutline from "@mui/icons-material/PlayCircleOutline";
import AddIcon from "@mui/icons-material/Add";
import CreateQueueDialog from "../components/CreateQueueDialog";
import { Queue, AwsRegion } from "../types";

interface AppShellProps {
  region: AwsRegion;
  globalPaused: boolean;
  onToggleGlobalPause: () => void;
  onCreateQueue: (queue: Queue) => void;
  onAddColumn: () => void;
  canAddColumn: boolean;
}

/** Top AppBar: title, region chip, add-column, global pause, create queue. */
const AppShell = ({
  region,
  globalPaused,
  onToggleGlobalPause,
  onCreateQueue,
  onAddColumn,
  canAddColumn,
}: AppShellProps) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, letterSpacing: "-0.03em", flexGrow: 1 }}
        >
          SQS Admin
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={region.region}
            size="small"
            variant="outlined"
            sx={{ fontFamily: "monospace", fontSize: "11px" }}
          />
          <Tooltip title={canAddColumn ? "Add column" : "Maximum columns for this screen size"}>
            <span>
              <IconButton
                onClick={onAddColumn}
                disabled={!canAddColumn}
                aria-label="Add column"
                sx={{ color: canAddColumn ? "inherit" : "action.disabled" }}
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={globalPaused ? "Resume all polling" : "Pause all polling"}>
            <IconButton
              onClick={onToggleGlobalPause}
              aria-label={globalPaused ? "Resume all polling" : "Pause all polling"}
              sx={{ color: globalPaused ? "action.disabled" : "inherit" }}
            >
              {globalPaused ? <PlayCircleOutline /> : <PauseCircleOutline />}
            </IconButton>
          </Tooltip>
          <CreateQueueDialog onSubmit={onCreateQueue} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppShell;
