import { useState, useEffect } from "react";
import type { RegisterState } from "../types";
import { colors } from "../styles/theme";

type Props = {
  registers: RegisterState;
  prevRegisters?: RegisterState;
};

type RegisterKey = keyof RegisterState;

const REGISTER_ORDER: RegisterKey[] = ["rsp", "rbp", "rip", "rax", "rdi"];

export const RegisterPanel: React.FC<Props> = ({ registers, prevRegisters }) => {
  const [flashingRegs, setFlashingRegs] = useState<Set<RegisterKey>>(new Set());

  // Detect changes and trigger flash effect
  useEffect(() => {
    if (!prevRegisters) return;

    const changedRegs = new Set<RegisterKey>();
    for (const key of REGISTER_ORDER) {
      const curr = registers[key];
      const prev = prevRegisters[key];
      if (curr !== prev) {
        changedRegs.add(key);
      }
    }

    if (changedRegs.size > 0) {
      setFlashingRegs(changedRegs);
      // Clear flash after animation
      const timer = setTimeout(() => {
        setFlashingRegs(new Set());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [registers, prevRegisters]);

  return (
    <div
      style={{
        background: colors.bgPanel,
        borderRadius: 8,
        padding: "8px 12px",
        border: `1px solid ${colors.stackBorder}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.stackHighlight,
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        REGISTERS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {REGISTER_ORDER.map((key) => {
          const value = registers[key];
          const prevValue = prevRegisters?.[key];
          const hasChanged = prevRegisters !== undefined && value !== prevValue;
          const isFlashing = flashingRegs.has(key);

          // Skip undefined optional registers
          if (value === undefined) return null;

          const formattedValue = formatRegisterValue(key, value);
          const formattedPrevValue = prevValue !== undefined ? formatRegisterValue(key, prevValue) : null;

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 12px 4px 8px",
                borderRadius: 4,
                background: isFlashing ? colors.registerChanged : colors.registerBg,
                transition: "background-color 0.3s ease-out",
              }}
            >
              <span
                style={{
                  color: colors.register,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: "monospace",
                }}
              >
                %{key}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasChanged && formattedPrevValue !== null && (
                  <span
                    style={{
                      color: colors.textDim,
                      fontSize: 12,
                      fontFamily: "monospace",
                      textDecoration: "line-through",
                      opacity: 0.7,
                    }}
                  >
                    {formattedPrevValue}
                  </span>
                )}
                <span
                  style={{
                    color: colors.value,
                    fontWeight: 500,
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}
                >
                  {formattedValue}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatRegisterValue(key: RegisterKey, value: number | string | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  // Format numeric values as hex addresses
  return `0x${value.toString(16).padStart(4, "0")}`;
}
