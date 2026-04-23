import React from "react";
import { Box } from "@mui/material";
import { ACCENT } from "../theme";

const LoadingDots = () => (
  <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: ACCENT,
          "@keyframes loadingPulse": {
            "0%, 100%": { transform: "scale(0.5)", opacity: 0.25 },
            "50%": { transform: "scale(1)", opacity: 1 },
          },
          animation: "loadingPulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.18}s`,
        }}
      />
    ))}
  </Box>
);

export default LoadingDots;
