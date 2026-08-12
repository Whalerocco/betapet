import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTileDrag } from "./useTileDrag";

function pointerEvent(
  type: string,
  init: { clientX: number; clientY: number; pointerType?: string },
) {
  return new PointerEvent(type, {
    clientX: init.clientX,
    clientY: init.clientY,
    pointerType: init.pointerType ?? "mouse",
    button: 0,
    bubbles: true,
  });
}

describe("useTileDrag", () => {
  it("does not report a drag for a plain tap (no movement past the threshold)", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useTileDrag<string>({ onDrop }));

    act(() => {
      result.current.startDrag("tile-1", {
        clientX: 10,
        clientY: 10,
        pointerType: "mouse",
        button: 0,
      } as unknown as React.PointerEvent);
    });
    expect(result.current.dragState).toBeUndefined();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointermove", { clientX: 11, clientY: 11 }),
      );
    });
    expect(result.current.dragState).toBeUndefined();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { clientX: 11, clientY: 11 }),
      );
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.dragState).toBeUndefined();
  });

  it("reports drag state and calls onDrop once movement crosses the threshold", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useTileDrag<string>({ onDrop }));

    act(() => {
      result.current.startDrag("tile-1", {
        clientX: 0,
        clientY: 0,
        pointerType: "mouse",
        button: 0,
      } as unknown as React.PointerEvent);
    });

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointermove", { clientX: 40, clientY: 0 }),
      );
    });
    expect(result.current.dragState).toEqual({
      item: "tile-1",
      position: { x: 40, y: 0 },
    });

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointerup", { clientX: 80, clientY: 0 }),
      );
    });

    expect(onDrop).toHaveBeenCalledExactlyOnceWith("tile-1", {
      x: 80,
      y: 0,
    });
    expect(result.current.dragState).toBeUndefined();
  });

  it("clears drag state on pointercancel without calling onDrop", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useTileDrag<string>({ onDrop }));

    act(() => {
      result.current.startDrag("tile-1", {
        clientX: 0,
        clientY: 0,
        pointerType: "mouse",
        button: 0,
      } as unknown as React.PointerEvent);
      window.dispatchEvent(
        pointerEvent("pointermove", { clientX: 50, clientY: 0 }),
      );
    });
    expect(result.current.dragState).toBeDefined();

    act(() => {
      window.dispatchEvent(
        pointerEvent("pointercancel", { clientX: 50, clientY: 0 }),
      );
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.dragState).toBeUndefined();
  });

  it("ignores non-primary mouse buttons", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useTileDrag<string>({ onDrop }));

    act(() => {
      result.current.startDrag("tile-1", {
        clientX: 0,
        clientY: 0,
        pointerType: "mouse",
        button: 2,
      } as unknown as React.PointerEvent);
      window.dispatchEvent(
        pointerEvent("pointermove", { clientX: 50, clientY: 0 }),
      );
    });

    expect(result.current.dragState).toBeUndefined();
  });
});
