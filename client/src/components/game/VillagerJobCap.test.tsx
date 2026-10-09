/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VillagerJobCap } from "./VillagerJobCap";

const className = "cap";

describe("VillagerJobCap", () => {
  it("does not flash the cap that is already on screen", () => {
    render(
      <VillagerJobCap jobId="hunter" cap={10} atCap className={className} />,
    );

    const cap = screen.getByTestId("villager-job-cap-hunter");
    expect(cap).toHaveTextContent("/10");
    expect(screen.getByTestId("villager-job-cap-number-hunter").className).not.toContain(
      "villager-cap-flash",
    );
  });

  it("flashes three times when an Insight upgrade raises the cap", () => {
    const { rerender } = render(
      <VillagerJobCap jobId="hunter" cap={10} atCap className={className} />,
    );

    rerender(
      <VillagerJobCap
        jobId="hunter"
        cap={20}
        atCap={false}
        className={className}
      />,
    );

    const cap = screen.getByTestId("villager-job-cap-hunter");
    const number = screen.getByTestId("villager-job-cap-number-hunter");
    expect(cap).toHaveTextContent("/20");
    expect(cap.className).not.toContain("villager-cap-flash");
    expect(cap.className).toContain("text-muted-foreground");
    expect(number).toHaveTextContent("20");
    expect(number.className).toContain("villager-cap-flash");
  });

  it("does not flash when the cap stays the same or drops", () => {
    const { rerender } = render(
      <VillagerJobCap jobId="hunter" cap={20} atCap={false} className={className} />,
    );

    rerender(
      <VillagerJobCap jobId="hunter" cap={20} atCap={false} className={className} />,
    );
    expect(
      screen.getByTestId("villager-job-cap-number-hunter").className,
    ).not.toContain("villager-cap-flash");

    rerender(
      <VillagerJobCap jobId="hunter" cap={10} atCap className={className} />,
    );
    expect(
      screen.getByTestId("villager-job-cap-number-hunter").className,
    ).not.toContain("villager-cap-flash");
  });
});
