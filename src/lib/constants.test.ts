import { describe, it, expect } from "vitest";
import { FOCUS_MODES } from "./constants";

describe("FOCUS_MODES", () => {
  it("defines short focus as 25 min work and 5 min break", () => {
    expect(FOCUS_MODES.short.workMinutes).toBe(25);
    expect(FOCUS_MODES.short.breakMinutes).toBe(5);
    expect(FOCUS_MODES.short.label).toBe("Short Focus");
  });

  it("defines average focus as 50 min work and 10 min break", () => {
    expect(FOCUS_MODES.average.workMinutes).toBe(50);
    expect(FOCUS_MODES.average.breakMinutes).toBe(10);
    expect(FOCUS_MODES.average.label).toBe("Average Focus");
  });

  it("defines deep focus as 90 min work and 20 min break", () => {
    expect(FOCUS_MODES.deep.workMinutes).toBe(90);
    expect(FOCUS_MODES.deep.breakMinutes).toBe(20);
    expect(FOCUS_MODES.deep.label).toBe("Deep Focus");
  });
});
