import { useState, useEffect, useRef } from "react";
import type { StackEntry } from "../types";
import { colors } from "../styles/theme";

type Props = {
  stack: StackEntry[];
  rsp: number;
  rbp: number;
  currentFunction: string;
};

const fnColor = (fn: string) => {
  switch (fn) {
    case "main": return colors.mainColor;
    case "f": return colors.fColor;
    case "g": return colors.gColor;
    default: return colors.text;
  }
};

export const StackView: React.FC<Props> = ({ stack, rsp, rbp, currentFunction }) => {
  // Track which addresses are "new" (just appeared) for entry animation
  const [animatedAddresses, setAnimatedAddresses] = useState<Set<number>>(new Set());
  const prevAddressesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const currentAddresses = new Set(stack.map((e) => e.address));
    const prevAddresses = prevAddressesRef.current;

    // Find newly added addresses
    const newAddresses = new Set<number>();
    for (const addr of currentAddresses) {
      if (!prevAddresses.has(addr)) {
        newAddresses.add(addr);
      }
    }

    // If there are new addresses, animate them in
    if (newAddresses.size > 0) {
      setAnimatedAddresses(newAddresses);
      // After a short delay, mark them as animated (remove from set)
      const timer = setTimeout(() => {
        setAnimatedAddresses(new Set());
      }, 50); // Short delay to allow initial render with animation start state
      return () => clearTimeout(timer);
    }

    prevAddressesRef.current = currentAddresses;
  }, [stack]);

  // Update prev addresses after animation starts
  useEffect(() => {
    prevAddressesRef.current = new Set(stack.map((e) => e.address));
  }, [stack]);
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
          textAlign: "center",
        }}
      >
        STACK MEMORY
      </div>

      <div style={{ fontSize: 10, color: colors.textDim, textAlign: "center", marginBottom: 4 }}>
        high addresses
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {stack.map((entry, idx) => {
          const isRsp = entry.address === rsp;
          const isRbp = entry.address === rbp;
          const isNew = animatedAddresses.has(entry.address);

          return (
            <div
              key={`${entry.address}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
                opacity: isNew ? 0 : 1,
                transform: isNew ? "translateY(8px)" : "translateY(0)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
            >
              {/* Address */}
              <div
                style={{
                  width: 36,
                  textAlign: "right",
                  fontSize: 10,
                  color: colors.address,
                  flexShrink: 0,
                }}
              >
                {entry.address}
              </div>

              {/* Stack cell */}
              <div
                style={{
                  width: 200,
                  height: 28,
                  border: `2px solid ${entry.highlight ? colors.stackHighlight : colors.stackBorder}`,
                  background: entry.highlight ? "rgba(0, 217, 255, 0.1)" : colors.stackFrame,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 8px",
                  boxShadow: entry.highlight ? `0 0 8px rgba(0, 217, 255, 0.3)` : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.value,
                  }}
                >
                  {entry.value}
                </span>
                {entry.label && (
                  <span
                    style={{
                      fontSize: 9,
                      color: colors.textDim,
                      maxWidth: 120,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      textAlign: "right",
                    }}
                  >
                    {entry.label}
                  </span>
                )}
              </div>

              {/* Register pointers */}
              <div
                style={{
                  width: 50,
                  fontSize: 10,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {isRbp && (
                  <span style={{ color: colors.register, fontWeight: 700 }}>← %rbp</span>
                )}
                {isRsp && (
                  <span style={{ color: colors.registerChanged, fontWeight: 700 }}>← %rsp</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: colors.textDim, textAlign: "center", marginTop: 4 }}>
        ↓ stack grows downward ↓
      </div>

      {/* Current function badge */}
      <div
        style={{
          marginTop: 8,
          padding: "4px 12px",
          borderRadius: 16,
          background: "rgba(0,0,0,0.3)",
          border: `2px solid ${fnColor(currentFunction)}`,
          fontSize: 12,
          fontWeight: 700,
          color: fnColor(currentFunction),
          textAlign: "center",
          alignSelf: "center",
        }}
      >
        currently in: {currentFunction}()
      </div>
    </div>
  );
};
