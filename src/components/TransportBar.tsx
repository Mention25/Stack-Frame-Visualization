import React from "react";
import { AppState, AppAction } from "../state";
import { Phase } from "../types";
import { colors } from "../styles/theme";

type TransportBarProps = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  maxStep: number;
  phases: Phase[];
};

export const TransportBar: React.FC<TransportBarProps> = ({
  state,
  dispatch,
  maxStep,
  phases,
}) => {
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "JUMP_TO_STEP", step: parseInt(e.target.value, 10) });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_SPEED", speed: parseFloat(e.target.value) });
  };

  const handlePhaseClick = (startStep: number) => {
    dispatch({ type: "JUMP_TO_STEP", step: startStep });
  };

  // Calculate phase positions as percentages
  const getPhasePosition = (startStep: number): number => {
    return maxStep > 0 ? (startStep / maxStep) * 100 : 0;
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    background: colors.bgPanel,
    color: colors.text,
    border: `1px solid ${colors.stackBorder}`,
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.15s ease",
  };

  const buttonHoverStyle = {
    background: colors.stackFrame,
    borderColor: colors.stackHighlight,
  };

  return (
    <div
      style={{
        background: colors.bgPanel,
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Phase labels above scrubber */}
      <div
        style={{
          position: "relative",
          height: 24,
          marginBottom: 4,
        }}
      >
        {phases.map((phase, index) => (
          <button
            key={index}
            onClick={() => handlePhaseClick(phase.startStep)}
            style={{
              position: "absolute",
              left: `${getPhasePosition(phase.startStep)}%`,
              transform: "translateX(-50%)",
              background: "transparent",
              border: "none",
              color: colors.textDim,
              fontSize: 10,
              cursor: "pointer",
              padding: "2px 4px",
              whiteSpace: "nowrap",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.stackHighlight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textDim;
            }}
            title={`Jump to ${phase.name}`}
          >
            {phase.name}
          </button>
        ))}
      </div>

      {/* Scrubber with tick marks */}
      <div style={{ position: "relative" }}>
        {/* Tick marks for phase boundaries */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            pointerEvents: "none",
          }}
        >
          {phases.map((phase, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${getPhasePosition(phase.startStep)}%`,
                width: 2,
                height: 8,
                background: colors.stackBorder,
                transform: "translateX(-50%)",
              }}
            />
          ))}
        </div>

        {/* Range input scrubber */}
        <input
          type="range"
          min={0}
          max={maxStep}
          value={state.currentStep}
          onChange={handleScrubberChange}
          style={{
            width: "100%",
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(to right, ${colors.stackHighlight} 0%, ${colors.stackHighlight} ${(state.currentStep / maxStep) * 100}%, ${colors.stackFrame} ${(state.currentStep / maxStep) * 100}%, ${colors.stackFrame} 100%)`,
            appearance: "none",
            cursor: "pointer",
            outline: "none",
          }}
        />
        <style>
          {`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: ${colors.textBright};
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              transition: transform 0.15s ease;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.2);
              background: ${colors.stackHighlight};
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: ${colors.textBright};
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            input[type="range"]::-moz-range-thumb:hover {
              background: ${colors.stackHighlight};
            }
          `}
        </style>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Navigation buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => dispatch({ type: "FIRST_STEP" })}
            style={buttonStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgPanel;
              e.currentTarget.style.borderColor = colors.stackBorder;
            }}
            title="First step"
          >
            |&#9665;
          </button>
          <button
            onClick={() => dispatch({ type: "PREV_STEP" })}
            style={buttonStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgPanel;
              e.currentTarget.style.borderColor = colors.stackBorder;
            }}
            title="Previous step"
          >
            &#9665;
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_PLAY" })}
            style={{
              ...buttonStyle,
              background: state.isPlaying ? colors.registerChanged : colors.bgPanel,
              minWidth: 50,
            }}
            onMouseEnter={(e) => {
              if (!state.isPlaying) {
                Object.assign(e.currentTarget.style, buttonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = state.isPlaying
                ? colors.registerChanged
                : colors.bgPanel;
              e.currentTarget.style.borderColor = colors.stackBorder;
            }}
            title={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? "\u23F8" : "\u25B6"}
          </button>
          <button
            onClick={() => dispatch({ type: "NEXT_STEP", maxStep })}
            style={buttonStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgPanel;
              e.currentTarget.style.borderColor = colors.stackBorder;
            }}
            title="Next step"
          >
            &#9655;
          </button>
          <button
            onClick={() => dispatch({ type: "LAST_STEP", maxStep })}
            style={buttonStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.bgPanel;
              e.currentTarget.style.borderColor = colors.stackBorder;
            }}
            title="Last step"
          >
            &#9655;|
          </button>
        </div>

        {/* Step counter */}
        <div
          style={{
            color: colors.text,
            fontSize: 14,
            fontFamily: "monospace",
            background: colors.stackFrame,
            padding: "6px 12px",
            borderRadius: 4,
          }}
        >
          Step {state.currentStep + 1} / {maxStep + 1}
        </div>

        {/* Speed selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            htmlFor="speed-select"
            style={{ color: colors.textDim, fontSize: 14 }}
          >
            Speed:
          </label>
          <select
            id="speed-select"
            value={state.playbackSpeed}
            onChange={handleSpeedChange}
            style={{
              padding: "6px 12px",
              background: colors.stackFrame,
              color: colors.text,
              border: `1px solid ${colors.stackBorder}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
