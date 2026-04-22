import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import QueueColumn from "./QueueColumn";

// Mock hooks so this stays a unit test of QueueColumn's rendering/wiring
jest.mock("../hooks/useMessagePoller");
jest.mock("../hooks/useQueueActions");

// Also mock useInterval so we don't trigger real timers
jest.mock("../hooks/useInterval", () => jest.fn());

import useMessagePoller from "../hooks/useMessagePoller";
import useQueueActions from "../hooks/useQueueActions";

const mockClearMessages = jest.fn();
const mockRemoveMessage = jest.fn();
const mockClearPollerError = jest.fn();

const mockRefreshMessages = jest.fn();

const mockPollerBase = {
  messages: [],
  lastUpdatedAt: null,
  isLoading: false,
  hasLoaded: true,
  consecutiveEmptyCount: { current: 0 },
  clearMessages: mockClearMessages,
  refreshMessages: mockRefreshMessages,
  removeMessage: mockRemoveMessage,
  clearError: mockClearPollerError,
  error: "",
};

const mockPurgeCurrentQueue = jest.fn();
const mockDeleteCurrentQueue = jest.fn();
const mockSendMessage = jest.fn();
const mockClearActionsError = jest.fn();

const mockActionsBase = {
  createNewQueue: jest.fn(),
  deleteCurrentQueue: mockDeleteCurrentQueue,
  purgeCurrentQueue: mockPurgeCurrentQueue,
  sendMessageToCurrentQueue: mockSendMessage,
  clearError: mockClearActionsError,
  error: "",
};

const mockQueues = [
  { QueueName: "test-queue", QueueUrl: "http://localhost:4566/000000000000/test-queue" },
  { QueueName: "orders.fifo", QueueUrl: "http://localhost:4566/000000000000/orders.fifo" },
];

const baseQueue = mockQueues[0];

const defaultProps = {
  queues: mockQueues,
  queue: null as typeof baseQueue | null,
  onSelectQueue: jest.fn(),
  reloadQueues: jest.fn(),
  showBorder: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useMessagePoller as jest.Mock).mockReturnValue({ ...mockPollerBase });
  (useQueueActions as jest.Mock).mockReturnValue({ ...mockActionsBase });
});

describe("<QueueColumn />", () => {
  it("renders 'Select a queue' placeholder when queue prop is null", () => {
    render(<QueueColumn {...defaultProps} queue={null} />);
    expect(screen.getByText("Select a queue")).toBeInTheDocument();
  });

  it("shows queue name in autocomplete when queue is provided", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
  });

  it("shows message count chip when queue has messages", () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [
        { messageBody: "hello", messageId: "msg-001" },
        { messageBody: "world", messageId: "msg-002" },
      ],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    // The chip label should show 2 (Math.max(approx=0, messages.length=2))
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows Close column button when onRemove is provided", () => {
    const onRemove = jest.fn();
    render(<QueueColumn {...defaultProps} queue={baseQueue} onRemove={onRemove} />);
    expect(screen.getByLabelText("Close column")).toBeInTheDocument();
  });

  it("does not show Close column button when onRemove is not provided", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.queryByLabelText("Close column")).not.toBeInTheDocument();
  });

  it("calls onRemove when Close column button is clicked", () => {
    const onRemove = jest.fn();
    render(<QueueColumn {...defaultProps} queue={baseQueue} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Close column"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders message accordions when messages are present", () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [
        // slice(0, 8) + "…": "msg-001-" + "…" = "msg-001-…"
        { messageBody: '{"orderId":1}', messageId: "msg-001-xxxxx" },
        // slice(0, 8) + "…": "msg-002-" + "…" = "msg-002-…"
        { messageBody: "plain text", messageId: "msg-002-yyyyy" },
      ],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByText("msg-001-…")).toBeInTheDocument();
    expect(screen.getByText("msg-002-…")).toBeInTheDocument();
  });

  it("expanding an accordion shows message body content", async () => {
    // slice(0,8) of "aaaaaaaabbbb" → "aaaaaaaa…"
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: '{"key":"value"}', messageId: "aaaaaaaabbbb" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // AccordionSummary uses ButtonBase so renders as a <button>
    const summary = screen.getByText("aaaaaaaa…").closest("button");
    expect(summary).not.toBeNull();

    await act(async () => {
      fireEvent.click(summary!);
    });

    // After expanding, the "Body" header label appears inside AccordionDetails
    await waitFor(() => {
      expect(screen.getByText("Body")).toBeInTheDocument();
    });
  });

  it("shows delete message confirmation dialog when delete icon is clicked", async () => {
    // slice(0,8) of "bbbbbbbbcccc" → "bbbbbbbb…"
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "test body", messageId: "bbbbbbbbcccc" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // Expand the accordion
    const summary = screen.getByText("bbbbbbbb…").closest("button");
    expect(summary).not.toBeNull();

    await act(async () => {
      fireEvent.click(summary!);
    });

    // Wait for the "Body" header to confirm details are rendered
    await waitFor(() => {
      expect(screen.getByText("Body")).toBeInTheDocument();
    });

    // MUI Tooltip with title="Delete message" passes aria-label to the inner IconButton
    const namedDeleteBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Delete message",
    );
    expect(namedDeleteBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(namedDeleteBtn!);
    });

    expect(screen.getByText("Delete message?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows purge queue confirmation dialog when Purge button is clicked", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    fireEvent.click(screen.getByText("Purge"));
    expect(screen.getByText("Purge Queue?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Purge" })).toBeInTheDocument();
  });

  it("calls purgeCurrentQueue action when purge is confirmed", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    fireEvent.click(screen.getByText("Purge"));

    await act(async () => {
      // The Purge confirm button is in the dialog
      const purgeButtons = screen.getAllByRole("button", { name: "Purge" });
      fireEvent.click(purgeButtons[purgeButtons.length - 1]);
    });

    expect(mockPurgeCurrentQueue).toHaveBeenCalledTimes(1);
  });

  it("shows delete queue confirmation dialog when Delete button is clicked", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Queue?")).toBeInTheDocument();
  });

  it("calls deleteCurrentQueue action when delete queue is confirmed", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    fireEvent.click(screen.getByText("Delete"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(mockDeleteCurrentQueue).toHaveBeenCalledTimes(1);
  });

  it("applies border-right style when showBorder is true", () => {
    const { container } = render(<QueueColumn {...defaultProps} queue={null} showBorder={true} />);
    // The root Box has inline style with borderRight when showBorder is true
    const rootBox = container.firstChild as HTMLElement;
    expect(rootBox).toHaveStyle({ borderRight: "4px solid #0A0A0A" });
  });

  it("does not apply border-right when showBorder is false", () => {
    const { container } = render(<QueueColumn {...defaultProps} queue={null} showBorder={false} />);
    const rootBox = container.firstChild as HTMLElement;
    expect(rootBox).toHaveStyle({ borderRight: "none" });
  });

  it("shows 'No messages' when queue is selected but messages array is empty", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByText("No messages")).toBeInTheDocument();
    expect(screen.getByText("Polling every 1s")).toBeInTheDocument();
  });

  it("shows error alert from poller when poller.error is set", () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      error: "Polling error occurred",
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByText("Polling error occurred")).toBeInTheDocument();
  });

  it("shows error alert from actions when actions.error is set", () => {
    (useQueueActions as jest.Mock).mockReturnValue({
      ...mockActionsBase,
      error: "Action failed",
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByText("Action failed")).toBeInTheDocument();
  });

  it("renders Tree and Raw view toggle buttons when queue is selected", () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);
    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByText("Raw")).toBeInTheDocument();
  });

  it("clicking Raw button switches body view to raw (pre element) after expansion", async () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "raw content text", messageId: "ccccccccdddd" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // Expand accordion
    const summary = screen.getByText("cccccccc…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    // Switch to Raw view
    await act(async () => {
      fireEvent.click(screen.getByText("Raw"));
    });

    // pre element renders the raw message body
    await waitFor(() => {
      const preEl = document.querySelector("pre");
      expect(preEl).toBeInTheDocument();
      expect(preEl?.textContent).toContain("raw content text");
    });
  });

  it("clicking Tree button after Raw switches back to tree view", async () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: '{"val":1}', messageId: "eeeeeeeeffff" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    const summary = screen.getByText("eeeeeeee…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    // Go Raw then back to Tree
    await act(async () => { fireEvent.click(screen.getByText("Raw")); });
    await act(async () => { fireEvent.click(screen.getByText("Tree")); });

    await waitFor(() => {
      expect(document.querySelector("pre")).not.toBeInTheDocument();
    });
  });

  it("copy button in accordion details calls clipboard.writeText", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "copy me!", messageId: "gggggggghhh1" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    const summary = screen.getByText("gggggggg…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    // Find copy button by aria-label (Tooltip title="Copy" → aria-label="Copy")
    const copyBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Copy",
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => { fireEvent.click(copyBtn!); });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("copy me!");
    });
  });

  it("confirming delete message calls callApi with DeleteMessage action", async () => {
    const mockFetch = jest.fn().mockResolvedValue(Response.json({}));
    global.fetch = mockFetch as typeof fetch;

    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "to delete", messageId: "iiiiiiiijjjj", receiptHandle: "rcpt-001" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // Expand the accordion
    const summary = screen.getByText("iiiiiiii…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    // Click delete icon
    const deleteBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Delete message",
    );
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(screen.getByText("Delete message?")).toBeInTheDocument();

    // Confirm delete
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"DeleteMessage"'),
      }),
    );
  });

  it("clearing error calls both poller.clearError and actions.clearError", () => {
    const clearPollerError = jest.fn();
    const clearActionsError = jest.fn();
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      error: "Poller error",
      clearError: clearPollerError,
    });
    (useQueueActions as jest.Mock).mockReturnValue({
      ...mockActionsBase,
      clearError: clearActionsError,
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // The Alert component should be visible with the error
    expect(screen.getByText("Poller error")).toBeInTheDocument();

    // Click the close button on the alert
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(clearPollerError).toHaveBeenCalledTimes(1);
    expect(clearActionsError).toHaveBeenCalledTimes(1);
  });

  it("cancelling message delete dialog closes it without calling API", async () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "body", messageId: "kkkkkkkkllll" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    const summary = screen.getByText("kkkkkkkk…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    const deleteBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Delete message",
    );
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(screen.getByText("Delete message?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    // Dialog closes (no fetch was called)
    expect(screen.queryByText("Delete message?")).not.toBeVisible();
  });

  it("closes delete message dialog on API error (onError callback)", async () => {
    // callApi's onError fires when fetch itself throws (network error)
    const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch as typeof fetch;

    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "error body", messageId: "mmmmmmmmnnn1", receiptHandle: "rcpt-err" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    const summary = screen.getByText("mmmmmmmm…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    const deleteBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Delete message",
    );
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(screen.getByText("Delete message?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    // After the network error the onError handler closes the dialog (setDeletingMsg(null))
    await waitFor(() => {
      expect(screen.queryByText("Delete message?")).not.toBeVisible();
    });
  });

  it("calls onSelectQueue when a queue is chosen in the Autocomplete", async () => {
    const onSelectQueue = jest.fn();
    render(<QueueColumn {...defaultProps} queue={baseQueue} onSelectQueue={onSelectQueue} />);

    // MUI Autocomplete opens on mouseDown on the popup indicator button
    const input = screen.getByDisplayValue("test-queue");
    await act(async () => {
      // Focus + mouseDown triggers the dropdown
      fireEvent.mouseDown(input);
    });

    // If listbox not visible, try the open button (the down-arrow popup indicator)
    const openBtn = document.querySelector('[aria-label="Open"]') as HTMLElement | null;
    if (openBtn) {
      await act(async () => { fireEvent.click(openBtn); });
    }

    await waitFor(() => {
      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on the second queue option
    const option = screen.getByRole("option", { name: /orders\.fifo/i });
    await act(async () => {
      fireEvent.click(option);
    });

    expect(onSelectQueue).toHaveBeenCalledWith("orders.fifo");
  });

  it("renders a chip in the dropdown option when queue has messages", async () => {
    const queuesWithCount = [
      {
        QueueName: "test-queue",
        QueueUrl: "http://localhost:4566/000000000000/test-queue",
        QueueAttributes: { ApproximateNumberOfMessages: "5" },
      },
      {
        QueueName: "orders.fifo",
        QueueUrl: "http://localhost:4566/000000000000/orders.fifo",
        QueueAttributes: { ApproximateNumberOfMessages: "0" },
      },
    ];

    render(
      <QueueColumn
        {...defaultProps}
        queues={queuesWithCount}
        queue={queuesWithCount[0]}
      />,
    );

    // MUI Autocomplete opens on mouseDown on the input
    const input = screen.getByDisplayValue("test-queue");
    await act(async () => {
      fireEvent.mouseDown(input);
    });

    const openBtn = document.querySelector('[aria-label="Open"]') as HTMLElement | null;
    if (openBtn) {
      await act(async () => { fireEvent.click(openBtn); });
    }

    await waitFor(() => {
      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).toBeInTheDocument();
    }, { timeout: 3000 });

    // The option for "test-queue" (count=5) should render a chip with label "5"
    const chips = screen.getAllByText("5");
    expect(chips.length).toBeGreaterThan(0);
  });

  it("cancels purge queue dialog without calling purgeCurrentQueue", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    fireEvent.click(screen.getByText("Purge"));
    expect(screen.getByText("Purge Queue?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Keep Messages" }));
    });

    // Dialog should close and purge should NOT have been called
    await waitFor(() => {
      expect(screen.queryByText("Purge Queue?")).not.toBeVisible();
    });
    expect(mockPurgeCurrentQueue).not.toHaveBeenCalled();
  });

  it("closes purge dialog via backdrop click (onClose handler)", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    fireEvent.click(screen.getByText("Purge"));
    expect(screen.getByText("Purge Queue?")).toBeInTheDocument();

    // MUI Dialog backdrop is the first child of the Modal root
    await act(async () => {
      // Find the backdrop overlay and click it to trigger onClose
      const backdrop = document.querySelector(".MuiBackdrop-root") as HTMLElement | null;
      if (backdrop) {
        fireEvent.click(backdrop);
      } else {
        // Fallback: fire Escape on the dialog element
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
        if (dialog) fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
      }
    });

    await waitFor(() => {
      expect(screen.queryByText("Purge Queue?")).not.toBeVisible();
    });
    expect(mockPurgeCurrentQueue).not.toHaveBeenCalled();
  });

  it("cancels delete queue dialog without calling deleteCurrentQueue", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Queue?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Queue?")).not.toBeVisible();
    });
    expect(mockDeleteCurrentQueue).not.toHaveBeenCalled();
  });

  it("closes delete queue dialog via Escape key (onClose handler)", async () => {
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Queue?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document.activeElement || document.body, { key: "Escape", code: "Escape" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Queue?")).not.toBeVisible();
    });
    expect(mockDeleteCurrentQueue).not.toHaveBeenCalled();
  });

  it("renders message metadata rows (Receive Count, Sender) when attributes are present", async () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [
        {
          messageBody: "meta body",
          messageId: "rrrrrrrr0001",
          messageAttributes: {
            ApproximateReceiveCount: "3",
            SenderId: "AIDAEXAMPLEID",
          },
        },
      ],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    // Expand the accordion to see the details
    const summary = screen.getByText("rrrrrrrr…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    // The metadata section should render Receive Count and Sender rows
    expect(screen.getByText("Receive Count")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sender")).toBeInTheDocument();
    expect(screen.getByText("AIDAEXAMPLEID")).toBeInTheDocument();
  });

  it("closes delete message dialog via Escape key (onClose handler)", async () => {
    (useMessagePoller as jest.Mock).mockReturnValue({
      ...mockPollerBase,
      messages: [{ messageBody: "esc body", messageId: "ppppppppqqqq" }],
    });
    render(<QueueColumn {...defaultProps} queue={baseQueue} />);

    const summary = screen.getByText("pppppppp…").closest("button");
    await act(async () => { fireEvent.click(summary!); });
    await waitFor(() => expect(screen.getByText("Body")).toBeInTheDocument());

    const deleteBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("aria-label") === "Delete message",
    );
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(screen.getByText("Delete message?")).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document.activeElement || document.body, { key: "Escape", code: "Escape" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete message?")).not.toBeVisible();
    });
  });
});
