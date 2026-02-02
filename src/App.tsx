import { colors } from "./styles/theme";

export const App: React.FC = () => {
  return (
    <div style={{ height: "100%", background: colors.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: colors.textBright }}>CS202 Stack Frame Visualizer</h1>
    </div>
  );
};
