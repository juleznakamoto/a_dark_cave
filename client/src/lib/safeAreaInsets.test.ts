import { describe, expect, it } from "vitest";
import {
  collisionPaddingClearOfSafeArea,
  dialogFrameClearOfSafeArea,
  ZERO_SAFE_AREA,
} from "./safeAreaInsets";

const NOTCH = { top: 59, right: 0, bottom: 34, left: 0 };

describe("collisionPaddingClearOfSafeArea", () => {
  it("leaves a uniform pad alone when there is no notch", () => {
    expect(collisionPaddingClearOfSafeArea(10, ZERO_SAFE_AREA)).toEqual({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
  });

  it("raises only the edges the notch or home indicator covers", () => {
    expect(collisionPaddingClearOfSafeArea(10, NOTCH)).toEqual({
      top: 59,
      right: 10,
      bottom: 34,
      left: 10,
    });
  });

  it("keeps a caller pad that is already past the inset", () => {
    expect(
      collisionPaddingClearOfSafeArea({ top: 80, left: 4 }, NOTCH, 10),
    ).toEqual({
      top: 80,
      right: 10,
      bottom: 34,
      left: 4,
    });
  });
});

describe("dialogFrameClearOfSafeArea", () => {
  it("does nothing when the screen has no safe area", () => {
    expect(dialogFrameClearOfSafeArea("max-h-[80vh]", ZERO_SAFE_AREA)).toBeUndefined();
  });

  it("centers under the notch and keeps the smaller height cap", () => {
    expect(dialogFrameClearOfSafeArea("z-[70] max-h-[80vh] gap-2", NOTCH)).toEqual({
      top: "calc(50% + 12.5px)",
      maxHeight: "min(80vh, calc(100dvh - 59px - 34px))",
    });
  });

  it("uses the last authored max height", () => {
    expect(
      dialogFrameClearOfSafeArea("max-h-[90vh] max-h-[min(80dvh,80vh)]", NOTCH)
        ?.maxHeight,
    ).toBe("min(min(80dvh,80vh), calc(100dvh - 59px - 34px))");
  });
});
