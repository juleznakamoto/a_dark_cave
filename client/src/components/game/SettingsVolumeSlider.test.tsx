/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsVolumeSlider from "./SettingsVolumeSlider";

function stubTrack(slider: HTMLElement) {
  slider.getBoundingClientRect = () =>
    ({
      x: 100,
      y: 40,
      left: 100,
      top: 40,
      right: 316,
      bottom: 60,
      width: 216,
      height: 20,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

describe("SettingsVolumeSlider", () => {
  it("follows horizontal movement when the finger also moves up and down", () => {
    const onVolumeChange = vi.fn();
    render(
      <SettingsVolumeSlider
        label="Ambience"
        muted={false}
        volume={0.2}
        onVolumeChange={onVolumeChange}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Ambience" });
    stubTrack(slider);
    const hit = slider.parentElement;
    if (!hit) throw new Error("missing hit target");

    fireEvent.pointerDown(hit, {
      button: 0,
      pointerId: 3,
      clientX: 108,
      clientY: 50,
    });
    fireEvent.pointerMove(hit, {
      pointerId: 3,
      clientX: 208,
      clientY: 280,
    });
    fireEvent.pointerMove(hit, {
      pointerId: 3,
      clientX: 308,
      clientY: -120,
    });

    expect(onVolumeChange).toHaveBeenNthCalledWith(1, 0);
    expect(onVolumeChange).toHaveBeenNthCalledWith(2, 0.5);
    expect(onVolumeChange).toHaveBeenNthCalledWith(3, 1);
  });

  it("does not change volume while muted", () => {
    const onVolumeChange = vi.fn();
    render(
      <SettingsVolumeSlider
        label="Sound"
        muted
        volume={0.8}
        onVolumeChange={onVolumeChange}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Sound" });
    stubTrack(slider);
    const hit = slider.parentElement;
    if (!hit) throw new Error("missing hit target");
    fireEvent.pointerDown(hit, {
      button: 0,
      pointerId: 1,
      clientX: 308,
      clientY: 50,
    });
    expect(onVolumeChange).not.toHaveBeenCalled();
    expect(slider).toBeDisabled();
    expect(slider).toHaveValue("0");
  });

  it("still accepts keyboard changes", () => {
    const onVolumeChange = vi.fn();
    render(
      <SettingsVolumeSlider
        label="Sound"
        muted={false}
        volume={0.4}
        onVolumeChange={onVolumeChange}
      />,
    );
    fireEvent.change(screen.getByRole("slider", { name: "Sound" }), {
      target: { value: "0.7" },
    });
    expect(onVolumeChange).toHaveBeenCalledWith(0.7);
  });
});
