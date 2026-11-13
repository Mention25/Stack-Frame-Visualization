import { useRef, useEffect } from "react";
import type { AsmLine } from "../types";
import { colors } from "../styles/theme";

type Props = {
  asmCode: AsmLine[];
  activeLine: number;
  currentFunction: string;
  nextLine?: number;
  toolbar?: React.ReactNode;
};

export const AsmPanel: React.FC<Props> = ({ asmCode, activeLine, currentFunction, nextLine, toolbar }) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = activeRef.current, parent = scrollRef.current;
    if (row && parent) {
      const box = row.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
      if (box.top < bounds.top || box.bottom > bounds.bottom) parent.scrollTop += box.top - bounds.top - parent.clientHeight / 3;
    }
  }, [activeLine]);

  return (
    <div
      className="upstream-assembly"
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
        x86-64 ASSEMBLY
      </div>
      {toolbar}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
        {asmCode.map((line) => {
          const isActive = activeLine === line.num;
          const isFnActive = line.fn === currentFunction;

          return (
            <div
              data-active={isActive || undefined}
              key={`${line.num}-${line.text}`}
              ref={isActive ? activeRef : null}
              style={{
                display: "flex",
                gap: 8,
                padding: "2px 4px",
                borderRadius: 3,
                background: isActive ? "rgba(0, 217, 255, 0.15)" : "transparent",
                borderLeft: isActive ? `3px solid ${colors.stackHighlight}` : "3px solid transparent",
                color: isActive ? colors.textBright : isFnActive ? colors.text : colors.textDim,
                fontWeight: isActive ? 700 : 400,
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
              <span style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {line.type === "label" ? (
                  <span style={{ color: colors.function, fontWeight: 700 }}>{line.text}</span>
                ) : (
                  colorizeAsm(line.text)
                )}
                {line.comment && (
                  <span style={{ color: colors.comment, fontSize: 10, marginLeft: 12 }}>
                    # {line.comment}
                  </span>
                )}
                {nextLine === line.num && <span style={{ color: colors.function, marginLeft: 8 }}>← next</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function colorizeAsm(text: string): React.ReactNode {
  const keywords = ["movslq", "movsxd", "pushq", "popq", "movq", "movl", "subq", "subl", "addq", "addl", "leaq", "leave", "call", "ret", "push", "pop", "mov", "lea", "sub", "add", "imulq", "imull", "imul", "cmpq", "cmpl", "cmp", "xorq", "xorl", "xor", "testq", "test", "decq", "decl", "dec", "incq", "inc", "jnz", "jle", "jmp", "jne", "je", "jg", "jge", "jl", "nop"];

  return text.split(/(%\w+|\$-?(?:0x[\da-f]+|\d+)|\b(?:r(?:[abcd]x|[sb]p|[sd]i|[89]|1[0-5])|e(?:[abcd]x|[sb]p|[sd]i))\b)/i).map((part, i) => {
    if (part.startsWith("%") || /^(?:r(?:[abcd]x|[sb]p|[sd]i|[89]|1[0-5])|e(?:[abcd]x|[sb]p|[sd]i))$/i.test(part)) {
      return <span key={i} style={{ color: colors.register }}>{part}</span>;
    }
    if (part.startsWith("$")) {
      return <span key={i} style={{ color: colors.number }}>{part}</span>;
    }

    for (const kw of keywords) {
      if (part.trim().startsWith(kw)) {
        const idx = part.indexOf(kw);
        return (
          <span key={i}>
            {part.slice(0, idx)}
            <span style={{ color: colors.keyword }}>{kw}</span>
            {part.slice(idx + kw.length)}
          </span>
        );
      }
    }

    return <span key={i}>{part}</span>;
  });
}
