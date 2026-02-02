import { colors } from "./styles/theme";
import { traces } from "./traces";

console.log("Trace steps:", traces[0].steps.length);

export const App: React.FC = () => {
  return (
    <div style={{ height: "100%", background: colors.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: colors.textBright }}>CS202 Stack Frame Visualizer</h1>
    </div>
  );
};
