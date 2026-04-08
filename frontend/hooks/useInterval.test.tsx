import { renderHook } from "@testing-library/react";
import useInterval from "./useInterval";

describe("useInterval", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls callback at specified interval", () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, 1000));

    jest.advanceTimersByTime(3000);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("does not restart timer when callback identity changes", () => {
    const setIntervalSpy = jest.spyOn(global, "setInterval");

    const callbackA = jest.fn();
    const callbackB = jest.fn();

    const { rerender } = renderHook(
      ({ cb }) => useInterval(cb, 1000),
      { initialProps: { cb: callbackA } }
    );

    rerender({ cb: callbackB });

    // setInterval should have been called exactly once — dep array is [delay] only
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("stops interval when delay is null", () => {
    const callback = jest.fn();

    const { rerender } = renderHook(
      ({ delay }: { delay: number | null }) => useInterval(callback, delay),
      { initialProps: { delay: 1000 as number | null } }
    );

    rerender({ delay: null });

    jest.advanceTimersByTime(5000);

    // No calls should have happened because delay was set to null before timers advanced
    expect(callback).toHaveBeenCalledTimes(0);
  });

  it("restarts interval when delay value changes", () => {
    const callback = jest.fn();

    const { rerender } = renderHook(
      ({ delay }: { delay: number | null }) => useInterval(callback, delay),
      { initialProps: { delay: 1000 as number | null } }
    );

    jest.advanceTimersByTime(2500);
    // Expect 2 calls at 1000ms intervals within 2500ms
    expect(callback).toHaveBeenCalledTimes(2);

    rerender({ delay: 500 });

    jest.advanceTimersByTime(1500);
    // 3 more calls at 500ms intervals within 1500ms
    expect(callback).toHaveBeenCalledTimes(5);
  });
});
