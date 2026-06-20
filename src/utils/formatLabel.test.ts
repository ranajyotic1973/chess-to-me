import { formatFieldLabel } from "./formatLabel";

describe("formatFieldLabel", () => {
  test("converts snake_case to Title Case", () => {
    expect(formatFieldLabel("opening_name")).toBe("Opening Name");
  });

  test("capitalizes single-word fields", () => {
    expect(formatFieldLabel("story")).toBe("Story");
  });

  test("handles multiple underscores", () => {
    expect(formatFieldLabel("first_move_white")).toBe("First Move White");
  });

  test("ignores leading/trailing underscores", () => {
    expect(formatFieldLabel("_eco_code_")).toBe("Eco Code");
  });

  test("returns empty string for empty input", () => {
    expect(formatFieldLabel("")).toBe("");
  });
});
