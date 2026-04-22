import { renderHook, act, waitFor } from "@testing-library/react";
import useQueueActions from "./useQueueActions";
import { Queue, SqsMessage } from "../types";

const mockQueue: Queue = {
  QueueName: "test-queue",
  QueueUrl: "http://localhost:4566/000000000000/test-queue",
};

const mockFifoQueue: Queue = {
  QueueName: "orders.fifo",
  QueueUrl: "http://localhost:4566/000000000000/orders.fifo",
};

let mockReloadQueues: jest.Mock;
let mockClearMessages: jest.Mock;

beforeEach(() => {
  mockReloadQueues = jest.fn();
  mockClearMessages = jest.fn();

  global.fetch = jest.fn(async () => Response.json({})) as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useQueueActions", () => {
  it("createNewQueue calls callApi with action CreateQueue and invokes reloadQueues on success", async () => {
    const { result } = renderHook(() =>
      useQueueActions(mockQueue, mockReloadQueues, mockClearMessages),
    );

    await act(async () => {
      await result.current.createNewQueue({ QueueName: "new-queue" });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"CreateQueue"'),
      }),
    );
    expect(mockReloadQueues).toHaveBeenCalledTimes(1);
  });

  it("deleteCurrentQueue calls callApi with action DeleteQueue and invokes both clearMessages and reloadQueues on success", async () => {
    const { result } = renderHook(() =>
      useQueueActions(mockQueue, mockReloadQueues, mockClearMessages),
    );

    await act(async () => {
      await result.current.deleteCurrentQueue();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"DeleteQueue"'),
      }),
    );
    expect(mockClearMessages).toHaveBeenCalledTimes(1);
    expect(mockReloadQueues).toHaveBeenCalledTimes(1);
  });

  it("purgeCurrentQueue calls callApi with action PurgeQueue and invokes clearMessages on success", async () => {
    const { result } = renderHook(() =>
      useQueueActions(mockQueue, mockReloadQueues, mockClearMessages),
    );

    await act(async () => {
      await result.current.purgeCurrentQueue();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"PurgeQueue"'),
      }),
    );
    expect(mockClearMessages).toHaveBeenCalledTimes(1);
    // reloadQueues not called for purge
    expect(mockReloadQueues).not.toHaveBeenCalled();
  });

  it("sendMessageToCurrentQueue calls callApi with action SendMessage", async () => {
    const { result } = renderHook(() =>
      useQueueActions(mockQueue, mockReloadQueues, mockClearMessages),
    );

    const message: SqsMessage = { messageBody: "hello" };
    await act(async () => {
      await result.current.sendMessageToCurrentQueue(message);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"SendMessage"'),
      }),
    );
  });

  it("sendMessageToCurrentQueue sets error when FIFO queue is missing MessageGroupId", async () => {
    const { result } = renderHook(() =>
      useQueueActions(mockFifoQueue, mockReloadQueues, mockClearMessages),
    );

    const message: SqsMessage = { messageBody: "hello" };
    await act(async () => {
      await result.current.sendMessageToCurrentQueue(message);
    });

    await waitFor(() => {
      expect(result.current.error).toContain("MessageGroupID");
    });

    // Should NOT have called the API
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sendMessageToCurrentQueue sets error when selectedQueue has no QueueUrl", async () => {
    // Pass null as the selected queue so QueueUrl is absent — covers lines 60-61
    const { result } = renderHook(() =>
      useQueueActions(null, mockReloadQueues, mockClearMessages),
    );

    const message: SqsMessage = { messageBody: "hello" };
    await act(async () => {
      await result.current.sendMessageToCurrentQueue(message);
    });

    expect(result.current.error).toBe(
      "Could not send message to non-existent queue",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("has no setTimeout calls in mutation handlers", () => {
    // This is a static check — the source file must contain 0 setTimeout occurrences.
    // Enforced by acceptance criteria grep; this test documents the requirement.
    const src = require("fs").readFileSync(
      require("path").resolve(__dirname, "./useQueueActions.tsx"),
      "utf8",
    );
    expect(src).not.toContain("setTimeout");
  });
});
