# Stack Frame Interactive Visualizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive step-through debugger-style web app that visualizes x86-64 stack frames, registers, and assembly execution for CS202 students.

**Architecture:** React + TypeScript SPA with Vite. Four-column layout (C code | Assembly | Stack memory | Registers + Narration) with a transport bar for step-through, auto-play, and scrubber. Execution traces are static TypeScript data files; adding a new trace for a future lecture means adding one file and registering it.

**Tech Stack:** React 19, TypeScript, Vite, CSS Modules. No UI framework. Static build output (dist/ folder students open in browser).

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`
- Create: `src/styles/theme.ts`

**Step 1: Initialize project**

```bash
cd "/Users/nickzhu/Desktop/NYU/2026 Spring/CS202 OS/stack-frame-interactive"
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom typescript vite @vitejs/plugin-react
```

**Step 3: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
});
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CS202 Stack Frame Visualizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create src/styles/theme.ts** (reuse colors from Remotion project)

```ts
export const colors = {
  bg: "#1a1a2e",
  bgLight: "#16213e",
  bgPanel: "#0f1923",
  text: "#eaeaea",
  textDim: "#8892b0",
  textBright: "#ffffff",
  keyword: "#c792ea",
  register: "#82aaff",
  number: "#f78c6c",
  comment: "#546e7a",
  string: "#c3e88d",
  function: "#ffcb6b",
  stackFrame: "#0f3460",
  stackBorder: "#3282b8",
  stackHighlight: "#00d9ff",
  registerBg: "#1e3a5f",
  registerChanged: "#e94560",
  address: "#64ffda",
  value: "#ffd700",
  mainColor: "#ff6b6b",
  fColor: "#4ecdc4",
  gColor: "#ffe66d",
};
```

**Step 7: Create src/styles/global.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace;
  background: #16213e;
  color: #eaeaea;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #0f1923;
}

::-webkit-scrollbar-thumb {
  background: #3282b8;
  border-radius: 3px;
}
```

**Step 8: Create src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 9: Create src/App.tsx** (minimal shell)

```tsx
import { colors } from "./styles/theme";

export const App: React.FC = () => {
  return (
    <div style={{ height: "100%", background: colors.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: colors.textBright }}>CS202 Stack Frame Visualizer</h1>
    </div>
  );
};
```

**Step 10: Add scripts to package.json**

Add to scripts:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Step 11: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, browser shows "CS202 Stack Frame Visualizer" heading.

**Step 12: Commit**

```bash
git init
echo "node_modules\ndist\n.DS_Store" > .gitignore
git add -A
git commit -m "feat: scaffold React + Vite project"
```

---

### Task 2: Types & Trace Data

**Files:**
- Create: `src/types.ts`
- Create: `src/traces/handout1.ts`
- Create: `src/traces/index.ts`

**Step 1: Create src/types.ts**

```ts
export type StackEntry = {
  address: number;
  value: string;
  label?: string;
  highlight?: boolean;
};

export type RegisterState = {
  rsp: number;
  rbp: number;
  rip: string;
  rax?: string;
  rdi?: string;
};

export type CodeLine = {
  num: number;
  text: string;
  indent?: number;
};

export type AsmLine = {
  num: number;
  text: string;
  fn: string;
  type: "label" | "inst";
  comment?: string;
};

export type Phase = {
  name: string;
  startStep: number;
};

export type ExecutionStep = {
  title: string;
  description: string;
  currentFunction: string;
  highlightedAsmLine: number;
  cCodeLine?: number;
  registers: RegisterState;
  stack: StackEntry[];
};

export type ExecutionTrace = {
  id: string;
  title: string;
  description: string;
  cCode: CodeLine[];
  asmCode: AsmLine[];
  phases: Phase[];
  steps: ExecutionStep[];
};
```

**Step 2: Create src/traces/handout1.ts**

Port the execution steps from the Remotion project's `ExecutionState.ts`, plus the C code and assembly arrays from `CodePanel.tsx`, restructured into the new `ExecutionTrace` format. This file contains all 29 steps with the `cCode`, `asmCode`, and `phases` arrays.

(Full content: adapt directly from the Remotion project files at `stack-frame-visualizer/src/components/ExecutionState.ts` and `stack-frame-visualizer/src/components/CodePanel.tsx`.)

**Step 3: Create src/traces/index.ts**

```ts
import { handout1 } from "./handout1";
import type { ExecutionTrace } from "../types";

export const traces: ExecutionTrace[] = [handout1];
```

**Step 4: Verify imports compile**

Update App.tsx to import and log `traces[0].steps.length`. Check browser console shows `29`.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add types and handout1 execution trace data"
```

---

### Task 3: App State & Reducer

**Files:**
- Create: `src/state.ts`
- Modify: `src/App.tsx`

**Step 1: Create src/state.ts**

```ts
import type { ExecutionTrace } from "./types";

export type AppState = {
  activeTraceId: string;
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number; // multiplier: 0.5, 1, 1.5, 2, 3
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
```

**Step 2: Wire reducer into App.tsx**

```tsx
import { useReducer } from "react";
import { appReducer, initialState } from "./state";
import { traces } from "./traces";

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const trace = traces.find((t) => t.id === state.activeTraceId) ?? traces[0];
  const step = trace.steps[state.currentStep];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        Step {state.currentStep + 1}/{trace.steps.length}: {step.title}
      </div>
      <div>
        <button onClick={() => dispatch({ type: "PREV_STEP" })}>Prev</button>
        <button onClick={() => dispatch({ type: "NEXT_STEP", maxStep: trace.steps.length - 1 })}>Next</button>
      </div>
    </div>
  );
};
```

**Step 3: Verify stepping works in browser**

Click Prev/Next, confirm step counter changes.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add app state reducer with step navigation"
```

---

### Task 4: CCodePanel Component

**Files:**
- Create: `src/components/CCodePanel.tsx`

**Step 1: Create src/components/CCodePanel.tsx**

A panel that renders lines of C code with line numbers. The currently active line (`cCodeLine`) is highlighted with a pulsing cyan background. Lines for the current function are brighter. C keywords (`uint64_t`, `int`, `void`, `return`) are syntax-colored purple. Strings are green. Comments are red.

Props: `cCode: CodeLine[]`, `activeLine?: number`, `currentFunction: string`

The panel has a "C SOURCE" header label, scrollable body, monospace font, and uses colors from `theme.ts`.

**Step 2: Wire into App.tsx** in the left column position.

**Step 3: Verify** C code renders, active line highlights when stepping.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add C code panel with syntax highlighting"
```

---

### Task 5: AsmPanel Component

**Files:**
- Create: `src/components/AsmPanel.tsx`

**Step 1: Create src/components/AsmPanel.tsx**

Similar to CCodePanel but for assembly. Labels (like `main:`, `f:`, `g:`) are rendered in yellow bold. Instructions have syntax coloring: keywords (`pushq`, `movq`, etc.) in purple, registers (`%rsp`, `%rbp`) in blue, immediates (`$16`, `$0`) in orange. Comments shown in gray on the right.

Active line has cyan left-border + background highlight. Lines from the current function are full brightness; others are dimmed.

Auto-scrolls to keep the highlighted line visible using a `ref` + `scrollIntoView`.

Props: `asmCode: AsmLine[]`, `activeLine: number`, `currentFunction: string`

**Step 2: Wire into App.tsx** in the second column.

**Step 3: Verify** assembly renders, active line highlights and scrolls into view.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add assembly panel with syntax highlighting and auto-scroll"
```

---

### Task 6: StackView Component

**Files:**
- Create: `src/components/StackView.tsx`

**Step 1: Create src/components/StackView.tsx**

The main visual: renders stack cells vertically from high addresses (top) to low addresses (bottom). Each cell shows:
- Address (left, cyan monospace)
- Value (gold, bold, inside the cell)
- Label (gray, right-aligned inside the cell)
- Register pointers (%rsp in red, %rbp in blue) on the right side

Highlighted cells have a cyan border + subtle glow. New cells animate in with a CSS transition on `opacity` and `transform` (using a `key` on the stack length to trigger). A "currently in: fn()" badge at the bottom shows the active function with its color (main=red, f=teal, g=yellow).

Header: "STACK MEMORY". Footer: "↓ stack grows downward ↓".

Props: `stack: StackEntry[]`, `rsp: number`, `rbp: number`, `currentFunction: string`

**Step 2: Wire into App.tsx** in the third column.

**Step 3: Verify** stack renders, grows/shrinks when stepping through.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add stack memory visualization component"
```

---

### Task 7: RegisterPanel Component

**Files:**
- Create: `src/components/RegisterPanel.tsx`

**Step 1: Create src/components/RegisterPanel.tsx**

Displays registers: %rsp, %rbp, %rip, %rax, %rdi. Each row shows register name (blue) and value (gold). When a value changes from the previous step, the row gets a red flash background and the old value is shown with strikethrough.

Uses a `prevRegisters` prop to detect changes. Flash effect via CSS transition on background-color.

Props: `registers: RegisterState`, `prevRegisters?: RegisterState`

**Step 2: Wire into App.tsx** in the right column (top).

**Step 3: Verify** registers display, changes flash red when stepping.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add register panel with change highlighting"
```

---

### Task 8: NarrationBox Component

**Files:**
- Create: `src/components/NarrationBox.tsx`

**Step 1: Create src/components/NarrationBox.tsx**

Shows the current step's title (white, bold) and description (light gray, smaller). Has a progress bar at the top showing step N of total. Fades in on step change.

Props: `stepNumber: number`, `totalSteps: number`, `title: string`, `description: string`

**Step 2: Wire into App.tsx** in the right column (below RegisterPanel).

**Step 3: Verify** narration updates each step with correct text.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add narration box with progress indicator"
```

---

### Task 9: TransportBar Component

**Files:**
- Create: `src/components/TransportBar.tsx`

**Step 1: Create src/components/TransportBar.tsx**

Bottom bar with:
- **Buttons:** First (`|◁`), Previous (`◁`), Next (`▷`), Last (`▷|`), Play/Pause (`▶`/`⏸`)
- **Step counter:** "Step 6 / 29"
- **Speed selector:** Dropdown with options 0.5x, 1x, 1.5x, 2x, 3x
- **Scrubber:** Full-width range input (styled) that students can drag. Tick marks for phase boundaries.
- **Phase labels:** Small clickable labels above the scrubber showing phase names at proportional positions.

Props: `state: AppState`, `dispatch: React.Dispatch<AppAction>`, `maxStep: number`, `phases: Phase[]`

**Step 2: Wire into App.tsx** at the bottom of the layout.

**Step 3: Verify** all buttons work, scrubber drags, speed changes.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add transport bar with scrubber and playback controls"
```

---

### Task 10: Auto-Play & Keyboard Shortcuts

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add auto-play interval**

Use `useEffect` with `setInterval`. When `isPlaying` is true, dispatch `NEXT_STEP` at an interval of `1400 / playbackSpeed` ms. Clear interval on pause or unmount. Stop playback when reaching the last step.

**Step 2: Add keyboard event listener**

Use `useEffect` with `keydown` listener on `window`:
- `ArrowRight` → NEXT_STEP
- `ArrowLeft` → PREV_STEP
- `Space` → TOGGLE_PLAY (with `preventDefault`)
- `Home` → FIRST_STEP
- `End` → LAST_STEP

**Step 3: Verify** arrow keys step through, space toggles play, auto-play advances and stops at end.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add auto-play and keyboard shortcuts"
```

---

### Task 11: Full Layout Assembly

**Files:**
- Modify: `src/App.tsx`

**Step 1: Assemble the four-column layout**

Replace the placeholder App.tsx with the full layout:

```
┌──────────────────────────────────────────────────────────┐
│  Header: [TraceSelector]                   CS202 title   │
├───────────┬──────────────┬─────────────────┬─────────────┤
│ CCodePanel│  AsmPanel    │   StackView     │ RegisterPanel│
│           │              │                 │ NarrationBox │
│           │              │                 │ Legend       │
├───────────┴──────────────┴─────────────────┴─────────────┤
│  TransportBar                                            │
└──────────────────────────────────────────────────────────┘
```

Use CSS grid: `grid-template-columns: 240px 300px 1fr 260px` for the main area. Header is a flex row. Transport bar is fixed at the bottom.

**Step 2: Add TraceSelector dropdown**

Simple `<select>` that maps over `traces` and dispatches `SET_TRACE`.

**Step 3: Add Legend**

Static component showing the color coding for main/f/g and register pointers (same as Remotion version).

**Step 4: Verify** full layout renders correctly, all panels update together when stepping.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: assemble full four-column layout with all components"
```

---

### Task 12: Transitions & Polish

**Files:**
- Modify: multiple component files

**Step 1: Add CSS transitions to StackView**

Stack cells get `transition: all 0.2s ease` for smooth entry/exit. New cells start with `opacity: 0, transform: translateY(8px)` and transition to full visibility.

**Step 2: Add CSS transitions to RegisterPanel**

Changed registers get `transition: background-color 0.3s ease`. Background flashes red and fades back.

**Step 3: Style the scrubber**

Custom-styled range input with phase tick marks. Cyan track, brighter thumb. Phase labels positioned absolutely above.

**Step 4: Add Google Font import**

Add `<link>` for JetBrains Mono in `index.html` with fallback to system monospace.

**Step 5: Verify** transitions are smooth, scrubber looks good, font loads.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add transitions, polish styling, load monospace font"
```

---

### Task 13: Build & Verify Static Output

**Step 1: Run production build**

```bash
npm run build
```

Expected: `dist/` folder created with `index.html`, JS bundle, CSS.

**Step 2: Test static output**

```bash
npm run preview
```

Open in browser, verify everything works: stepping, keyboard, auto-play, scrubber.

**Step 3: Verify dist/ is self-contained**

Open `dist/index.html` directly in browser (file:// protocol). Should work because we set `base: "./"` in Vite config.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: verify production build, ready for distribution"
```
