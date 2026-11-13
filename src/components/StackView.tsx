import { useState, useEffect, useRef } from "react";
import type { StackEntry } from "../types";
import { colors, frameColor } from "../styles/theme";

type Props = {
  stack: StackEntry[];
  rsp: number;
  rbp: number;
  currentFunction: string;
  addressFormat?: "decimal" | "hex";
  toolbar?: React.ReactNode;
};

const fnColor = frameColor;

export const StackView: React.FC<Props> = ({ stack, rsp, rbp, currentFunction, addressFormat = "decimal", toolbar }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = scrollRef.current, top = topRef.current;
    if (parent && top) {
      const box = top.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
      if (box.bottom > bounds.bottom) parent.scrollTop += box.bottom - bounds.bottom;
      else if (box.top < bounds.top) parent.scrollTop += box.top - bounds.top;
    }
  }, [rsp, stack.length]);
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

    prevAddressesRef.current = currentAddresses;
    setAnimatedAddresses(newAddresses);
    if (!newAddresses.size) return;
    const timer = setTimeout(() => setAnimatedAddresses(new Set()), 50);
    return () => clearTimeout(timer);
  }, [stack]);
  return (
    <div
      className="upstream-stack"
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
      {toolbar}

      <div style={{ fontSize: 10, color: colors.textDim, textAlign: "center", marginBottom: 4 }}>
        high addresses
      </div>

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {!stack.length && <p style={{ color: colors.textDim, fontSize: 12, padding: 16 }}>栈空间已释放。</p>}
        {stack.map((entry, idx) => {
          const isRsp = addressFormat === "hex" ? rsp >= entry.address && rsp < entry.address + 8 : entry.address === rsp;
          const isRbp = addressFormat === "hex" ? rbp >= entry.address && rbp < entry.address + 8 : entry.address === rbp;
          const isNew = animatedAddresses.has(entry.address);

          return (
            <div
              ref={isRsp ? topRef : null}
              data-stack-address={entry.address}
              data-stack-top={isRsp || undefined}
              title={entry.bytes ? `从低地址到高地址：${entry.bytes}` : undefined}
              key={`${entry.address}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
                width: addressFormat === "hex" ? "100%" : undefined,
                maxWidth: addressFormat === "hex" ? 460 : undefined,
                flexShrink: 0,
                opacity: isNew ? 0 : entry.freed ? .55 : 1,
                transform: isNew ? "translateY(8px)" : "translateY(0)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
            >
              {/* Address */}
              <div
                style={{
                  width: addressFormat === "hex" ? 46 : 36,
                  textAlign: "right",
                  fontSize: 10,
                  color: colors.address,
                  flexShrink: 0,
                }}
              >
                {addressFormat === "hex" ? `0x${entry.address.toString(16)}` : entry.address}
              </div>

              {/* Stack cell */}
              <div
                style={{
                  width: addressFormat === "hex" ? undefined : 200,
                  flex: addressFormat === "hex" ? "1 1 180px" : undefined,
                  minWidth: 0,
                  minHeight: 28,
                  flexWrap: addressFormat === "hex" ? "wrap" : undefined,
                  gap: 4,
                  height: addressFormat === "hex" ? undefined : 28,
                  border: `2px solid ${entry.highlight ? colors.stackHighlight : colors.stackBorder}`,
                  borderLeftColor: entry.owner ? frameColor(entry.owner) : undefined,
                  background: entry.highlight ? "rgba(0, 217, 255, 0.1)" : colors.stackFrame,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: addressFormat === "hex" ? "5px 8px" : "0 8px",
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
                    title={entry.label}
                    style={{
                      fontSize: 9,
                      color: colors.textDim,
                      maxWidth: addressFormat === "hex" ? "100%" : 120,
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
                  width: addressFormat === "hex" ? 68 : 50,
                  fontSize: 10,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {isRbp && (
                  <span style={{ color: colors.register, fontWeight: 700 }}>← %rbp{rbp !== entry.address ? `+${rbp-entry.address}` : ""}</span>
                )}
                {isRsp && (
                  <span style={{ color: colors.registerChanged, fontWeight: 700 }}>← %rsp{rsp !== entry.address ? `+${rsp-entry.address}` : ""}</span>
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
        {currentFunction === "已结束" ? "execution complete" : `currently in: ${currentFunction}()`}
      </div>
    </div>
  );
};
