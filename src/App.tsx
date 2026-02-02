import { useReducer, useEffect } from "react";
import { appReducer, initialState } from "./state";
import { traces } from "./traces";
import { colors } from "./styles/theme";
import { CCodePanel } from "./components/CCodePanel";
import { AsmPanel } from "./components/AsmPanel";
import { StackView } from "./components/StackView";
import { RegisterPanel } from "./components/RegisterPanel";
import { NarrationBox } from "./components/NarrationBox";
import { TransportBar } from "./components/TransportBar";

// Legend component showing color coding for functions and pointers
const Legend: React.FC = () => (
  <div
    style={{
      background: colors.bg,
      borderRadius: 8,
      padding: "8px 12px",
      border: `1px solid ${colors.stackBorder}`,
      fontFamily: "monospace",
      fontSize: 10,
    }}
  >
    <div
      style={{
        color: colors.textDim,
        marginBottom: 4,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      LEGEND
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div
          style={{
            width: 10,
            height: 10,
            background: colors.mainColor,
            borderRadius: 2,
          }}
        />
        <span style={{ color: colors.text }}>main() frame</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div
          style={{
            width: 10,
            height: 10,
            background: colors.fColor,
            borderRadius: 2,
          }}
        />
        <span style={{ color: colors.text }}>f() frame</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div
          style={{
            width: 10,
            height: 10,
            background: colors.gColor,
            borderRadius: 2,
          }}
        />
        <span style={{ color: colors.text }}>g() frame</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            color: colors.registerChanged,
            fontWeight: 700,
          }}
        >
          %rsp
        </span>
        <span style={{ color: colors.text }}>stack pointer</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: colors.register, fontWeight: 700 }}>
          %rbp
        </span>
        <span style={{ color: colors.text }}>frame pointer</span>
      </div>
    </div>
  </div>
);

// TraceSelector dropdown component
const TraceSelector: React.FC<{
  activeTraceId: string;
  dispatch: React.Dispatch<{ type: "SET_TRACE"; traceId: string }>;
}> = ({ activeTraceId, dispatch }) => (
  <select
    value={activeTraceId}
    onChange={(e) => dispatch({ type: "SET_TRACE", traceId: e.target.value })}
    style={{
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.stackBorder}`,
      borderRadius: 4,
      padding: "6px 12px",
      fontFamily: "monospace",
      fontSize: 13,
      cursor: "pointer",
      outline: "none",
    }}
  >
    {traces.map((trace) => (
      <option key={trace.id} value={trace.id}>
        {trace.title}
      </option>
    ))}
  </select>
);

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const trace = traces.find((t) => t.id === state.activeTraceId) ?? traces[0];
  const step = trace.steps[state.currentStep];
  const prevStep = state.currentStep > 0 ? trace.steps[state.currentStep - 1] : undefined;
  const maxStep = trace.steps.length - 1;

  // Auto-play effect
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      dispatch({ type: "NEXT_STEP", maxStep });
    }, 1400 / state.playbackSpeed);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.playbackSpeed, maxStep]);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          dispatch({ type: "NEXT_STEP", maxStep });
          break;
        case "ArrowLeft":
          dispatch({ type: "PREV_STEP" });
          break;
        case " ":
          e.preventDefault();
          dispatch({ type: "TOGGLE_PLAY" });
          break;
        case "Home":
          dispatch({ type: "FIRST_STEP" });
          break;
        case "End":
          dispatch({ type: "LAST_STEP", maxStep });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxStep]);

  return (
    <div
      style={{
        height: "100%",
        background: colors.bgLight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.stackBorder}`,
          background: colors.bg,
        }}
      >
        <TraceSelector activeTraceId={state.activeTraceId} dispatch={dispatch} />
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 16,
            fontWeight: 700,
            color: colors.textBright,
          }}
        >
          CS202: Stack Frame Visualization
        </div>
      </div>

      {/* Main four-column grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "240px 300px 1fr 260px",
          gap: 12,
          padding: 12,
          overflow: "hidden",
        }}
      >
        {/* Column 1: C Code Panel */}
        <div style={{ overflow: "hidden" }}>
          <CCodePanel
            cCode={trace.cCode}
            activeLine={step.cCodeLine}
            currentFunction={step.currentFunction}
          />
        </div>

        {/* Column 2: Assembly Panel */}
        <div style={{ overflow: "hidden" }}>
          <AsmPanel
            asmCode={trace.asmCode}
            activeLine={step.highlightedAsmLine}
            currentFunction={step.currentFunction}
          />
        </div>

        {/* Column 3: Stack View */}
        <div style={{ overflow: "hidden" }}>
          <StackView
            stack={step.stack}
            rsp={step.registers.rsp}
            rbp={step.registers.rbp}
            currentFunction={step.currentFunction}
          />
        </div>

        {/* Column 4: Registers + Narration + Legend */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflow: "hidden",
          }}
        >
          <RegisterPanel
            registers={step.registers}
            prevRegisters={prevStep?.registers}
          />
          <NarrationBox
            stepNumber={state.currentStep}
            totalSteps={trace.steps.length}
            title={step.title}
            description={step.description}
          />
          <Legend />
        </div>
      </div>

      {/* Transport bar fixed at bottom */}
      <TransportBar
        state={state}
        dispatch={dispatch}
        maxStep={maxStep}
        phases={trace.phases}
      />
    </div>
  );
};
