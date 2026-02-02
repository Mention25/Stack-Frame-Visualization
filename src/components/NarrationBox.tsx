import { useState, useEffect } from "react";
import { colors } from "../styles/theme";

type Props = {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
};

export const NarrationBox: React.FC<Props> = ({
  stepNumber,
  totalSteps,
  title,
  description,
}) => {
  const [fadeKey, setFadeKey] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Trigger fade animation on step change
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setFadeKey((k) => k + 1);
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [stepNumber]);

  return (
    <div
      style={{
        background: colors.bgPanel,
        borderRadius: 8,
        padding: "10px 14px",
        border: `1px solid ${colors.stackBorder}`,
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 3,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((stepNumber + 1) / totalSteps) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${colors.stackHighlight}, ${colors.register})`,
              borderRadius: 2,
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: colors.textDim,
            whiteSpace: "nowrap",
          }}
        >
          {stepNumber + 1}/{totalSteps}
        </span>
      </div>

      {/* Content with fade effect */}
      <div
        key={fadeKey}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            fontWeight: 700,
            color: colors.textBright,
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: colors.text,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
