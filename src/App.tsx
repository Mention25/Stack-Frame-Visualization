import { useReducer } from "react";
import { appReducer, initialState } from "./state";
import { traces } from "./traces";
import { colors } from "./styles/theme";
import { CCodePanel } from "./components/CCodePanel";

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const trace = traces.find((t) => t.id === state.activeTraceId) ?? traces[0];
  const step = trace.steps[state.currentStep];

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
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textBright,
          flexDirection: "column",
          gap: 16,
        }}>
          <h2>Step {state.currentStep + 1} / {trace.steps.length}</h2>
          <h1>{step.title}</h1>
          <p style={{ color: colors.textDim }}>{step.description}</p>
        </div>
      </div>
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        padding: 16,
      }}>
        <button onClick={() => dispatch({ type: "FIRST_STEP" })}>|&#9665;</button>
        <button onClick={() => dispatch({ type: "PREV_STEP" })}>&#9665; Prev</button>
        <button onClick={() => dispatch({ type: "NEXT_STEP", maxStep: trace.steps.length - 1 })}>Next &#9655;</button>
        <button onClick={() => dispatch({ type: "LAST_STEP", maxStep: trace.steps.length - 1 })}>&#9655;|</button>
      </div>
    </div>
  );
};
