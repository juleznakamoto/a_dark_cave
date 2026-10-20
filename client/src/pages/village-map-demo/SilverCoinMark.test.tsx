/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SilverCoinMark } from "@/pages/village-map-demo/SilverCoinMark";

const svgProto = SVGSVGElement.prototype as SVGSVGElement & {
  getScreenCTM?: () => DOMMatrix | null;
};
const previousCtm = svgProto.getScreenCTM;

afterEach(() => {
  if (previousCtm) svgProto.getScreenCTM = previousCtm;
  else delete svgProto.getScreenCTM;
});

describe("SilverCoinMark press", () => {
  beforeEach(() => {
    svgProto.getScreenCTM = () => null;
  });

  it("collects when the press is released, so the coin can shrink while held", () => {
    const onCollect = vi.fn();
    const view = render(
      <svg>
        <SilverCoinMark id="coin-a" x={10} y={20} label="Silver" onCollect={onCollect} />
      </svg>,
    );
    const coin = view.getByTestId("village-silver-coin");
    expect(coin.querySelector(".village-silver-coin-body")).not.toBeNull();

    fireEvent.pointerDown(coin);
    expect(onCollect).not.toHaveBeenCalled();
    expect(coin.classList.contains("is-pressed")).toBe(true);

    fireEvent.pointerUp(coin);
    expect(coin.classList.contains("is-pressed")).toBe(false);
    expect(onCollect).toHaveBeenCalledTimes(1);
    expect(onCollect).toHaveBeenCalledWith("coin-a");
  });

  it("releases a successful capture without asking hasPointerCapture", () => {
    const onCollect = vi.fn();
    const view = render(
      <svg>
        <SilverCoinMark id="coin-a" x={10} y={20} label="Silver" onCollect={onCollect} />
      </svg>,
    );
    const coin = view.getByTestId("village-silver-coin");
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    coin.setPointerCapture = setPointerCapture;
    coin.releasePointerCapture = releasePointerCapture;
    Object.defineProperty(coin, "hasPointerCapture", { value: undefined });

    fireEvent.pointerDown(coin, { pointerId: 4 });
    fireEvent.pointerUp(coin, { pointerId: 4 });

    expect(setPointerCapture).toHaveBeenCalledWith(4);
    expect(releasePointerCapture).toHaveBeenCalledWith(4);
    expect(onCollect).toHaveBeenCalledWith("coin-a");
  });

  it("does not release when capture was refused", () => {
    const onCollect = vi.fn();
    const view = render(
      <svg>
        <SilverCoinMark id="coin-a" x={10} y={20} label="Silver" onCollect={onCollect} />
      </svg>,
    );
    const coin = view.getByTestId("village-silver-coin");
    const releasePointerCapture = vi.fn();
    coin.setPointerCapture = () => {
      throw new Error("no capture");
    };
    coin.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(coin, { pointerId: 4 });
    fireEvent.pointerUp(coin, { pointerId: 4 });

    expect(releasePointerCapture).not.toHaveBeenCalled();
    expect(onCollect).toHaveBeenCalledWith("coin-a");
  });

  it("ignores a release that did not start on the coin", () => {
    const onCollect = vi.fn();
    const view = render(
      <svg>
        <SilverCoinMark id="coin-a" x={10} y={20} label="Silver" onCollect={onCollect} />
      </svg>,
    );
    fireEvent.pointerUp(view.getByTestId("village-silver-coin"));
    expect(onCollect).not.toHaveBeenCalled();
  });
});
