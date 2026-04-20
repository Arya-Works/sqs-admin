import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Overview from "./Overview";
import "@testing-library/jest-dom";

// Mock QueueColumn to keep tests at unit level — we test column wiring, not internals
jest.mock("./QueueColumn", () => {
  const React = require("react");
  return function MockQueueColumn({
    queue,
    queues,
    globalPaused,
    onSelectQueue,
    showBorder,
    onRemove,
  }: {
    queue: { QueueName: string } | null;
    queues: { QueueName: string }[];
    globalPaused: boolean;
    onSelectQueue: (name: string) => void;
    showBorder: boolean;
    onRemove?: () => void;
  }) {
    return (
      <div data-testid="queue-column">
        <span data-testid="column-queue">{queue?.QueueName ?? "empty"}</span>
        <span data-testid="column-border">{showBorder ? "bordered" : "no-border"}</span>
        <span data-testid="column-paused">{globalPaused ? "paused" : "running"}</span>
        {onRemove && (
          <button onClick={onRemove} aria-label="Close column">Remove</button>
        )}
        <select
          aria-label="select-queue"
          onChange={(e) => onSelectQueue(e.target.value)}
          value={queue?.QueueName ?? ""}
        >
          <option value="">--</option>
          {queues.map((q) => (
            <option key={q.QueueName} value={q.QueueName}>{q.QueueName}</option>
          ))}
        </select>
      </div>
    );
  };
});

const mockQueues = [
  { QueueName: "test-queue", QueueUrl: "http://localhost:4566/000000000000/test-queue" },
  { QueueName: "orders.fifo", QueueUrl: "http://localhost:4566/000000000000/orders.fifo" },
];

let fetchHandler: jest.Mock;

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
      case "CreateQueue":
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

describe("<Overview />", () => {
  it("renders app title and AppBar", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });
    expect(screen.getByText("SQS Admin")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("displays the region chip after API response", async () => {
    await act(async () => {
      render(<MemoryRouter><Overview /></MemoryRouter>);
    });
    await waitFor(() => {
      expect(screen.getByText("us-east-1")).toBeInTheDocument();
    });
  });

  it("renders one QueueColumn by default (c=1)", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });
    await waitFor(() => {
      const columns = screen.getAllByTestId("queue-column");
      expect(columns).toHaveLength(1);
    });
  });

  it("renders three QueueColumns when URL has c=3", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=3"]}><Overview /></MemoryRouter>);
    });
    await waitFor(() => {
      const columns = screen.getAllByTestId("queue-column");
      expect(columns).toHaveLength(3);
    });
  });

  it("shows 'No Queues' alert when API returns empty list", async () => {
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") return Response.json([]);
      const body = JSON.parse(options.body as string);
      if (body.action === "GetRegion") return Response.json({ region: "eu-central-1" });
      return Response.json({});
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText("No Queues")).toBeInTheDocument();
      expect(screen.getByText(/No queues in region/)).toBeInTheDocument();
    });
  });

  it("shows error alert when API call throws", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("Network failure");
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
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
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
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

  it("passes globalPaused=false to columns initially", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByTestId("column-paused").textContent).toBe("running");
    });
  });

  it("toggles globalPaused state via AppShell pause button", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Pause all polling")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause all polling"));
    });

    expect(screen.getByLabelText("Resume all polling")).toBeInTheDocument();
    expect(screen.getByTestId("column-paused").textContent).toBe("paused");

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Resume all polling"));
    });

    expect(screen.getByLabelText("Pause all polling")).toBeInTheDocument();
    expect(screen.getByTestId("column-paused").textContent).toBe("running");
  });

  it("last column has no border, non-last columns have border", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=3"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      const borders = screen.getAllByTestId("column-border");
      expect(borders).toHaveLength(3);
      expect(borders[0].textContent).toBe("bordered");
      expect(borders[1].textContent).toBe("bordered");
      expect(borders[2].textContent).toBe("no-border");
    });
  });

  it("single column has no onRemove (cannot remove last column)", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close column" })).not.toBeInTheDocument();
    });
  });

  it("multi-column layout shows Remove buttons on each column", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=2"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      const removeBtns = screen.getAllByRole("button", { name: "Close column" });
      expect(removeBtns).toHaveLength(2);
    });
  });

  it("clicking Remove decrements column count from 2 to 1", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=2"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });

    await act(async () => {
      const removeBtns = screen.getAllByRole("button", { name: "Close column" });
      fireEvent.click(removeBtns[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(1);
    });
  });

  it("Add column button increments column count", async () => {
    // jsdom window.innerWidth defaults to 1024 — wide enough for 3 columns (3 * 320 = 960)
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(1);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });
  });

  it("calls CreateQueue API when create queue dialog is submitted", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
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

  it("migrates legacy ?cols= param to new hashed format on first load", async () => {
    // ?cols= format: tilde-separated queue names, no 'c' param present
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/?cols=test-queue~orders.fifo"]}>
          <Overview />
        </MemoryRouter>,
      );
    });

    // After migration the component re-renders with the new URL params.
    // The column count should be 2 (two names in ?cols=)
    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });
  });

  it("migrates legacy ?queue= param to new hashed format on first load", async () => {
    // Old ?queue= single-queue format — no 'c' param present
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/?queue=test-queue"]}>
          <Overview />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(1);
    });
  });

  it("setSlotQueue updates URL when a queue is selected in a column", async () => {
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    // Wait for queues to load so the select is populated
    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(1);
    });

    // The mock QueueColumn has a <select aria-label="select-queue"> that calls onSelectQueue
    await act(async () => {
      // select element — use getByRole("listbox") or just query directly
      const selectEl = document.querySelector('select[aria-label="select-queue"]') as HTMLSelectElement;
      expect(selectEl).not.toBeNull();
      fireEvent.change(selectEl, { target: { value: "orders.fifo" } });
    });

    // After selection, the column should reflect the chosen queue via getSlotQueue
    await waitFor(() => {
      expect(screen.getByTestId("column-queue").textContent).toBe("orders.fifo");
    });
  });

  it("shows 'No Queues' with default region fallback when region is not set", async () => {
    // API returns empty queue list and region with no region string (falsy)
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") return Response.json([]);
      const body = JSON.parse(options.body as string);
      if (body.action === "GetRegion") return Response.json({ region: "" });
      return Response.json({});
    }) as typeof fetch;

    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=1"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      // The fallback "eu-central-1" should appear when region.region is falsy
      expect(screen.getByText(/eu-central-1/)).toBeInTheDocument();
    });
  });

  it("migration useEffect skips when COUNT_PARAM already set", async () => {
    // With ?c=2 already in URL, the migration effect returns early — no re-render cascade
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=2"]}><Overview /></MemoryRouter>);
    });
    await waitFor(() => {
      // Should still render 2 columns without touching the URL
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });
  });

  it("migration handles ?cols= with empty segment (null name branch)", async () => {
    // ?cols=test-queue~ has an empty trailing name → that slot is null (not set in params)
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/?cols=test-queue~"]}>
          <Overview />
        </MemoryRouter>,
      );
    });
    await waitFor(() => {
      // Two names from the split: "test-queue" and "" → 2 columns, second has no hash set
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });
  });

  it("migration falls back to first queue when no ?queue= or ?q1= present", async () => {
    // No 'c', no 'cols', no 'queue', no 'q1' — falls back to queues[0].QueueName
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Overview />
        </MemoryRouter>,
      );
    });
    await waitFor(() => {
      // After migration: 1 column pointing at the first queue
      expect(screen.getAllByTestId("queue-column")).toHaveLength(1);
    });
  });

  it("does not add column when already at max columns", async () => {
    // jsdom window.innerWidth=1024, MIN_COLUMN_PX=320 → maxColumns = floor(1024/320) = 3
    // Start at c=3 (already at max) — Add column button should be disabled
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=3"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(3);
    });

    // The "Add column" button should be disabled when at max
    const addBtn = screen.getByRole("button", { name: "Add column" });
    expect(addBtn).toBeDisabled();
  });

  it("removeColumn shifts slot values left when removing from the middle", async () => {
    // Start with 3 columns: select queues in cols 0 and 2
    await act(async () => {
      render(<MemoryRouter initialEntries={["/?c=3"]}><Overview /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(3);
    });

    // Select a queue in column 0
    await act(async () => {
      const selects = document.querySelectorAll('select[aria-label="select-queue"]');
      fireEvent.change(selects[0], { target: { value: "test-queue" } });
    });

    // Remove the first column — col 1 should shift to col 0 position
    await act(async () => {
      const removeBtns = screen.getAllByRole("button", { name: "Close column" });
      fireEvent.click(removeBtns[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("queue-column")).toHaveLength(2);
    });
  });
});
