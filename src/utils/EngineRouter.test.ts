import { EngineRouter } from "./EngineRouter";

const STOCKFISH_PATH = "/path/to/stockfish";
const LC0_PATH = "/path/to/lc0";

function setupAPI(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const api = {
    ensureEngineRunning: jest.fn().mockResolvedValue(undefined),
    analyzePosition: jest.fn().mockResolvedValue({ ok: true, analysis: [] }),
    stopEngine: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
  (global as any).window.electronAPI = api;
  return api;
}

describe("EngineRouter — constructor and basic setters", () => {
  test("initialises with given engine and paths", () => {
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    expect(router.selectedEngine).toBe("stockfish");
    expect(router.enginePaths.stockfish).toBe(STOCKFISH_PATH);
    expect(router.currentEngine).toBeNull();
  });

  test("defaults to lc0 when no args given", () => {
    const router = new EngineRouter();
    expect(router.selectedEngine).toBe("lc0");
  });

  test("setSelectedEngine updates selectedEngine", () => {
    const router = new EngineRouter("stockfish", {});
    router.setSelectedEngine("lc0", LC0_PATH);
    expect(router.selectedEngine).toBe("lc0");
    expect(router.enginePaths.lc0).toBe(LC0_PATH);
  });

  test("setEnginePaths merges additional paths", () => {
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    router.setEnginePaths({ lc0: LC0_PATH });
    expect(router.enginePaths.stockfish).toBe(STOCKFISH_PATH);
    expect(router.enginePaths.lc0).toBe(LC0_PATH);
  });
});

describe("EngineRouter — getStatus", () => {
  test("reports engineRunning:false before switchEngine", () => {
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    const status = router.getStatus();
    expect(status.engineRunning).toBe(false);
    expect(status.currentEngineStatus).toBeNull();
  });

  test("reports selected engine name", () => {
    const router = new EngineRouter("lc0", {});
    expect(router.getStatus().selectedEngine).toBe("lc0");
  });
});

describe("EngineRouter — switchEngine", () => {
  test("switches to Stockfish and calls init", async () => {
    const api = setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");

    expect(api.ensureEngineRunning).toHaveBeenCalledWith({
      engine: "stockfish",
      path: STOCKFISH_PATH
    });
    expect(router.currentEngine).not.toBeNull();
  });

  test("switches to LC0 and calls init", async () => {
    const api = setupAPI();
    const router = new EngineRouter("lc0", { lc0: LC0_PATH });
    await router.switchEngine("lc0");

    expect(api.ensureEngineRunning).toHaveBeenCalledWith({
      engine: "lc0",
      path: LC0_PATH
    });
  });

  test("destroys previous engine before switching", async () => {
    const api = setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH, lc0: LC0_PATH });
    await router.switchEngine("stockfish");
    await router.switchEngine("lc0");

    expect(api.stopEngine).toHaveBeenCalledWith({ engine: "stockfish" });
    expect(api.ensureEngineRunning).toHaveBeenCalledWith({ engine: "lc0", path: LC0_PATH });
  });

  test("throws when no path configured for engine", async () => {
    setupAPI();
    const router = new EngineRouter("stockfish", {}); // no paths
    await expect(router.switchEngine("stockfish")).rejects.toThrow("No path configured");
  });

  test("throws for unknown engine name", async () => {
    setupAPI();
    const router = new EngineRouter("stockfish", { custom: "/bin/custom" } as any);
    await expect(router.switchEngine("custom" as any)).rejects.toThrow("Unknown engine");
  });

  test("sets currentEngine to null and re-throws when init fails", async () => {
    setupAPI({ ensureEngineRunning: jest.fn().mockRejectedValue(new Error("Start failed")) });
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await expect(router.switchEngine("stockfish")).rejects.toThrow("Failed to initialize Stockfish");
    expect(router.currentEngine).toBeNull();
  });

  test("reports engineRunning:true after successful switch", async () => {
    setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");
    expect(router.getStatus().engineRunning).toBe(true);
  });

  test("getStatus.currentEngineStatus is non-null after switch", async () => {
    setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");
    const status = router.getStatus();
    expect(status.currentEngineStatus).not.toBeNull();
    expect((status.currentEngineStatus as any).name).toBe("Stockfish");
  });
});

describe("EngineRouter — analyze", () => {
  test("throws when no engine initialized", async () => {
    const router = new EngineRouter("stockfish", {});
    await expect(router.analyze("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"))
      .rejects.toThrow("No engine currently initialized");
  });

  test("delegates analyze to current engine", async () => {
    const api = setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");
    await router.analyze("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 12, 2);

    expect(api.analyzePosition).toHaveBeenCalledWith({
      engine: "stockfish",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      depth: 12,
      multiPv: 2
    });
  });
});

describe("EngineRouter — stop and destroy", () => {
  test("stop is no-op when no engine initialized", async () => {
    const router = new EngineRouter("stockfish", {});
    await expect(router.stop()).resolves.toBeUndefined();
  });

  test("destroy is no-op when no engine initialized", async () => {
    const router = new EngineRouter("stockfish", {});
    await expect(router.destroy()).resolves.toBeUndefined();
  });

  test("stop calls stopEngine on current engine", async () => {
    const api = setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");
    await router.stop();
    expect(api.stopEngine).toHaveBeenCalledWith({ engine: "stockfish" });
  });

  test("destroy clears currentEngine", async () => {
    setupAPI();
    const router = new EngineRouter("stockfish", { stockfish: STOCKFISH_PATH });
    await router.switchEngine("stockfish");
    await router.destroy();
    expect(router.currentEngine).toBeNull();
    expect(router.getStatus().engineRunning).toBe(false);
  });
});
