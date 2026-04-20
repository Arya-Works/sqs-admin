import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { JSONTree } from "react-json-tree";
import { SqsMessage } from "../types";
import { toLocaleString, getJsonOrRawData } from "../utils/time";

// Light base16 theme that works on a white/grey MUI background
const LIGHT_THEME = {
  scheme: "light",
  base00: "#fafafa", // background — matches MUI default
  base01: "#f0f0f0",
  base02: "#e0e0e0",
  base03: "#9e9e9e",
  base04: "#757575",
  base05: "#212121", // default text
  base06: "#212121",
  base07: "#000000",
  base08: "#c62828", // null / error — red
  base09: "#e65100", // numbers — orange
  base0A: "#f57f17", // integers — amber
  base0B: "#2e7d32", // strings — green
  base0C: "#00838f", // regex — cyan
  base0D: "#1565c0", // object keys — blue
  base0E: "#6a1b9a", // booleans — purple
  base0F: "#4e342e", // undefined — brown
};

interface MessageDetailProps {
  message: SqsMessage | null;
  onDelete?: (message: SqsMessage) => void;
}

/** Right panel: full message body, attributes, and metadata. Empty state when no message selected. */
const MessageDetail = ({ message, onDelete }: MessageDetailProps) => {
  const [attrExpanded, setAttrExpanded] = useState(false);
  const [bodyView, setBodyView] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message.messageBody).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!message) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a message to inspect it
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", height: "100%" }}>
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.paper",
          zIndex: 1,
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontFamily: "monospace", fontSize: "12px", color: "text.secondary" }}>
          {message.messageId}
        </Typography>
        {message.messageAttributes?.SentTimestamp && (
          <Typography variant="caption" color="text.secondary">
            Sent: {toLocaleString(message.messageAttributes.SentTimestamp)}
          </Typography>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, pt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Body
          </Typography>
          <ButtonGroup size="small" variant="outlined" sx={{ ml: "auto" }}>
            <Button
              onClick={() => setBodyView("tree")}
              variant={bodyView === "tree" ? "contained" : "outlined"}
              sx={{ fontSize: "11px", py: 0.25, textTransform: "none" }}
            >
              Tree
            </Button>
            <Button
              onClick={() => setBodyView("raw")}
              variant={bodyView === "raw" ? "contained" : "outlined"}
              sx={{ fontSize: "11px", py: 0.25, textTransform: "none" }}
            >
              Raw
            </Button>
          </ButtonGroup>
          <Tooltip title={copied ? "Copied!" : "Copy raw body"}>
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete message">
            <IconButton size="small" onClick={() => setConfirmDelete(true)} aria-label="Delete message">
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {bodyView === "tree" ? (
          <Box
            sx={{
              bgcolor: "#fafafa",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 1,
              py: 0.5,
              overflowX: "auto",
            }}
          >
            <JSONTree
              data={getJsonOrRawData(message.messageBody)}
              theme={LIGHT_THEME}
              invertTheme={false}
              keyPath={["message"]}
              hideRoot
            />
          </Box>
        ) : (
          <Box
            component="pre"
            sx={{
              bgcolor: "#fafafa",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 2,
              py: 1.5,
              fontFamily: "monospace",
              fontSize: "13px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              m: 0,
              color: "text.primary",
            }}
          >
            {message.messageBody}
          </Box>
        )}
      </Box>

      {/* Attributes */}
      {message.customAttributes && Object.keys(message.customAttributes).length > 0 && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Accordion
            expanded={attrExpanded}
            onChange={() => setAttrExpanded((prev) => !prev)}
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px !important" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Message Attributes
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: "#fafafa", pt: 0 }}>
              <JSONTree
                data={message.customAttributes}
                theme={LIGHT_THEME}
                invertTheme={false}
                keyPath={["attributes"]}
                hideRoot
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Metadata */}
      <Box sx={{ px: 3, pt: 2, pb: 3 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Metadata
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {[
            ["Receive Count", message.messageAttributes?.ApproximateReceiveCount],
            ["Sender ID", message.messageAttributes?.SenderId],
            ["Message Group", message.messageAttributes?.MessageGroupId],
            ["Deduplication ID", message.messageAttributes?.MessageDeduplicationId],
            [
              "First Received",
              message.messageAttributes?.ApproximateFirstReceiveTimestamp
                ? toLocaleString(message.messageAttributes.ApproximateFirstReceiveTimestamp)
                : undefined,
            ],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <Box key={label as string} sx={{ display: "flex", gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                  {value as string}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle>Delete message?</DialogTitle>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDelete(false);
              onDelete?.(message);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MessageDetail;
