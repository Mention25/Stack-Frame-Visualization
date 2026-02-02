export type AppState = {
  activeTraceId: string;
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
};

export type AppAction =
  | { type: "NEXT_STEP"; maxStep: number }
  | { type: "PREV_STEP" }
  | { type: "JUMP_TO_STEP"; step: number }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_SPEED"; speed: number }
  | { type: "SET_TRACE"; traceId: string }
  | { type: "FIRST_STEP" }
  | { type: "LAST_STEP"; maxStep: number };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "NEXT_STEP":
      if (state.currentStep >= action.maxStep) {
        return { ...state, isPlaying: false };
      }
      return { ...state, currentStep: state.currentStep + 1 };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case "JUMP_TO_STEP":
      return { ...state, currentStep: action.step };
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "SET_SPEED":
      return { ...state, playbackSpeed: action.speed };
    case "SET_TRACE":
      return { ...state, activeTraceId: action.traceId, currentStep: 0, isPlaying: false };
    case "FIRST_STEP":
      return { ...state, currentStep: 0 };
    case "LAST_STEP":
      return { ...state, currentStep: action.maxStep };
    default:
      return state;
  }
}

export const initialState: AppState = {
  activeTraceId: "handout1",
  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 1,
};
