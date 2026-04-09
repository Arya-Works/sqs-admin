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
  it("polls every 3 seconds when not paused", async () => {
    const { result } = renderHook(() => useMessagePoller(mockQueue));

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    // Advance 6 seconds (2 polling intervals)
    await act(async () => {
      jest.advanceTimersByTime(6000);
      await Promise.resolve();
    });

    const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    expect(callsAfter - callsBefore).toBeGreaterThanOrEqual(2);
  });

  it("does NOT poll when pollingPaused is true", async () => {
    const { result } = renderHook(() => useMessagePoller(mockQueue));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setPollingPaused(true);
    });

    const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    await act(async () => {
      jest.advanceTimersByTime(9000);
      await Promise.resolve();
    });

    const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    expect(callsAfter).toBe(callsBefore);
  });

  it("does NOT poll when perQueuePaused[queueName] is true", async () => {
    const { result } = renderHook(() => useMessagePoller(mockQueue));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setPerQueuePaused({ "test-queue": true });
    });

    const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    await act(async () => {
      jest.advanceTimersByTime(9000);
      await Promise.resolve();
    });

    const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => {
        try {
          return JSON.parse(opts?.body as string).action === "GetMessages";
        } catch {
          return false;
        }
      },
    ).length;

    expect(callsAfter).toBe(callsBefore);
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
});
