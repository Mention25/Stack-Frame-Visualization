import { useEffect, useRef, useState } from "react";
import { AssemblyError, CODE_BASE, END_ADDRESS, MAX_STEPS, REGISTER_NAMES, STACK_BASE, STACK_TOP, hex, instructionAddress, runAssembly } from "../emulator/machine";
import type { Execution, MachineState, Syntax } from "../emulator/machine";
import { examples } from "../emulator/examples";
import "../styles/playground.css";

type Draft = { source: string; syntax: Syntax };
const storageKey = "stack-assembly-draft-v1";
function readDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved.source === "string" && saved.source.length <= 24000 && ["att", "intel"].includes(saved.syntax)) return saved;
  } catch { /* Storage can be disabled by the browser. */ }
  return { source: examples[0].source, syntax: examples[0].syntax };
}
function attempt(draft: Draft) {
  try { return { execution: runAssembly(draft.source, draft.syntax), error: undefined }; }
  catch (error) { return { execution: null, error: error instanceof AssemblyError ? { line: error.line, message: error.message } : { line: 0, message: "无法执行，请检查代码。" } }; }
}
const formatValue = (value: bigint, decimal: boolean) => decimal ? BigInt.asIntN(64, value).toString() : hex(value);

export function RegisterView({ state, previous, decimal, compact = false }: { state: MachineState; previous?: MachineState; decimal: boolean; compact?: boolean }) {
  return <section className="live-panel register-section" aria-label="寄存器">
    <div className="panel-heading"><h2>寄存器</h2><span>变化值高亮</span></div>
    <div className="register-grid">
      {REGISTER_NAMES.filter(name => !compact || ["rax", "rdi", "rbp", "rsp"].includes(name)).map(name => <div key={name} className={`live-register ${previous && previous.registers[name] !== state.registers[name] ? "changed" : ""}`}>
        <span>{name.toUpperCase()}</span><output data-register={name} title={`无符号值 ${state.registers[name]}`}>{formatValue(state.registers[name], decimal)}</output>
      </div>)}
    </div>
    <p className="virtual-rip">RIP（虚拟）<output>{state.halted ? "已结束" : hex(instructionAddress(state.pc), 6)}</output></p>
    <div className="flag-row">{Object.entries(state.flags).map(([name, value]) => <span key={name} className={previous && previous.flags[name as keyof typeof state.flags] !== value ? "changed-flag" : ""}>{name} <b>{value === null ? "?" : Number(value)}</b></span>)}</div>
  </section>;
}

export function StackMemory({ state, previous, decimal, lesson = false }: { state: MachineState; previous?: MachineState; decimal: boolean; lesson?: boolean }) {
  const [showFreed, setShowFreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!lesson) return;
    const parent = scrollRef.current;
    const active = parent?.querySelector<HTMLElement>(".at-rsp");
    if (parent && active) {
      const box = active.getBoundingClientRect(), viewport = parent.getBoundingClientRect();
      if (box.top < viewport.top) parent.scrollTop += box.top - viewport.top;
      else if (box.bottom > viewport.bottom) parent.scrollTop += box.bottom - viewport.bottom;
    }
  }, [lesson, state.registers.rsp, showFreed]);
  const rsp = Number(state.registers.rsp), rbp = Number(state.registers.rbp);
  let low = Math.max(STACK_BASE, Math.floor(rsp / 8) * 8);
  if (showFreed) {
    const first = state.initialized.findIndex(value => value !== 0);
    if (first >= 0) low = Math.min(low, STACK_BASE + Math.floor(first / 8) * 8);
  }
  const rows: number[] = [];
  for (let address = STACK_TOP - 8; address >= low; address -= 8) rows.push(address);
  return <section className="live-panel stack-section" aria-label="栈内存">
    <div className="panel-heading"><h2>栈内存</h2><span>每格 8 字节 · 小端序</span></div>
    <div className="stack-summary"><span>RSP <b>{hex(state.registers.rsp, 4)}</b></span><span>RBP <b>{hex(state.registers.rbp, 4)}</b></span></div>
    <label className="freed-toggle"><input type="checkbox" checked={showFreed} onChange={event => setShowFreed(event.target.checked)} />查看已释放位置的残留数据</label>
    <div className="stack-direction">高地址</div>
    <div className="live-stack-scroll" ref={scrollRef}>
      {rows.length === 0 && <p className="empty-stack">栈空间已释放，入口函数已返回。</p>}
      {rows.map(address => {
        const offset = address - STACK_BASE;
        let word = 0n, complete = true, changed = false;
        const bytes: string[] = [];
        for (let i = 0; i < 8; i++) {
          complete &&= !!state.initialized[offset + i];
          word |= BigInt(state.memory[offset + i]) << BigInt(i * 8);
          bytes.push(state.initialized[offset + i] ? state.memory[offset + i].toString(16).padStart(2, "0") : "??");
          if (previous && (state.memory[offset + i] !== previous.memory[offset + i] || state.initialized[offset + i] !== previous.initialized[offset + i])) changed = true;
        }
        const atRsp = rsp >= address && rsp < address + 8;
        const atRbp = rbp >= address && rbp < address + 8;
        const returned = state.frames.find(frame => frame.stackAddress === address);
        const owner = [...state.frames].reverse().find(frame => address <= frame.stackAddress);
        const freed = address + 8 <= rsp;
        let label = returned ? (returned.returnAddress === END_ADDRESS ? "入口返回标记" : `${returned.name} 的返回地址`) : owner ? `${owner.name} 的栈空间` : "残留数据";
        if (lesson && owner && !returned && !freed) {
          if (address === owner.stackAddress - 8) label = `${owner.name} 保存的调用者 RBP`;
          else if (owner.name === "foo" && address === owner.stackAddress - 16) label = complete ? "foo 的局部槽 x = 7" : "foo 的局部槽 x（未初始化）";
          else label = `${owner.name} 的对齐空间（未写入）`;
        }
        return <div key={address} data-stack-address={address} className={`memory-row ${changed ? "memory-changed" : ""} ${freed ? "memory-freed" : ""} ${atRsp ? "at-rsp" : ""}`}>
          <div className="memory-address"><span>{hex(BigInt(address), 4)}</span><span>{atRsp && <b>← RSP{rsp !== address ? `+${rsp - address}` : ""}</b>}{atRbp && <em>← RBP{rbp !== address ? `+${rbp - address}` : ""}</em>}</span></div>
          <output title={`从低地址到高地址：${bytes.join(" ")}`}>{complete ? formatValue(word, decimal) : `0x${[...bytes].reverse().join("")}`}</output>
          <small>{label}{freed ? " · 已释放" : ""}</small>
        </div>;
      })}
    </div>
    <div className="stack-direction">↓ 栈向低地址增长 · ?? 表示未初始化字节</div>
  </section>;
}

export function AssemblyPlayground() {
  const [initial] = useState(() => { const draft = readDraft(); return { draft, ...attempt(draft) }; });
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [loaded, setLoaded] = useState<Draft>(initial.draft);
  const [execution, setExecution] = useState<Execution | null>(initial.execution);
  const [parseError, setParseError] = useState(initial.error);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [decimal, setDecimal] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const dirty = draft.source !== loaded.source || draft.syntax !== loaded.syntax;
  const max = execution ? execution.states.length - 1 : 0;
  const state = execution?.states[Math.min(cursor, max)];
  const previous = cursor > 0 ? execution?.states[cursor - 1] : undefined;
  const activeLine = !dirty ? state?.lastLine || 0 : 0;
  const next = state && !state.halted ? execution?.program.instructions[state.pc] : undefined;
  const issue = parseError || execution?.issue;
  const canNavigate = !!execution && !dirty;

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Optional local persistence. */ } }, [draft]);
  useEffect(() => {
    if (!playing || !canNavigate) return;
    if (cursor >= max) { setPlaying(false); return; }
    const timer = setTimeout(() => setCursor(value => Math.min(max, value + 1)), 850 / speed);
    return () => clearTimeout(timer);
  }, [playing, cursor, max, speed, canNavigate]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeLine || dirty) return;
    const top = (activeLine - 1) * 23;
    if (top < editor.scrollTop || top > editor.scrollTop + editor.clientHeight - 50) editor.scrollTop = Math.max(0, top - editor.clientHeight / 3);
    setScrollTop(editor.scrollTop);
  }, [activeLine, dirty]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("textarea, input, select, button, a") || target.isContentEditable)) return;
      if (!canNavigate || event.ctrlKey || event.metaKey || event.altKey) return;
      if (["ArrowRight", "ArrowLeft", "Home", "End", " "].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowRight") { setPlaying(false); setCursor(value => Math.min(max, value + 1)); }
      if (event.key === "ArrowLeft") { setPlaying(false); setCursor(value => Math.max(0, value - 1)); }
      if (event.key === "Home") { setPlaying(false); setCursor(0); }
      if (event.key === "End") { setPlaying(false); setCursor(max); }
      if (event.key === " " && cursor < max) setPlaying(value => !value);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [canNavigate, cursor, max]);

  function edit(update: Partial<Draft>) { setPlaying(false); setDraft(value => ({ ...value, ...update })); }
  function execute(value = draft) {
    setPlaying(false); setCursor(0); setScrollTop(0);
    if (editorRef.current) editorRef.current.scrollTop = 0;
    const result = attempt(value);
    setExecution(result.execution); setParseError(result.error); setLoaded({ ...value });
  }
  function selectExample(id: string) {
    const example = examples.find(x => x.id === id);
    if (!example) return;
    const value = { source: example.source, syntax: example.syntax };
    setDraft(value); execute(value);
  }
  function move(index: number) { setPlaying(false); setCursor(index); }

  return <div className="playground">
    <div className="play-intro">
      <div><h1>输入汇编，观察调用栈</h1><p>编辑代码 → 执行代码 → 单步查看栈帧、返回地址与寄存器。代码在浏览器内处理。</p></div>
      <button className="quiet-button" onClick={() => setShowHelp(value => !value)} aria-expanded={showHelp}>支持的语法 {showHelp ? "▴" : "▾"}</button>
    </div>
    {showHelp && <section className="syntax-help" aria-label="支持的语法">
      <p><b>语法：</b>AT&T 源在前、目的在后（<code>movq $7, %rax</code>）；Intel 目的在前（<code>mov rax, 7</code>）。支持 16 个通用寄存器及其 32 位别名。内存写入需可推导宽度，如 <code>movq $7, -8(%rbp)</code> 或 <code>mov qword ptr [rbp-8], 7</code>。</p>
      <p><b>指令：</b>mov、lea、push/pop（64 位）、add/sub、and/or/xor、cmp/test、inc/dec/neg/not、双操作数 imul、call/ret/leave、nop、movslq/movsxd、cltq/cdqe，以及常用条件跳转 je/jne/jg/jge/jl/jle/ja/jae/jb/jbe 等。AT&T 支持 q/l 后缀；支持标签和 # 注释，Intel 也支持 ; 注释。</p>
      <p><b>执行约定：</b>入口依次选择 _start、main 或第一条指令。4 KiB 栈、最多 {MAX_STEPS} 步；未初始化读取、越界、不匹配的返回地址会停止执行。仅支持直接标签调用／跳转，不支持系统调用、外部函数、数据段、8/16 位、浮点或 SIMD 指令。</p>
      <p>本页按指令语义解释执行，不生成机器码。代码地址从 {hex(CODE_BASE, 6)} 起以 8 为间隔编号，仅用于显示返回过程；它们不代表实际指令长度。请用 GDB/GEF 在实际二进制中检验原理。</p>
    </section>}
    <div className="play-toolbar">
      <label>示例 <select aria-label="选择汇编示例" value="" onChange={event => selectExample(event.target.value)}><option value="" disabled>载入示例…</option>{examples.map(example => <option key={example.id} value={example.id}>{example.name}</option>)}</select></label>
      <label>语法 <select aria-label="汇编语法" value={draft.syntax} onChange={event => edit({ syntax: event.target.value as Syntax })}><option value="att">AT&T</option><option value="intel">Intel</option></select></label>
      <button className="primary-button" onClick={() => execute()} title="Ctrl / Command + Enter">执行代码</button>
      <span className={`execution-status ${dirty ? "draft-status" : ""}`} role="status">{dirty ? "代码已修改，请重新执行" : !execution ? "等待有效代码" : `已计算 ${max} 条指令${execution.complete ? " · 可单步或播放" : " · 在错误处停止"}`}</span>
      <label className="format-picker">数值 <select aria-label="数值格式" value={decimal ? "decimal" : "hex"} onChange={event => setDecimal(event.target.value === "decimal")}><option value="hex">十六进制</option><option value="decimal">有符号十进制</option></select></label>
    </div>
    {issue && !dirty && <div className="execution-error" role="alert"><b>第 {issue.line} 行：</b>{issue.message}{execution && ` 已保留前 ${max} 步，可回退检查。`}</div>}
    <div className={`play-layout ${dirty ? "has-draft" : ""}`}>
      <section className="live-panel editor-section" aria-label="汇编编辑器">
        <div className="panel-heading"><h2>汇编代码</h2><span>{draft.syntax === "att" ? "源 → 目的" : "目的 ← 源"} · Ctrl+Enter 执行</span></div>
        <div className="code-editor">
          <div className="line-gutter" aria-hidden="true"><div style={{ transform: `translateY(-${scrollTop}px)` }}>{draft.source.split("\n").map((_, index) => <div key={index} className={index + 1 === activeLine ? "executed-line" : !dirty && next?.line === index + 1 ? "next-line" : ""}>{index + 1}</div>)}</div></div>
          {activeLine > 0 && <div className="active-code-line" style={{ top: 12 + (activeLine - 1) * 23 - scrollTop }} aria-hidden="true" />}
          <textarea ref={editorRef} aria-label="汇编代码输入" value={draft.source} spellCheck={false} autoCapitalize="off" autoComplete="off" wrap="off" maxLength={24000}
            onChange={event => edit({ source: event.target.value })} onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
            onKeyDown={event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); execute(); } }} />
        </div>
        <div className="editor-caption"><span>青色：刚执行的指令</span><span>黄色行号：下一条</span></div>
      </section>
      {state ? <>
        <StackMemory state={state} previous={previous} decimal={decimal} />
        <div className="state-column">
          <RegisterView state={state} previous={previous} decimal={decimal} />
          <section className="live-panel call-section" aria-label="函数调用链"><div className="panel-heading"><h2>函数调用链</h2><span>{state.frames.length} 层</span></div>
            <ol className="call-frames">{state.frames.map((frame, index) => <li key={index} className={index === state.frames.length - 1 ? "current-frame" : ""}><span>{index === state.frames.length - 1 ? "▶" : "↳"} {frame.name}</span><small>返回地址存于 {hex(BigInt(frame.stackAddress), 4)}</small></li>)}</ol>
            {!state.frames.length && <p className="empty-stack">所有调用已返回。</p>}
          </section>
          <section className="live-panel step-explanation" aria-label="执行说明"><h2>{cursor === 0 ? "初始状态" : `第 ${cursor} 步 · 源码第 ${state.lastLine} 行`}</h2><code>{state.lastInstruction}</code><p>{state.explanation}</p>{next && <small>下一条：L{next.line} · {next.text}</small>}</section>
        </div>
      </> : <div className="execution-placeholder"><p>修正代码后点击“执行代码”。</p><p>栈和寄存器将由输入的指令自动计算。</p></div>}
    </div>
    <div className="play-transport" aria-label="执行控制">
      <div className="transport-buttons">
        <button disabled={!canNavigate || cursor === 0} onClick={() => move(0)} title="回到初始状态">重置</button>
        <button disabled={!canNavigate || cursor === 0} onClick={() => move(cursor - 1)}>← 回退</button>
        <button className="play-button" disabled={!canNavigate || cursor >= max} onClick={() => setPlaying(value => !value)}>{playing ? "暂停" : "播放"}</button>
        <button disabled={!canNavigate || cursor >= max} onClick={() => move(cursor + 1)}>单步 →</button>
        <button disabled={!canNavigate || cursor >= max} onClick={() => move(max)}>到最后</button>
      </div>
      <input aria-label="执行进度" type="range" min={0} max={max} value={Math.min(cursor, max)} disabled={!canNavigate || !max} onChange={event => move(Number(event.target.value))} />
      <output className="step-count" data-step={cursor}>{cursor} / {max}</output>
      <select aria-label="播放速度" value={speed} onChange={event => setSpeed(Number(event.target.value))}>{[0.5, 1, 2, 4].map(value => <option key={value} value={value}>{value}×</option>)}</select>
    </div>
    <footer className="play-footer"><p>通用教学解释器 · 虚拟地址 · 实验结论请用 GDB/GEF 在实际二进制中验证。</p><p>原项目：<a href="https://github.com/NickZhuxy/Stack-Frame-Visualization">Nick Zhu / Stack-Frame-Visualization</a> · 交互执行与部署：<a href="https://github.com/Mention25/Stack-Frame-Visualization">Mention25</a> · <a href={`${import.meta.env.BASE_URL}attribution.html`} target="_blank" rel="noopener noreferrer">来源与许可说明</a></p></footer>
  </div>;
}
