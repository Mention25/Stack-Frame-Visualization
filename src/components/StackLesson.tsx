import { useEffect, useRef, useState } from "react";
import { runAssembly } from "../emulator/machine";
import { lessonSource, lessonC, lessonCheckpoints } from "../emulator/lesson";
import { RegisterView, StackMemory } from "./AssemblyPlayground";
import "../styles/lesson.css";

const execution = runAssembly(lessonSource);
const checkpoints = lessonCheckpoints(execution);
const max = execution.states.length - 1;

export function StackLesson() {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const codeRef = useRef<HTMLDivElement>(null);
  const state = execution.states[cursor];
  const previous = execution.states[cursor - 1];
  const next = !state.halted ? execution.program.instructions[state.pc] : undefined;
  const checkpoint = [...checkpoints].reverse().find(point => point.step <= cursor)!;
  const move = (index: number) => { setPlaying(false); setCursor(Math.max(0, Math.min(max, index))); };

  useEffect(() => {
    if (!playing) return;
    if (cursor === max) { setPlaying(false); return; }
    const timer = setTimeout(() => setCursor(value => Math.min(max, value + 1)), 1200 / speed);
    return () => clearTimeout(timer);
  }, [playing, cursor, speed]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, select, textarea, summary")) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (!["ArrowRight", "ArrowLeft", "Home", "End", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === " ") { if (cursor < max) setPlaying(value => !value); }
      else move(event.key === "Home" ? 0 : event.key === "End" ? max : cursor + (event.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [cursor]);
  useEffect(() => {
    const parent = codeRef.current;
    const active = parent?.querySelector<HTMLElement>(".lesson-executed, .lesson-next");
    if (parent && active) {
      const top = active.offsetTop;
      if (top < parent.scrollTop || top + active.offsetHeight > parent.scrollTop + parent.clientHeight) parent.scrollTop = Math.max(0, top - parent.clientHeight / 3);
    }
  }, [cursor]);

  return <div className="playground lesson">
    <header className="play-intro"><div><p className="lesson-eyebrow">X86-64 · CALL STACK</p><h1>看见一次函数调用</h1><p>从 main → foo → bar，逐步观察栈帧的建立与释放。</p></div><a className="lesson-link" href="#gdb-verification" onClick={() => { const detail = document.getElementById("gdb-verification"); if (detail instanceof HTMLDetailsElement) detail.open = true; }}>在 GDB 中验证 ↗</a></header>
    <p className="lesson-boundary">独立通用示例，采用 System V AMD64 参数约定并保留帧指针。地址为示意，不含课程实验二进制；实验结论应来自 GDB/GEF 对实际程序的观察。</p>
    <nav className="lesson-checkpoints" aria-label="关键步骤">{checkpoints.map((point, index) => <button key={point.title} aria-current={point === checkpoint ? "step" : undefined} onClick={() => move(point.step)}><span>{String(index + 1).padStart(2, "0")}</span>{point.title}</button>)}</nav>
    <section className="lesson-observation" aria-label="阶段讲解"><strong>{checkpoint.title}</strong><p>{checkpoint.text}</p></section>
    <div className="play-layout lesson-layout">
      <section className="live-panel lesson-code" aria-label="示例代码">
        <div className="panel-heading"><h2>汇编 · AT&T</h2><span>源操作数 → 目的操作数</span></div>
        <details className="lesson-c"><summary>查看等价 C 逻辑</summary><pre>{lessonC}</pre><p>下方汇编为手写教学示例，额外把 foo 的参数存入局部栈槽；不代表编译器唯一的输出。</p></details>
        <div className="lesson-asm" ref={codeRef}>{lessonSource.trimEnd().split("\n").map((line, index) => <div key={index} className={state.lastLine === index + 1 ? "lesson-executed" : next?.line === index + 1 ? "lesson-next" : ""}><span>{index + 1}</span><code>{line || " "}</code>{state.lastLine === index + 1 && <b aria-label="刚执行">✓</b>}{next?.line === index + 1 && <b aria-label="下一条">→</b>}</div>)}</div>
        <p className="editor-caption">✓ 青色：刚执行　→ 黄色：下一条</p>
      </section>
      <StackMemory state={state} previous={previous} decimal={false} lesson />
      <div className="state-column">
        <section className="live-panel step-explanation" aria-label="执行说明" aria-live={playing ? "off" : "polite"}><h2>{cursor === 0 ? "初始状态" : `第 ${cursor} 步 · 已执行`}</h2><code>{state.lastInstruction}</code><p>{state.explanation}</p>{next && <small>下一条：{next.text}</small>}</section>
        <section className="live-panel call-section" aria-label="函数调用链"><div className="panel-heading"><h2>函数调用链</h2><span>{state.frames.length} 层</span></div><ol className="call-frames">{state.frames.map((frame, index) => <li key={index} className={index === state.frames.length - 1 ? "current-frame" : ""}>{index === state.frames.length - 1 ? "▶" : "↳"} {frame.name}</li>)}</ol>{state.halted && <p className="empty-stack">调用已结束 · 返回值 15</p>}</section>
        <RegisterView state={state} previous={previous} decimal={false} compact />
      </div>
    </div>
    <div className="play-transport" aria-label="执行控制"><div className="transport-buttons">
      <button disabled={cursor === 0} onClick={() => move(0)}>重置</button><button disabled={cursor === 0} onClick={() => move(cursor - 1)}>← 上一步</button><button className="play-button" disabled={cursor === max} onClick={() => setPlaying(value => !value)}>{playing ? "暂停" : "播放"}</button><button disabled={cursor === max} onClick={() => move(cursor + 1)}>下一步 →</button><button disabled={cursor === max} onClick={() => move(max)}>到最后</button>
    </div><input aria-label="执行进度" type="range" min={0} max={max} value={cursor} onChange={event => move(Number(event.target.value))} /><output className="step-count">{cursor} / {max}</output><select aria-label="播放速度" value={speed} onChange={event => setSpeed(Number(event.target.value))}>{[0.5, 1, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></div>
    <div className="lesson-support">
      <details><summary>观察之后，检查自己是否理解</summary><ul><li>call 后，RBP 是否立刻指向新栈帧？</li><li>sub 改变 RSP 时，内存内容发生变化了吗？</li><li>leave 后与 ret 后，当前执行的函数分别是谁？</li><li>栈帧释放后，原来的字节是否还在内存中？</li></ul><p>点击上方关键步骤，前后各走一步，对照寄存器、栈槽和下一条指令。</p></details>
      <details id="gdb-verification"><summary>在 GDB/GEF 中验证同一个独立示例</summary><p>在 Linux x86-64 环境下载 <a href={`${import.meta.env.BASE_URL}examples/stack-demo.s`} download>stack-demo.s</a>，运行：</p><pre>{["gcc -g -no-pie stack-demo.s -o stack-demo", "gdb ./stack-demo"].join("\n")}</pre><pre>{["set disassembly-flavor att", "break *main", "run", "disassemble main", "disassemble foo", "disassemble bar", "info registers rsp rbp rip rax rdi", "x/8gx $rsp", "si"].join("\n")}</pre><p>每次 si 后再次查看寄存器和栈；安装 GEF 时也可直接观察它的上下文面板。比较指令前后的变化和返回目标，不要要求绝对地址与网页相同。</p><p>下载文件与本页使用相同指令，附带汇编和链接所需声明。真实代码地址由指令编码长度决定，本页以固定间隔编号；入口标记和寄存器初值也属于演示约定。</p></details>
      <details><summary>哪些结论可以推广？</summary><p>这里展示 64 位近调用：call 压入返回地址，ret 取出返回地址；push/pop 修改栈顶。RBP 作为帧指针是本例的选择，优化后的程序可能省略帧指针、内联函数或使用不同布局。参数、局部变量也不一定放在栈上。</p><p>先用本页理解机制，再回到实验，用 GDB/GEF 分析目标二进制。更多操作可切换到“输入汇编”；“原版示例”为上游预设轨迹。</p></details>
    </div>
    <footer className="play-footer"><p>快捷键：← / → 单步 · 空格播放 · Home / End 跳转</p><p>基于 <a href="https://github.com/NickZhuxy/Stack-Frame-Visualization">Nick Zhu 的原项目</a> · 教学扩展：<a href="https://github.com/Mention25/Stack-Frame-Visualization">Mention25</a> · <a href={`${import.meta.env.BASE_URL}attribution.html`}>来源与许可</a></p></footer>
  </div>;
}
