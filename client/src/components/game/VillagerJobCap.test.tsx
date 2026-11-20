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
    expect(cap.className).toContain("text-yellow-600/80");
    expect(screen.getByTestId("villager-job-cap-number-hunter").className).not.toContain(
      "villager-cap-flash",
    );
  });

  it("uses muted gray below capacity and a softer yellow when full", () => {
    const { rerender } = render(
      <VillagerJobCap
        jobId="hunter"
        cap={10}
        atCap={false}
        className={className}
      />,
    );

    expect(screen.getByTestId("villager-job-cap-hunter").className).toContain(
      "text-muted-foreground",
    );
    expect(
      screen.getByTestId("villager-job-cap-hunter").className,
    ).not.toContain("text-yellow-600/80");

    rerender(
      <VillagerJobCap jobId="hunter" cap={10} atCap className={className} />,
    );

    expect(screen.getByTestId("villager-job-cap-hunter").className).toContain(
      "text-yellow-600/80",
    );
    expect(
      screen.getByTestId("villager-job-cap-hunter").className,
    ).not.toContain("text-muted-foreground");
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

  it("flashes three times when asked while the cap stays full", () => {
    const { rerender } = render(
      <VillagerJobCap
        jobId="hunter"
        cap={10}
        atCap
        flashNonce={0}
        className={className}
      />,
    );

    expect(
      screen.getByTestId("villager-job-cap-number-hunter").className,
    ).not.toContain("villager-cap-flash");

    rerender(
      <VillagerJobCap
        jobId="hunter"
        cap={10}
        atCap
        flashNonce={1}
        className={className}
      />,
    );

    const first = screen.getByTestId("villager-job-cap-number-hunter");
    expect(first).toHaveTextContent("10");
    expect(first.className).toContain("villager-cap-flash");

    rerender(
      <VillagerJobCap
        jobId="hunter"
        cap={10}
        atCap
        flashNonce={2}
        className={className}
      />,
    );

    const second = screen.getByTestId("villager-job-cap-number-hunter");
    expect(second).not.toBe(first);
    expect(second.className).toContain("villager-cap-flash");
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
