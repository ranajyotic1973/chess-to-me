import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  getOtbTrackingFilePath,
  readOtbTracking,
  writeOtbTracking,
  scanOtbFiles,
  computeOverallPercent,
} from "./otbImport";

describe("getOtbTrackingFilePath", () => {
  test("returns path inside chess-to-me subdirectory", () => {
    const result = getOtbTrackingFilePath("/some/userData");
    expect(result).toBe(path.join("/some/userData", "chess-to-me", "imported-otb-files.json"));
  });
});

describe("readOtbTracking", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otb-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array when tracking file does not exist", () => {
    const result = readOtbTracking(tmpDir);
    expect(result).toEqual([]);
  });

  test("returns parsed array from existing tracking file", () => {
    const trackingDir = path.join(tmpDir, "chess-to-me");
    fs.mkdirSync(trackingDir, { recursive: true });
    fs.writeFileSync(
      path.join(trackingDir, "imported-otb-files.json"),
      JSON.stringify(["OTB_2400_1900-2000.7z", "OTB_2400_2001-2010.7z"])
    );
    const result = readOtbTracking(tmpDir);
    expect(result).toEqual(["OTB_2400_1900-2000.7z", "OTB_2400_2001-2010.7z"]);
  });

  test("returns empty array when file contains invalid JSON", () => {
    const trackingDir = path.join(tmpDir, "chess-to-me");
    fs.mkdirSync(trackingDir, { recursive: true });
    fs.writeFileSync(
      path.join(trackingDir, "imported-otb-files.json"),
      "not-valid-json"
    );
    const result = readOtbTracking(tmpDir);
    expect(result).toEqual([]);
  });

  test("returns empty array when file contains non-array JSON", () => {
    const trackingDir = path.join(tmpDir, "chess-to-me");
    fs.mkdirSync(trackingDir, { recursive: true });
    fs.writeFileSync(
      path.join(trackingDir, "imported-otb-files.json"),
      JSON.stringify({ foo: "bar" })
    );
    const result = readOtbTracking(tmpDir);
    expect(result).toEqual([]);
  });
});

describe("writeOtbTracking", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otb-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates the tracking file with provided names", () => {
    const names = ["OTB_2400_1900-2000.7z"];
    writeOtbTracking(tmpDir, names);
    const trackingPath = getOtbTrackingFilePath(tmpDir);
    expect(fs.existsSync(trackingPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(trackingPath, "utf-8"));
    expect(parsed).toEqual(names);
  });

  test("creates parent directory if it does not exist", () => {
    const nestedDir = path.join(tmpDir, "nested", "userData");
    const names = ["OTB_test.7z"];
    writeOtbTracking(nestedDir, names);
    const trackingPath = getOtbTrackingFilePath(nestedDir);
    expect(fs.existsSync(trackingPath)).toBe(true);
  });

  test("overwrites existing tracking file", () => {
    writeOtbTracking(tmpDir, ["first.7z"]);
    writeOtbTracking(tmpDir, ["second.7z", "third.7z"]);
    const result = readOtbTracking(tmpDir);
    expect(result).toEqual(["second.7z", "third.7z"]);
  });
});

describe("scanOtbFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otb-scan-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns only *OTB*.7z files", () => {
    fs.writeFileSync(path.join(tmpDir, "OTB_2400_1900-2000.7z"), "");
    fs.writeFileSync(path.join(tmpDir, "OTB_2400_2001-2010.7z"), "");
    fs.writeFileSync(path.join(tmpDir, "readme.txt"), "");
    fs.writeFileSync(path.join(tmpDir, "other.7z"), "");
    const result = scanOtbFiles(tmpDir);
    const basenames = result.map(f => path.basename(f));
    expect(basenames).toContain("OTB_2400_1900-2000.7z");
    expect(basenames).toContain("OTB_2400_2001-2010.7z");
    expect(basenames).not.toContain("readme.txt");
    expect(basenames).not.toContain("other.7z");
  });

  test("matches OTB pattern case-insensitively", () => {
    fs.writeFileSync(path.join(tmpDir, "otb_lowercase.7z"), "");
    fs.writeFileSync(path.join(tmpDir, "OTB_uppercase.7z"), "");
    const result = scanOtbFiles(tmpDir);
    expect(result).toHaveLength(2);
  });

  test("returns empty array when no matching files exist", () => {
    fs.writeFileSync(path.join(tmpDir, "games.pgn"), "");
    const result = scanOtbFiles(tmpDir);
    expect(result).toEqual([]);
  });

  test("returns sorted results", () => {
    fs.writeFileSync(path.join(tmpDir, "OTB_b.7z"), "");
    fs.writeFileSync(path.join(tmpDir, "OTB_a.7z"), "");
    const result = scanOtbFiles(tmpDir);
    const basenames = result.map(f => path.basename(f));
    expect(basenames[0]).toBe("OTB_a.7z");
    expect(basenames[1]).toBe("OTB_b.7z");
  });

  test("already-tracked files can be filtered by caller", () => {
    fs.writeFileSync(path.join(tmpDir, "OTB_2400_1900-2000.7z"), "");
    fs.writeFileSync(path.join(tmpDir, "OTB_2400_2001-2010.7z"), "");
    const allFiles = scanOtbFiles(tmpDir);
    const tracked = new Set(["OTB_2400_1900-2000.7z"]);
    const toImport = allFiles.filter(f => !tracked.has(path.basename(f)));
    expect(toImport).toHaveLength(1);
    expect(path.basename(toImport[0])).toBe("OTB_2400_2001-2010.7z");
  });
});

describe("computeOverallPercent", () => {
  test("extraction phase scales across the first half", () => {
    expect(computeOverallPercent("extracting", 3, 10)).toBe(15);
  });

  test("import phase scales across the second half", () => {
    expect(computeOverallPercent("importing", 7, 10)).toBe(85);
  });

  test("reaches 50 at the end of extraction", () => {
    expect(computeOverallPercent("extracting", 10, 10)).toBe(50);
  });

  test("reaches 100 at the end of import", () => {
    expect(computeOverallPercent("importing", 10, 10)).toBe(100);
  });

  test("returns 0 when total is 0", () => {
    expect(computeOverallPercent("extracting", 0, 0)).toBe(0);
  });

  test("a full extract-then-import run is monotonically non-decreasing", () => {
    const total = 7;
    const values: number[] = [];
    for (let i = 1; i <= total; i++) values.push(computeOverallPercent("extracting", i, total));
    for (let i = 1; i <= total; i++) values.push(computeOverallPercent("importing", i, total));

    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
    expect(values[values.length - 1]).toBe(100);
  });
});
