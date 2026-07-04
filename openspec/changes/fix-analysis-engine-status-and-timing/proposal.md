## Why

The analysis engine features are broken: spinners don't display correctly, status bar messages aren't shown, and the LLM analysis starts before the engine finishes, creating race conditions and poor user experience. These issues prevent users from understanding what the application is doing during analysis operations.

## What Changes

- Fix spinner/loading state display for engine analysis so users see visual feedback during computation
- Restore status bar message display for engine analysis progress and completion states
- Fix spinner/loading state display for LLM analysis 
- Fix status bar message display for LLM analysis
- Ensure LLM analysis waits for engine analysis to complete before starting (prevent race conditions)
- Establish clear state management and message flow for both engine and LLM analysis operations

## Capabilities

### Modified Capabilities

- `analysis-and-llm-guidance`: Fix state management for engine analysis spinner, status messages, and timing to ensure proper sequencing between engine and LLM analysis
- `analysis-process-orchestration`: Implement proper synchronization and messaging between engine and LLM analysis phases

## Impact

- **Files affected**: `src/App.tsx` (state management and orchestration), `src/components/StatusBanner.tsx` (status display), Electron main process IPC handlers for analysis
- **User-facing**: Analysis operations will show proper loading spinners and status messages; race conditions between engine and LLM analysis will be eliminated
- **Internal**: Redux/state management layer needs review to ensure correct message and spinner state transitions
