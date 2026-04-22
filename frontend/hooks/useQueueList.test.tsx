import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useQueueList from "./useQueueList";

const mockQueues = [
  {
    QueueName: "test-queue",
    QueueUrl: "http://localhost:4566/000000000000/test-queue",
  },
];

beforeEach(() => {
  global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
    if (!options || options.method === "GET") {
      return Response.json(mockQueues);
    }
    const body = JSON.parse(options.body as string);
    if (body.action === "GetRegion") {
      return Response.json({ region: "us-east-1" });
    }
    return Response.json({});
  }) as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("useQueueList", () => {
  it("fetches queues on mount", async () => {
    const { result } = renderHook(() => useQueueList(), { wrapper });
    await waitFor(() => {
      expect(result.current.queues.length).toBeGreaterThan(0);
    });
    expect(result.current.queues[0].QueueName).toBe("test-queue");
  });

  it("fetches region on mount", async () => {
    const { result } = renderHook(() => useQueueList(), { wrapper });
    await waitFor(() => {
      expect(result.current.region.region).toBe("us-east-1");
    });
  });

  it("reloadQueues triggers a re-fetch", async () => {
    const { result } = renderHook(() => useQueueList(), { wrapper });

    await waitFor(() => {
      expect(result.current.queues.length).toBeGreaterThan(0);
    });

    const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(
      ([, opts]: [string, RequestInit?]) => !opts || opts.method === "GET",
    ).length;

    act(() => {
      result.current.reloadQueues();
    });

    await waitFor(() => {
      const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(
        ([, opts]: [string, RequestInit?]) => !opts || opts.method === "GET",
      ).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  it("sets disabledStatus to false when queues exist, true when empty", async () => {
    const { result } = renderHook(() => useQueueList(), { wrapper });

    // Initially disabled
    expect(result.current.disabledStatus).toBe(true);

    // After fetch completes, queues exist → enabled
    await waitFor(() => {
      expect(result.current.disabledStatus).toBe(false);
    });

    // Override fetch to return empty list
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      if (!options || options.method === "GET") {
        return Response.json([]);
      }
      return Response.json({});
    }) as typeof fetch;

    act(() => {
      result.current.reloadQueues();
    });

    await waitFor(() => {
      expect(result.current.disabledStatus).toBe(true);
    });
  });
});
