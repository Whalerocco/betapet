import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";

import { TILE_TEXT_BASE_PX, useTileTextScale } from "./useTileTextScale";

/**
 * The measurement half of `known-bugs.md` item 8. What it guards is small but exact: the factor
 * published has to be the rendered tile divided by the size the text is drawn at, because the
 * stylesheets multiply it by each element's design ratio to get back to the intended size.
 *
 * jsdom reports zero for every box, so widths are stubbed — this is arithmetic and plumbing, not
 * layout, and the layout half is CSS that no DOM test can judge.
 */

function Harness({ tileWidth }: { readonly tileWidth: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTileTextScale(containerRef);

  return (
    <div ref={containerRef} data-testid="container">
      <span
        data-testid="tile"
        ref={(element) => {
          if (element) {
            element.getBoundingClientRect = () =>
              ({ width: tileWidth }) as DOMRect;
          }
        }}
      />
    </div>
  );
}

describe("useTileTextScale", () => {
  it("publishes the tile's width over the size the text is drawn at", () => {
    const { getByTestId } = render(<Harness tileWidth={22} />);

    // A 22px tile: the letter's 0.42 ratio then renders at 16px × (22/16) × 0.42 ≈ 9.2px, which
    // is what it should have been all along — and is reached without asking for a 9px font.
    expect(
      getByTestId("container").style.getPropertyValue("--tile-text-unit"),
    ).toBe(String(22 / TILE_TEXT_BASE_PX));
  });

  it("republishes when the tile changes size, as a pinch zoom makes it", () => {
    const { getByTestId, rerender } = render(<Harness tileWidth={22} />);
    rerender(<Harness tileWidth={66} />);

    expect(
      getByTestId("container").style.getPropertyValue("--tile-text-unit"),
    ).toBe(String(66 / TILE_TEXT_BASE_PX));
  });

  it("keeps the last good value rather than publishing zero for an unrendered tile", () => {
    // A container that is display:none or detached measures 0, and a zero factor would hide
    // every glyph on the board — which is exactly how the earlier attempt at this failed.
    const { getByTestId, rerender } = render(<Harness tileWidth={22} />);
    rerender(<Harness tileWidth={0} />);

    expect(
      getByTestId("container").style.getPropertyValue("--tile-text-unit"),
    ).toBe(String(22 / TILE_TEXT_BASE_PX));
  });

  it("does nothing when there is no tile to measure", () => {
    function Empty() {
      const containerRef = useRef<HTMLDivElement>(null);
      useTileTextScale(containerRef);
      return <div ref={containerRef} data-testid="container" />;
    }

    const { getByTestId } = render(<Empty />);

    expect(
      getByTestId("container").style.getPropertyValue("--tile-text-unit"),
    ).toBe("");
  });

  it("watches for a resize that arrives without a re-render", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      },
    );

    const { unmount } = render(<Harness tileWidth={22} />);
    expect(observe).toHaveBeenCalled();

    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
