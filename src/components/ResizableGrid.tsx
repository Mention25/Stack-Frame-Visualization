import React, { useState, useRef, useCallback, useEffect } from "react";
import { colors } from "../styles/theme";

type Props = {
  children: React.ReactNode[];
  minWidth?: number;
  gap?: number;
  storageKey?: string;
};

const DEFAULT_WIDTHS = [240, 300, 400, 260]; // Initial pixel widths
const MIN_WIDTH = 150;

export const ResizableGrid: React.FC<Props> = ({
  children,
  minWidth = MIN_WIDTH,
  gap = 0,
  storageKey = "resizable-grid-widths",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<number[]>(() => {
    // Try to load from localStorage
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) {
            return parsed;
          }
        } catch {}
      }
    }
    return DEFAULT_WIDTHS;
  });

  const [dragging, setDragging] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const startX = useRef(0);
  const startWidths = useRef<number[]>([]);

  // Save to localStorage when widths change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    }
  }, [widths, storageKey]);

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(index);
      startX.current = e.clientX;
      startWidths.current = [...widths];
    },
    [widths]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging === null) return;

      const delta = e.clientX - startX.current;
      const newWidths = [...startWidths.current];

      // Adjust the column to the left of the divider
      const leftWidth = startWidths.current[dragging] + delta;
      // Adjust the column to the right of the divider
      const rightWidth = startWidths.current[dragging + 1] - delta;

      // Enforce minimum widths
      if (leftWidth >= minWidth && rightWidth >= minWidth) {
        newWidths[dragging] = leftWidth;
        newWidths[dragging + 1] = rightWidth;
        setWidths(newWidths);
      }
    },
    [dragging, minWidth]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const dividerWidth = 6;
  const numDividers = React.Children.count(children) - 1;
  const totalColumnWidth = widths.reduce((a, b) => a + b, 0);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {React.Children.map(children, (child, index) => {
        const widthPercent = (widths[index] / totalColumnWidth) * 100;
        const dividerOffset = (dividerWidth * numDividers * widths[index]) / totalColumnWidth;

        return (
          <React.Fragment key={index}>
            {/* Column */}
            <div
              style={{
                width: `calc(${widthPercent}% - ${dividerOffset}px)`,
                flexShrink: 0,
                minWidth: minWidth,
                overflow: "hidden",
              }}
            >
              {child}
            </div>

          {/* Divider (not after last column) */}
          {index < children.length - 1 && (
            <div
              onMouseDown={(e) => handleMouseDown(index, e)}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 6,
                cursor: "col-resize",
                background:
                  dragging === index || hovered === index
                    ? colors.stackHighlight
                    : "transparent",
                transition: "background 0.15s ease",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {/* Visual indicator line */}
              <div
                style={{
                  position: "absolute",
                  left: 2,
                  top: "10%",
                  bottom: "10%",
                  width: 2,
                  borderRadius: 1,
                  background:
                    dragging === index || hovered === index
                      ? colors.stackHighlight
                      : colors.stackBorder,
                  opacity: dragging === index || hovered === index ? 1 : 0.5,
                  transition: "all 0.15s ease",
                }}
              />
            </div>
          )}
        </React.Fragment>
        );
      })}
    </div>
  );
};
