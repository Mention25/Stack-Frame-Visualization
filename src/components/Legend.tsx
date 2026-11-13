import { colors, frameColor } from "../styles/theme";
export function Legend({ names = ["main", "f", "g"] }: { names?: string[] }) {
  return <div style={{ background: colors.bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${colors.stackBorder}`, fontFamily: "monospace", fontSize: 11 }}>
    <div style={{ color: colors.textDim, marginBottom: 6, fontWeight: 700 }}>LEGEND</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {names.map(name => <div key={name} style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, background: frameColor(name), borderRadius: 2, flexShrink: 0 }} /><span style={{ overflowWrap: "anywhere" }}>{name}() frame</span></div>)}
      <div><b style={{ color: colors.registerChanged }}>%rsp</b> stack pointer</div><div><b style={{ color: colors.register }}>%rbp</b> frame pointer</div>
    </div>
  </div>;
}
