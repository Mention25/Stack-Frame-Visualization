# Stack Frame Interactive Visualizer

An interactive step-through debugger for visualizing x86-64 stack frames, registers, and assembly execution. Built for CS202 Operating Systems at NYU.

## Features

- **Four-panel layout**: C code, Assembly, Stack memory, Registers
- **Step-through execution**: Navigate forward/backward through 29 execution steps
- **Visual feedback**: Animated stack growth, register change highlighting, active line tracking
- **Playback controls**: Play/pause, adjustable speed (0.5x–3x), scrubber timeline
- **Keyboard shortcuts**: Arrow keys (step), Space (play/pause), Home/End (first/last)

## Quick Start

### Use Pre-built Version
Download and open `dist/index.html` in any browser — no server required.

### Run Development Server
```bash
npm install
npm run dev
```

### Build for Distribution
```bash
npm run build
# Output in dist/ folder
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Next step |
| `←` | Previous step |
| `Space` | Play/Pause |
| `Home` | First step |
| `End` | Last step |

## Adding New Traces

1. Create `src/traces/yourTrace.ts`:
```ts
import type { ExecutionTrace } from "../types";

export const yourTrace: ExecutionTrace = {
  id: "your-trace",
  title: "Your Trace Title",
  description: "Description",
  cCode: [...],
  asmCode: [...],
  phases: [...],
  steps: [...]
};
```

2. Register in `src/traces/index.ts`:
```ts
import { yourTrace } from "./yourTrace";
export const traces = [handout1, yourTrace];
```

## Tech Stack

React 19 + TypeScript + Vite

## License

MIT
