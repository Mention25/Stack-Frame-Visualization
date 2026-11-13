# Stack Frame Interactive Visualizer

默认打开 **输入汇编**，首次使用预填独立的 `main → foo → bar` 示例；已有草稿会自动恢复。可以编辑 AT&T / Intel 汇编，执行后查看栈帧、返回地址与寄存器变化，支持单步、回退、播放、键盘操作及窄屏布局。

界面沿用原作者的三栏设计：汇编、栈内存、寄存器与执行说明；所有模式均已移除 C 代码展示。通用输入在左侧面板内编辑，点击“执行代码”后切换到原版风格的高亮汇编视图。

顶部仅保留“输入汇编”和上游“原版示例”两个页签；嵌套调用示例已合入输入页，不再提供独立讲解、观察点或 GDB 操作说明。示例约定见 [嵌套调用示例](docs/LESSON.md)。

> **[在线体验：调用栈通用演示](https://mention25.github.io/Stack-Frame-Visualization/)**
>
> 原作者：[Nick Zhu (NickZhuxy)](https://github.com/NickZhuxy)；原项目：[Stack-Frame-Visualization](https://github.com/NickZhuxy/Stack-Frame-Visualization)。
> 本版本新增可输入 AT&T / Intel 汇编的教学解释器，自动计算调用栈、寄存器和分支，并支持单步、回退及播放。“固定示例”模式保留上游的原有可视化与通用轨迹。两个模式都不包含课程实验二进制。
> 理解原理后，应使用 GDB/GEF 在实际二进制中验证，不能把演示状态作为实验程序的标准答案。
>
> **许可说明：** 下方原始 README 写 MIT，原始 package.json 写 ISC，且上游没有独立 LICENSE 文件。本版本保留两处声明、原作者署名及两种许可全文；上游声明尚未统一，不据此宣称获得了双重许可或额外授权。详见 [NOTICE.md](NOTICE.md)。
> 由 [Mention25](https://github.com/Mention25/Stack-Frame-Visualization) 部署维护；构建、预览与发布方式见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

---

## 输入自己的汇编

打开网页后选择语法，在左侧输入代码，点击 **执行代码**（或 Ctrl / Command + Enter），再使用单步、回退、播放或进度条观察自动生成的执行过程。修改代码后需再次执行。草稿仅保存在当前浏览器；示例菜单提供函数调用、递归阶乘和循环求和。

解释器支持常用 32/64 位整数指令、16 个通用寄存器、栈寻址和直接标签调用／跳转；不支持的指令会报告源码行号。可用栈为 4 KiB，执行上限为 2000 步。它解释指令语义，不生成机器码；显示的代码地址是虚拟编号。

完整语法、指令范围和执行约定见 [汇编执行说明](docs/ASSEMBLY.md)。运行 `npm test` 可检查解释器行为；x86-64 环境中存在 GCC 时，还会将示例和算术标志位与实际汇编后的程序对照。

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
