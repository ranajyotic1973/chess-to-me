declare global {
  namespace NodeJS {
    interface Global {
      window: {
        electronAPI: {
          ensureEngineRunning: jest.Mock;
          analyzePosition: jest.Mock;
          stopEngine: jest.Mock;
          discoverEngines: jest.Mock;
          detectEngine: jest.Mock;
          validateEngine: jest.Mock;
        };
      };
    }
  }
}

global.window = {
  electronAPI: {
    ensureEngineRunning: jest.fn(),
    analyzePosition: jest.fn(),
    stopEngine: jest.fn(),
    discoverEngines: jest.fn(),
    detectEngine: jest.fn(),
    validateEngine: jest.fn()
  }
};
