import type { CodeLine } from "../types";
import { colors } from "../styles/theme";

type Props = {
  cCode: CodeLine[];
  activeLine?: number;
  currentFunction: string;
};

export const CCodePanel: React.FC<Props> = ({ cCode, activeLine, currentFunction }) => {
  return (
    <div
      style={{
        background: colors.bgPanel,
        borderRadius: 8,
        padding: 8,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.stackBorder}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.stackHighlight,
          marginBottom: 8,
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        C SOURCE
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {cCode.map((line) => {
          const isActive = activeLine === line.num;
          const isFnLine = line.text.includes(`${currentFunction}(`);
          return (
            <div
              key={line.num}
              style={{
                display: "flex",
                gap: 8,
                padding: "2px 4px",
                borderRadius: 3,
                background: isActive ? "rgba(0, 217, 255, 0.15)" : "transparent",
                borderLeft: isActive ? `3px solid ${colors.stackHighlight}` : "3px solid transparent",
              }}
            >
              <span
                style={{
                  color: colors.comment,
                  width: 24,
                  textAlign: "right",
                  flexShrink: 0,
                  fontSize: 11,
                }}
              >
                {line.num}
              </span>
              <span
                style={{
                  color: isActive ? colors.textBright : colors.textDim,
                  paddingLeft: (line.indent ?? 0) * 16,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {colorizeC(line.text)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function colorizeC(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const keywords = ["int", "uint64_t", "void", "return"];

  while (remaining.length > 0) {
    let matched = false;

    // Check for keywords
    for (const kw of keywords) {
      if (remaining.startsWith(kw) && (remaining.length === kw.length || !/\w/.test(remaining[kw.length]))) {
        parts.push(<span key={key++} style={{ color: colors.keyword }}>{kw}</span>);
        remaining = remaining.slice(kw.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check for comment
      const commentIdx = remaining.indexOf("//");
      if (commentIdx === 0) {
        parts.push(<span key={key++} style={{ color: colors.registerChanged }}>{remaining}</span>);
        remaining = "";
      }
      // Check for string
      else if (remaining[0] === '"') {
        const end = remaining.indexOf('"', 1);
        if (end !== -1) {
          const str = remaining.slice(0, end + 1);
          parts.push(<span key={key++} style={{ color: colors.string }}>{str}</span>);
          remaining = remaining.slice(end + 1);
        } else {
          parts.push(<span key={key++}>{remaining[0]}</span>);
          remaining = remaining.slice(1);
        }
      } else {
        parts.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }
  }

  return <>{parts}</>;
}
