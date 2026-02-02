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
    }, 1000 / state.playbackSpeed);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.playbackSpeed, maxStep]);

  return (
    <div style={{
      height: "100%",
      background: colors.bgLight,
      display: "flex",
      flexDirection: "column",
      padding: 16,
    }}>
      <div style={{
        flex: 1,
        display: "flex",
        gap: 16,
        overflow: "hidden",
      }}>
        <div style={{ width: 280 }}>
          <CCodePanel
            cCode={trace.cCode}
            activeLine={step.cCodeLine}
            currentFunction={step.currentFunction}
          />
        </div>
        <div style={{ width: 320 }}>
          <AsmPanel
            asmCode={trace.asmCode}
            activeLine={step.highlightedAsmLine}
            currentFunction={step.currentFunction}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div style={{ flex: 1, overflow: "hidden" }}>
            <StackView
              stack={step.stack}
              rsp={step.registers.rsp}
              rbp={step.registers.rbp}
              currentFunction={step.currentFunction}
            />
          </div>
        </div>
      </div>
      <TransportBar
        state={state}
        dispatch={dispatch}
        maxStep={maxStep}
        phases={trace.phases}
      />
    </div>
  );
};
