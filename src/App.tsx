import { useReducer, useEffect, useState } from "react";
import { appReducer, initialState } from "./state";
import { traces } from "./traces";
import { colors } from "./styles/theme";
import { Legend } from "./components/Legend";
import "./styles/classic.css";
import { AsmPanel } from "./components/AsmPanel";
import { StackView } from "./components/StackView";
import { RegisterPanel } from "./components/RegisterPanel";
import { NarrationBox } from "./components/NarrationBox";
import { TransportBar } from "./components/TransportBar";
import { ResizableGrid } from "./components/ResizableGrid";
import { AssemblyPlayground } from "./components/AssemblyPlayground";
import { StackLesson } from "./components/StackLesson";

// TraceSelector dropdown component
const TraceSelector: React.FC<{
  activeTraceId: string;
  dispatch: React.Dispatch<{ type: "SET_TRACE"; traceId: string }>;
}> = ({ activeTraceId, dispatch }) => (
  <select
    aria-label="Execution trace"
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

const GuidedDemo: React.FC = () => {
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
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, button, a")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
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
      className="visualizer-app classic-workspace"
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
          Stack Frame Visualization
        </div>
      </div>

      <aside className="demo-context" aria-label="演示用途与项目来源">
        <p>
          <strong>调用栈通用演示</strong> · 使用原项目的 main → f → g 独立教学示例。
          本页回放预设状态，地址与部分指令是教学示意，不运行或调试课程实验二进制。
          理解原理后，请用 GDB/GEF 在实际二进制中验证；实验结论以实际程序为准。
        </p>
        <p className="demo-credits">
          原作者 <a href="https://github.com/NickZhuxy">Nick Zhu (NickZhuxy)</a>
          {" · "}<a href="https://github.com/NickZhuxy/Stack-Frame-Visualization">原项目源码</a>
          {" · "}教学材料来源：<a href="https://cs.nyu.edu/~mwalfish/classes/26sp/index.html">Michael Walfish / NYU CS202</a>
          {" · "}部署维护：<a href="https://github.com/Mention25/Stack-Frame-Visualization">Mention25</a>
          {" · "}<a href={`${import.meta.env.BASE_URL}attribution.html`} target="_blank" rel="noopener noreferrer">来源与许可说明</a>
        </p>
      </aside>

      {/* Upstream three-column layout, with the C panel removed. */}
      <div className="classic-grid">
        <ResizableGrid storageKey="original-three-columns-v1">
          {/* Column 2: Assembly Panel */}
          <AsmPanel
            asmCode={trace.asmCode}
            activeLine={step.highlightedAsmLine}
            currentFunction={step.currentFunction}
          />

          {/* Column 3: Stack View */}
          <StackView
            stack={step.stack}
            rsp={Number(step.registers.rsp)}
            rbp={Number(step.registers.rbp)}
            currentFunction={step.currentFunction}
          />

          {/* Column 4: Registers + Narration + Legend */}
          <div className="classic-sidebar"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              height: "100%",
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
        </ResizableGrid>
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

export const App: React.FC = () => {
  const [mode, setMode] = useState("lesson");
  return <div className="workspace">
    <header className="mode-nav"><strong>调用栈可视化</strong><div className="mode-tabs" role="tablist" aria-label="演示模式">
      <button id="lesson-tab" role="tab" aria-selected={mode === "lesson"} aria-controls="mode-panel" onClick={() => setMode("lesson")}>调用栈入门</button>
      <button id="interactive-tab" role="tab" aria-selected={mode === "interactive"} aria-controls="mode-panel" onClick={() => setMode("interactive")}>输入汇编</button>
      <button id="guided-tab" role="tab" aria-selected={mode === "guided"} aria-controls="mode-panel" onClick={() => setMode("guided")}>原版示例</button>
    </div></header>
    <main className="mode-content" id="mode-panel" role="tabpanel" aria-labelledby={`${mode}-tab`}>
      {mode === "lesson" ? <StackLesson /> : mode === "interactive" ? <AssemblyPlayground /> : <GuidedDemo />}
    </main>
    <footer className="classic-footer">原作者 <a href="https://github.com/NickZhuxy/Stack-Frame-Visualization">Nick Zhu</a> · 扩展与维护 Mention25 · <a href={`${import.meta.env.BASE_URL}attribution.html`}>来源与许可</a></footer>
  </div>;
};
