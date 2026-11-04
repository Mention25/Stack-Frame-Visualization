# Stack Frame Interactive Visualizer

> **[在线体验：调用栈通用演示](https://mention25.github.io/Stack-Frame-Visualization/)**
>
> 原作者：[Nick Zhu (NickZhuxy)](https://github.com/NickZhuxy)；原项目：[Stack-Frame-Visualization](https://github.com/NickZhuxy/Stack-Frame-Visualization)。
> 本版本增加部署配置、中文用途说明与来源标注。原有通用示例与可视化实现来自上游，不包含课程实验二进制。
> 这是预设轨迹的教学演示；理解原理后，应使用 GDB/GEF 在实际二进制中验证，不能把演示状态作为实验程序的标准答案。
>
> **许可说明：** 下方原始 README 写 MIT，原始 package.json 写 ISC，且上游没有独立 LICENSE 文件。本版本保留两处声明、原作者署名及两种许可全文；上游声明尚未统一，不据此宣称获得了双重许可或额外授权。详见 [NOTICE.md](NOTICE.md)。
> 由 [Mention25](https://github.com/Mention25/Stack-Frame-Visualization) 部署维护；构建、预览与发布方式见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

---

以下为保留的上游项目说明：

An interactive step-through debugger for visualizing x86-64 stack frames, registers, and assembly execution. Built based on [Michael Walfish CSCI-UA.0202(-001): Operating Systems (Undergrad)](https://cs.nyu.edu/~mwalfish/classes/26sp/index.html) course material.

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
