/**
 * Unit tests for utility functions
 * Run with: npx jest (after installing jest)
 */

import {
  formatDate,
  getDaysRemaining,
  getMembershipStatusColor,
  cn,
} from "../lib/utils";

describe("getDaysRemaining", () => {
  it("returns positive days for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysRemaining(future)).toBeGreaterThan(0);
  });

  it("returns negative for past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysRemaining(past)).toBeLessThanOrEqual(0);
  });

  it("handles string dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    expect(getDaysRemaining(future.toISOString())).toBeGreaterThan(0);
  });
});

describe("getMembershipStatusColor", () => {
  it("returns success for ACTIVE", () => {
    expect(getMembershipStatusColor("ACTIVE")).toBe("success");
  });

  it("returns danger for EXPIRED", () => {
    expect(getMembershipStatusColor("EXPIRED")).toBe("danger");
  });

  it("returns warning for PENDING", () => {
    expect(getMembershipStatusColor("PENDING")).toBe("warning");
  });

  it("returns default for CANCELLED", () => {
    expect(getMembershipStatusColor("CANCELLED")).toBe("default");
  });

  it("returns default for unknown status", () => {
    expect(getMembershipStatusColor("UNKNOWN")).toBe("default");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("px-4", "py-2", "text-sm");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
    expect(result).toContain("text-sm");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "not-included", "included");
    expect(result).toContain("base");
    expect(result).toContain("included");
    expect(result).not.toContain("not-included");
  });

  it("deduplicates conflicting tailwind classes", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });
});
