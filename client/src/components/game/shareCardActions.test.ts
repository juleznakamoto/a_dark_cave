/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { withAppStoreLink } from "@/lib/appStore";
import {
  copyShareCard,
  downloadShareCard,
  shareShareCard,
} from "./shareCardActions";

describe("share card actions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adds the App Store link to the share message", () => {
    expect(
      withAppStoreLink(
        "I'm 40% through A Dark Cave. Search for A Dark Cave in the App Store",
        "https://apps.apple.com/app/id1",
      ),
    ).toBe(
      "I'm 40% through A Dark Cave. Search for A Dark Cave in the App Store https://apps.apple.com/app/id1",
    );
    expect(withAppStoreLink("I'm 40% through A Dark Cave.", "  ")).toBe(
      "I'm 40% through A Dark Cave.",
    );
  });

  it("downloads the card as a png", () => {
    let fileName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    downloadShareCard(new Blob(["png"], { type: "image/png" }));
    expect(fileName).toBe("a-dark-cave.png");
  });

  it("copies the png in the tap, before the image promise settles", async () => {
    const write = vi.fn(async () => undefined);
    class Item {
      constructor(public data: Record<string, Promise<Blob>>) {}
    }
    vi.stubGlobal("ClipboardItem", Item);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });

    let resolveBlob: (blob: Blob) => void = () => undefined;
    const pending = new Promise<Blob | null>((resolve) => {
      resolveBlob = resolve;
    });
    const copying = copyShareCard(pending);
    expect(write).toHaveBeenCalledTimes(1);

    resolveBlob(new Blob(["png"], { type: "image/png" }));
    await copying;
    const item = write.mock.calls[0][0][0] as Item;
    const png = await item.data["image/png"];
    expect(png.type).toBe("image/png");
  });

  it("opens the share sheet with the card and the message", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { share, canShare });

    await shareShareCard(
      new Blob(["png"], { type: "image/png" }),
      "I'm 10% through A Dark Cave. https://apps.apple.com/app/id1",
    );

    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.title).toBe("A Dark Cave");
    expect(payload.text).toContain("https://apps.apple.com/app/id1");
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0]?.name).toBe("a-dark-cave.png");
  });
});
