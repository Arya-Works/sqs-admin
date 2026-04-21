import React, { useState, useEffect, useRef } from "react";
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import CreateQueueDialog from "../components/CreateQueueDialog";
import { Queue, AwsRegion } from "../types";

const AWS_REGIONS = [
  "af-south-1",
  "ap-east-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-gov-east-1",
  "us-gov-west-1",
  "us-west-1",
  "us-west-2",
];

interface AppShellProps {
  region: AwsRegion;
  onCreateQueue: (queue: Queue) => void;
  onAddColumn: () => void;
  canAddColumn: boolean;
  onRegionChange: (region: string) => void;
}

/** Top AppBar: title, region chip, add-column, create queue. */
const AppShell = ({
  region,
  onCreateQueue,
  onAddColumn,
  canAddColumn,
  onRegionChange,
}: AppShellProps) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(region.region ?? "");
  const [popupOpen, setPopupOpen] = useState(false);
  // Prevents onBlur from double-committing when onChange already fired (option click)
  const justCommittedRef = useRef(false);

  useEffect(() => {
    setInputValue(region.region ?? "");
  }, [region.region]);

  const commit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== region.region) {
      onRegionChange(trimmed);
    }
    justCommittedRef.current = true;
    setEditing(false);
  };

  const handleBlur = () => {
    if (justCommittedRef.current) {
      justCommittedRef.current = false;
      return;
    }
    commit(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setInputValue(region.region ?? "");
      setEditing(false);
    }
    // Only handle Enter when the popup is closed (otherwise Autocomplete handles it)
    if (e.key === "Enter" && !popupOpen) {
      commit(inputValue);
    }
  };

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
          {editing ? (
            <Autocomplete
              freeSolo
              autoHighlight
              disableClearable
              options={AWS_REGIONS}
              value={inputValue}
              inputValue={inputValue}
              onInputChange={(_, val) => setInputValue(val)}
              onOpen={() => setPopupOpen(true)}
              onClose={() => setPopupOpen(false)}
              onChange={(_, val) => {
                if (typeof val === "string") commit(val);
              }}
              size="small"
              sx={{ width: 180 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  variant="outlined"
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  sx={{
                    "& .MuiInputBase-root": {
                      fontFamily: "monospace",
                      fontSize: "11px",
                      bgcolor: "background.paper",
                    },
                    "& .MuiInputBase-input": {
                      py: "4px !important",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.5)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.8)",
                    },
                  }}
                />
              )}
            />
          ) : (
            <Tooltip title="Click to change region">
              <Chip
                label={region.region || "set region"}
                size="small"
                variant="outlined"
                onClick={() => setEditing(true)}
                sx={{ fontFamily: "monospace", fontSize: "11px", cursor: "pointer" }}
              />
            </Tooltip>
          )}
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
          <CreateQueueDialog onSubmit={onCreateQueue} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppShell;
