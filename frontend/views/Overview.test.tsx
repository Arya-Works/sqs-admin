import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Overview from "./Overview";
import "@testing-library/jest-dom";

const mockQueues = [
  {
    QueueName: "test-queue",
    QueueUrl: "http://localhost:4566/000000000000/test-queue",
  },
  {
    QueueName: "orders.fifo",
    QueueUrl: "http://localhost:4566/000000000000/orders.fifo",
  },
];

const mockMessages = [
  {
    messageBody: '{"orderId": 1}',
    messageId: "msg-001",
    messageAttributes: {
      SentTimestamp: "1700000000000",
      ApproximateFirstReceiveTimestamp: "1700000001000",
    },
  },
];

let fetchHandler: (url: string, options?: RequestInit) => Promise<Response>;

beforeEach(() => {
  jest.useFakeTimers();

  fetchHandler = jest.fn(async (_url: string, options?: RequestInit) => {
    if (!options || options.method === "GET") {
      return Response.json(mockQueues);
    }
    const body = JSON.parse(options.body as string);
    switch (body.action) {
      case "GetRegion":
        return Response.json({ region: "us-east-1" });
      case "GetMessages":
        return Response.json(mockMessages);
      case "CreateQueue":
        return Response.json({});
      case "DeleteQueue":
        return Response.json({});
      case "PurgeQueue":
        return Response.json({});
      case "SendMessage":
        return Response.json({});
      default:
        return Response.json({});
    }
  });

  global.fetch = fetchHandler as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("<Overview /> spec", () => {
  it("renders app title and region in AppBar", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });
    // New layout: title is "SQS Admin" (no "UI" suffix)
    expect(screen.getByText("SQS Admin")).toBeInTheDocument();
    await waitFor(() => {
      // Region is shown as a Chip in the AppBar
      expect(screen.getByText("us-east-1")).toBeInTheDocument();
    });
  });

  it("renders queue list from API", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });
    await waitFor(() => {
      // Queues appear in the dropdown combobox value or as accessible option
      expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
    });
  });

  it("shows 'No Queue' message when no queues exist", async () => {
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") {
        return Response.json([]);
      }
      const body = JSON.parse(options.body as string);
      if (body.action === "GetRegion") {
        return Response.json({ region: "eu-central-1" });
      }
      return Response.json({});
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText("No Queue")).toBeInTheDocument();
      expect(screen.getByText(/No Queues exist in region/)).toBeInTheDocument();
    });
  });

  it("disables overflow menu items when no queues exist", async () => {
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") return Response.json([]);
      return Response.json({ region: "" });
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    // Open the overflow menu to inspect disabled state
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Queue actions" }));
    });

    // All action items should be disabled when no queue selected
    const menuItems = screen.getAllByRole("menuitem");
    menuItems.forEach((item) => {
      expect(item).toHaveAttribute("aria-disabled", "true");
    });
  });

  it("enables overflow menu items when queues exist", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
    });

    // Open the overflow menu to inspect enabled state
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Queue actions" }));
    });

    await waitFor(() => {
      // Send message button (inside SendMessageDialog wrapped in MenuItem) should be enabled
      const sendBtn = screen.getByRole("button", { name: "Send message" });
      expect(sendBtn).not.toBeDisabled();
    });
  });

  it("renders messages for selected queue", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText(/msg-001/)).toBeInTheDocument();
    });
  });

  it("shows error alert when API call fails", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("Network failure");
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  it("dismisses error alert when close is clicked", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("Something broke");
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText("Something broke")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /close/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText("Something broke")).not.toBeInTheDocument();
    });
  });

  it("calls delete queue API when Delete Queue is confirmed", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
    });

    // Open overflow menu
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Queue actions" }));
    });

    // Click "Delete Queue" in menu (opens confirmation dialog)
    await act(async () => {
      fireEvent.click(screen.getByText("Delete Queue"));
    });

    // Confirm in dialog — "Delete Queue" button in DialogActions
    await act(async () => {
      const deleteButtons = screen.getAllByText("Delete Queue");
      // The button in DialogActions (contained, error color)
      const confirmBtn = deleteButtons.find(
        (el) => el.closest("button")?.getAttribute("type") === "button" &&
          el.closest("[class*=MuiDialogActions]"),
      ) ?? deleteButtons[deleteButtons.length - 1];
      fireEvent.click(confirmBtn.closest("button") ?? confirmBtn);
    });

    expect(fetchHandler).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"DeleteQueue"'),
      }),
    );
  });

  it("calls purge queue API when Purge Queue is confirmed", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
    });

    // Open overflow menu
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Queue actions" }));
    });

    // Click "Purge Queue" in menu (opens confirmation dialog)
    await act(async () => {
      fireEvent.click(screen.getByText("Purge Queue"));
    });

    // Confirm in dialog — "Purge Queue" button in DialogActions
    await act(async () => {
      const purgeButtons = screen.getAllByText("Purge Queue");
      const confirmBtn = purgeButtons[purgeButtons.length - 1];
      fireEvent.click(confirmBtn.closest("button") ?? confirmBtn);
    });

    expect(fetchHandler).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"PurgeQueue"'),
      }),
    );
  });

  it("creates a queue via the Create Queue dialog", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Queue" }));
    fireEvent.change(screen.getByLabelText("Queue-Name"), {
      target: { value: "new-queue" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
    });

    expect(fetchHandler).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"CreateQueue"'),
      }),
    );
  });

  it("renders global pause button and toggles icon on click", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Pause all polling")).toBeInTheDocument();
    });

    // Click to pause
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause all polling"));
    });

    expect(screen.getByLabelText("Resume all polling")).toBeInTheDocument();

    // Click to resume
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Resume all polling"));
    });

    expect(screen.getByLabelText("Pause all polling")).toBeInTheDocument();
  });

  it("stops polling when global pause is active", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-queue")).toBeInTheDocument();
    });

    // Record GetMessages call count before pause
    const getMessageCallsBefore = (fetchHandler as jest.Mock).mock.calls
      .filter(([, opts]: [string, RequestInit?]) => opts?.body && JSON.parse(opts.body as string).action === "GetMessages").length;

    // Click pause
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause all polling"));
    });

    // Advance timers by 9 seconds (3 polling intervals)
    await act(async () => {
      jest.advanceTimersByTime(9000);
    });

    const getMessageCallsAfter = (fetchHandler as jest.Mock).mock.calls
      .filter(([, opts]: [string, RequestInit?]) => opts?.body && JSON.parse(opts.body as string).action === "GetMessages").length;

    // No new GetMessages calls should have been made while paused
    expect(getMessageCallsAfter).toBe(getMessageCallsBefore);
  });

  it("renders polling dot for selected queue in AppBar", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      // New layout: only selected queue has a polling dot in the AppBar
      expect(screen.getByLabelText("Pause polling for test-queue")).toBeInTheDocument();
    });
  });

  it("toggles polling dot for selected queue", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Pause polling for test-queue")).toBeInTheDocument();
    });

    // Click the dot to pause test-queue
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause polling for test-queue"));
    });

    // Dot should now show "Resume" label
    expect(screen.getByLabelText("Resume polling for test-queue")).toBeInTheDocument();
  });

  it("shows empty state after 3 consecutive empty polls", async () => {
    // Override fetch to return empty messages array
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") {
        return Response.json(mockQueues);
      }
      const body = JSON.parse(options.body as string);
      switch (body.action) {
        case "GetRegion":
          return Response.json({ region: "us-east-1" });
        case "GetMessages":
          return Response.json([]);  // Always empty
        default:
          return Response.json({});
      }
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });

    // Advance 2 polling intervals (initial fetch is 1, need 2 more = 3 total consecutive empties)
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText("No messages in this queue")).toBeInTheDocument();
    });
  });
});
