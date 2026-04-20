import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import AppShell from "./AppShell";

// Minimal props to render AppShell in isolation
const baseProps = {
  queues: [
    { QueueName: "test-queue", QueueUrl: "http://localhost/test-queue" },
  ],
  region: { region: "us-east-1" },
  selectedQueue: {
    QueueName: "test-queue",
    QueueUrl: "http://localhost/test-queue",
  },
  pollingPaused: false,
  perQueuePaused: {},
  disabledStatus: false,
  onSelectQueue: jest.fn(),
  onToggleGlobalPause: jest.fn(),
  onToggleQueuePause: jest.fn(),
  onCreateQueue: jest.fn(),
  onDeleteQueue: jest.fn(),
  onSendMessage: jest.fn(),
  onPurgeQueue: jest.fn(),
  lastUpdatedAt: null,
  consecutiveEmptyCount: { current: 0 },
};

describe("<AppShell />", () => {
  it("renders without crashing and AppBar is present", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders queue Select dropdown", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders app title", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByText("SQS Admin")).toBeInTheDocument();
  });
});
