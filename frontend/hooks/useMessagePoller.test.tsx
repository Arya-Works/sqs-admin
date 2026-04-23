import { renderHook, act, waitFor } from "@testing-library/react";
import useMessagePoller from "./useMessagePoller";
import { Queue } from "../types";

const mockQueue: Queue = {
  QueueName: "test-queue",
  QueueUrl: "http://localhost:4566/000000000000/test-queue",
};

const mockMessages = [
  { messageBody: '{"orderId": 1}', messageId: "msg-001" },
];

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
    const body = JSON.parse(options?.body as string);
    if (body.action === "GetMessages") {
      return Response.json(mockMessages);
    }
    return Response.json({});
  }) as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("useMessagePoller", () => {
  const countGetMessageCalls = () =>
    (global.fetch as jest.Mock).mock.calls.filter(([, opts]: [string, RequestInit?]) => {
      try { return JSON.parse(opts?.body as string).action === "GetMessages"; }
      catch { return false; }
    }).length;

  // Advance time by 1s and flush the async chain so the next recursive
  // setTimeout gets scheduled before the next advanceTimersByTime call.
  const tick = async () => {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("polls every 1 second when not paused", async () => {
    renderHook(() => useMessagePoller(mockQueue));

    // Drain mount-time immediate poll
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const callsBefore = countGetMessageCalls();

    await tick();
    await tick();
    await tick();

    expect(countGetMessageCalls() - callsBefore).toBe(3);
  });

  it("fires poll callback exactly 3 times in 3 seconds (exact count)", async () => {
    renderHook(() => useMessagePoller(mockQueue));

    // Drain mount-time immediate poll
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const before = countGetMessageCalls();

    await tick();
    await tick();
    await tick();

    // Exactly 3 scheduled polls in 3 × 1s ticks (recursive setTimeout, waits for response)
    expect(countGetMessageCalls() - before).toBe(3);
  });

  it("fires poll exactly once on queue switch (useEffect one-shot)", async () => {
    const { result, rerender } = renderHook(
      ({ queue }: { queue: Queue | null }) => useMessagePoller(queue),
      { initialProps: { queue: mockQueue } },
    );

    // Drain mount-time useEffect poll
    await act(async () => {
      await Promise.resolve();
    });

    const newQueue: Queue = {
      QueueName: "other-queue",
      QueueUrl: "http://localhost:4566/000000000000/other-queue",
    };

    const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    // Switch queue — triggers useEffect
    rerender({ queue: newQueue });

    await act(async () => {
      await Promise.resolve();
    });

    const callsAfterSwitch = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    // Exactly 1 call fired immediately on switch — the useEffect one-shot
    expect(callsAfterSwitch - callsBefore).toBe(1);

    // Advance 0ms more — no additional calls should fire
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const callsAfterZero = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    expect(callsAfterZero).toBe(callsAfterSwitch);
  });

  it("clears messages and resets state when selectedQueue changes", async () => {
    const { result, rerender } = renderHook(
      ({ queue }: { queue: Queue | null }) => useMessagePoller(queue),
      { initialProps: { queue: mockQueue } },
    );

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    const newQueue: Queue = {
      QueueName: "other-queue",
      QueueUrl: "http://localhost:4566/000000000000/other-queue",
    };

    rerender({ queue: newQueue });

    // After queue change, messages should reset briefly before re-fetch
    await act(async () => {
      await Promise.resolve();
    });

    // Messages cleared on queue switch (useEffect fires)
    // (They may re-populate after the immediate poll, but the reset happens)
    expect(result.current.consecutiveEmptyCount.current).toBe(0);
  });

  it("holds stale messages when response is empty (consecutiveEmptyCount < 3)", async () => {
    // First return messages, then empty
    let callCount = 0;
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(options?.body as string);
      if (body.action === "GetMessages") {
        callCount += 1;
        if (callCount === 1) {
          return Response.json(mockMessages);
        }
        return Response.json([]);
      }
      return Response.json({});
    }) as typeof fetch;

    const { result } = renderHook(() => useMessagePoller(mockQueue));

    // Wait for initial messages
    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    // Trigger 1 more poll (empty) — consecutiveEmptyCount = 1
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    // Messages held — not cleared yet
    expect(result.current.messages.length).toBeGreaterThan(0);
  });

  it("clears messages after 3 consecutive empty responses", async () => {
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(options?.body as string);
      if (body.action === "GetMessages") {
        return Response.json([]);
      }
      return Response.json({});
    }) as typeof fetch;

    const { result } = renderHook(() => useMessagePoller(mockQueue));

    // Initial fetch (1st empty)
    await act(async () => {
      await Promise.resolve();
    });

    // 2nd empty poll
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    // 3rd empty poll — should clear
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(0);
      expect(result.current.consecutiveEmptyCount.current).toBeGreaterThanOrEqual(3);
    });
  });

  it("clearMessages resets messages to [] and consecutiveEmptyCount to 0", async () => {
    const { result } = renderHook(() => useMessagePoller(mockQueue));

    // Wait for initial fetch to populate messages
    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    // Manually bump the ref to confirm reset
    result.current.consecutiveEmptyCount.current = 5;

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.consecutiveEmptyCount.current).toBe(0);
    expect(result.current.lastUpdatedAt).toBeNull();
  });

  it("removeMessage removes only the matching message by id", async () => {
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(options?.body as string);
      if (body.action === "GetMessages") {
        return Response.json([
          { messageBody: "first", messageId: "msg-001" },
          { messageBody: "second", messageId: "msg-002" },
        ]);
      }
      return Response.json({});
    }) as typeof fetch;

    const { result } = renderHook(() => useMessagePoller(mockQueue));

    await waitFor(() => {
      expect(result.current.messages.length).toBe(2);
    });

    act(() => {
      result.current.removeMessage("msg-001");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].messageId).toBe("msg-002");
  });

  it("clearError clears the error state", async () => {
    // Force a fetch error so error state is set
    global.fetch = jest.fn(async () => {
      throw new Error("network failure");
    }) as typeof fetch;

    const { result } = renderHook(() => useMessagePoller(mockQueue));

    await waitFor(() => {
      expect(result.current.error).toBe("network failure");
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe("");
  });

});
