## Context

The application manages chess analysis through two sequential phases:
1. **Engine Analysis Phase**: Stockfish/LC0 computes the best moves and evaluations
2. **LLM Analysis Phase**: Claude/Ollama generates explanations for the engine's findings

Currently, both phases share a single `isAnalysisRunning` state and `analysisStatus` message, making it impossible to:
- Track which phase is active
- Display accurate progress messages
- Prevent LLM analysis from starting before engine finishes
- Show proper spinners during each phase

The status bar (StatusBanner.tsx) receives `analysisStatus` but it's not being properly updated during analysis operations.

## Goals / Non-Goals

**Goals:**
- Establish separate, explicit state tracking for engine and LLM analysis phases
- Update status messages at each phase transition and completion
- Ensure engine analysis completes fully before LLM analysis begins
- Display spinners correctly for both engine and LLM operations
- Make the orchestration logic clear and maintainable

**Non-Goals:**
- Redesign the entire Redux/state management system
- Change UI layout or component structure (only fix existing components)
- Modify the actual analysis algorithm or LLM prompts
- Add new analysis capabilities or modes

## Decisions

### Decision 1: Separate State Variables for Engine and LLM Analysis
**Choice**: Create distinct state variables: `engineAnalysisStatus` and `llmAnalysisStatus` (or phases within an analysis state machine)

**Rationale**: Single `isAnalysisRunning` and `analysisStatus` conflate two independent operations. Separate variables allow:
- Displaying engine progress while LLM is pending
- Showing appropriate UI feedback for each phase
- Clearer conditional logic for phase dependencies

**Alternatives Considered**:
- A single `analysisPhase` enum (e.g., 'idle' | 'engine-running' | 'engine-done' | 'llm-running') → More compact but harder to extend if phases become parallel in future
- Redux slices for each phase → Too complex for this fix

### Decision 2: Explicit Phase Transitions with Message Updates
**Choice**: Update `analysisStatus` / `statusMessage` at each state change:
- "Analyzing with [engine name]..." when engine starts
- "Engine analysis complete. Generating explanation..." when engine finishes and LLM starts
- Clear message when analysis fully completes

**Rationale**: Users need to know what's happening at each step. Current code doesn't emit status updates reliably.

**Alternatives Considered**:
- Silent phase transitions → Users see spinner but no context
- Combine both messages into one → Loses granularity

### Decision 3: Engine Completion Gate Before LLM
**Choice**: Check that engine analysis has valid results before calling LLM. Prevent LLM call if `analysisLines.length === 0` or engine status is not "done".

**Rationale**: Race conditions occur because LLM and engine calls are not coordinated. Engine responses are async and may arrive after LLM is called.

**Alternatives Considered**:
- Promise-based orchestration → Works but adds complexity to existing code
- Debounce/delay LLM call → Fragile, timing-dependent

### Decision 4: Spinner Binding
**Choice**: Continue using `isAnalysisRunning` but ensure it accurately reflects whether ANY analysis phase (engine or LLM) is active. Update it at phase start and clear only when all phases complete.

**Rationale**: Minimal change to existing UI (AnalysisBoard already receives and uses `isAnalysisRunning`). Just need to manage the flag correctly.

**Alternatives Considered**:
- Pass separate `isEngineRunning` and `isLlmRunning` to UI → Requires component changes
- Create a "global" loading state → Over-engineering for this fix

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Multiple state updates during phase transitions could cause renders | Use a single state update/batch per transition; consider useCallback to memoize orchestration logic |
| Engine analysis fails silently, LLM never starts | Add error handling: if engine fails or times out, update status to "Engine analysis failed" and stop pipeline |
| LLM still starts before engine finishes due to async timing | Add explicit check in the LLM-trigger function: guard with `engineAnalysisDone && analysisLines.length > 0` |
| StatusBanner not re-rendering when analysisStatus changes | Verify React key/dependency array in App.tsx; ensure status updates use setState correctly |

## Migration Plan

1. **Phase 1**: Add separate state tracking for engine vs LLM phases (modify `src/App.tsx`)
2. **Phase 2**: Update status messages at each transition point in the analysis flow
3. **Phase 3**: Add guard logic to prevent LLM from starting until engine completes
4. **Phase 4**: Test end-to-end: verify spinners show/hide, status messages display, and LLM waits for engine
5. **Rollback**: Revert `src/App.tsx` state management changes; features degrade to broken but no data loss

## Open Questions

- Should engine timeout update status with "Timed out" message, or fail silently? → Recommend: explicit timeout message
- Should cancelled analysis (user clicks stop) clear status immediately or show "Analysis cancelled"? → Recommend: show brief "Cancelled" message then clear
