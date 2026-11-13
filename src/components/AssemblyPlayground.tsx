import { useEffect, useMemo, useReducer, useState } from "react";
import { appReducer, initialState } from "../state";
import type { AppAction } from "../state";
import { AssemblyError, MAX_STEPS, runAssembly } from "../emulator/machine";
import type { Syntax } from "../emulator/machine";
import { assemblyLines, displayRegisters, stackEntries } from "../emulator/presentation";
import { examples } from "../emulator/examples";
import { lessonSource, lessonCheckpoints } from "../emulator/lesson";
import { AsmPanel } from "./AsmPanel";
import { StackView } from "./StackView";
import { RegisterPanel } from "./RegisterPanel";
import { NarrationBox } from "./NarrationBox";
import { ResizableGrid } from "./ResizableGrid";
import { TransportBar } from "./TransportBar";
import { Legend } from "./Legend";

type Draft = { source: string; syntax: Syntax };
const storageKey = "stack-assembly-draft-v1";
function readDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved.source === "string" && saved.source.length <= 24000 && ["att", "intel"].includes(saved.syntax)) return saved;
  } catch { /* Optional persistence. */ }
  return { source: examples[0].source, syntax: examples[0].syntax };
}
function attempt(draft: Draft) {
  try { return { execution: runAssembly(draft.source, draft.syntax), error: undefined }; }
  catch (error) { return { execution: null, error: error instanceof AssemblyError ? { line: error.line, message: error.message } : { line: 0, message: "无法执行，请检查代码。" } }; }
}

export function AssemblyPlayground({ lesson = false }: { lesson?: boolean }) {
  const [initial] = useState(() => { const draft: Draft = lesson ? {source:lessonSource,syntax:"att"} : readDraft(); return {draft,...attempt(draft)}; });
  const [draft, setDraft] = useState(initial.draft);
  const [loaded, setLoaded] = useState(initial.draft);
  const [result, setResult] = useState({execution: initial.execution, error: initial.error});
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [editing, setEditing] = useState(!lesson);
  const [decimal, setDecimal] = useState(false);
  const [showFreed, setShowFreed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dirty = draft.source !== loaded.source || draft.syntax !== loaded.syntax;
  const execution = result.execution;
  const maxStep = execution ? execution.states.length - 1 : 0;
  const cursor = Math.min(state.currentStep, maxStep);
  const machine = execution?.states[cursor];
  const previous = execution?.states[cursor - 1];
  const next = machine && !machine.halted ? execution?.program.instructions[machine.pc] : undefined;
  const canNavigate = !!execution && !dirty && !editing;
  const issue = result.error || execution?.issue;
  const asmCode = useMemo(() => execution ? assemblyLines(loaded.source, execution) : [], [execution,loaded.source]);
  const points = useMemo(() => lesson && execution ? lessonCheckpoints(execution) : [], [lesson,execution]);
  const checkpoint = [...points].reverse().find(point => point.step <= cursor);
  const registers = machine ? displayRegisters(machine, decimal) : undefined;
  const prevRegisters = previous ? displayRegisters(previous, decimal) : undefined;
  const stack = useMemo(() => machine ? stackEntries(machine,previous,showFreed,decimal,lesson) : [], [machine,previous,showFreed,decimal,lesson]);
  const currentFunction = machine?.frames.at(-1)?.name || "已结束";
  const names = [...new Set(machine?.frames.map(frame => frame.name) || [])];
  const phases = points.length ? points.map(point => ({name:point.title,startStep:point.step})) : execution ? execution.states.flatMap((s,index) => s.lastInstruction.startsWith("call ") ? [{name:s.lastInstruction,startStep:index}] : []).slice(0,8) : [];

  const stop = () => { if (state.isPlaying) dispatch({type:"TOGGLE_PLAY"}); };
  const navigate = (action: AppAction) => { if (!canNavigate) return; if (!["TOGGLE_PLAY","SET_SPEED"].includes(action.type)) stop(); dispatch(action); };
  function edit(update: Partial<Draft>) { stop(); setDraft(value => ({...value,...update})); }
  function execute(value = draft) { setResult(attempt(value)); setLoaded({...value}); setDraft(value); setEditing(false); dispatch({type:"SET_TRACE",traceId:"input"}); }

  useEffect(() => { if (!lesson) { try { localStorage.setItem(storageKey,JSON.stringify(draft)); } catch { /* Optional persistence. */ } } }, [draft,lesson]);
  useEffect(() => {
    if (!state.isPlaying || !canNavigate) return;
    const timer = setInterval(() => dispatch({type:"NEXT_STEP",maxStep}),1400/state.playbackSpeed);
    return () => clearInterval(timer);
  }, [state.isPlaying,state.playbackSpeed,maxStep,canNavigate]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!canNavigate || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("textarea,input,select,button,a,summary")) return;
      if (!["ArrowRight","ArrowLeft","Home","End"," "].includes(event.key)) return;
      event.preventDefault();
      if (event.key !== " ") stop();
      if (event.key === "ArrowRight") dispatch({type:"NEXT_STEP",maxStep});
      if (event.key === "ArrowLeft") dispatch({type:"PREV_STEP"});
      if (event.key === "Home") dispatch({type:"FIRST_STEP"});
      if (event.key === "End") dispatch({type:"LAST_STEP",maxStep});
      if (event.key === " ") dispatch({type:"TOGGLE_PLAY"});
    };
    window.addEventListener("keydown",listener); return () => window.removeEventListener("keydown",listener);
  }, [canNavigate,maxStep,state.isPlaying]);

  return <div className="classic-workspace">
    <div className="classic-toolbar">
      {lesson ? <strong>main → foo → bar · 调用栈入门</strong> : <>
        <label>示例 <select aria-label="选择汇编示例" value="" onChange={event => { const example=examples.find(e=>e.id===event.target.value); if(example) execute(example); }}><option value="" disabled>载入示例…</option>{examples.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>语法 <select aria-label="汇编语法" value={draft.syntax} onChange={event => { setEditing(true); edit({syntax:event.target.value as Syntax}); }}><option value="att">AT&T</option><option value="intel">Intel</option></select></label>
        <button onClick={() => { stop(); setEditing(true); }}>编辑汇编</button><button onClick={()=>execute()}>执行代码</button>
      </>}
      <label>数值 <select aria-label="数值格式" value={decimal ? "decimal":"hex"} onChange={event=>setDecimal(event.target.value==="decimal")}><option value="hex">十六进制</option><option value="decimal">有符号十进制</option></select></label>
      <span className="classic-status" role="status">{dirty ? "代码已修改，请重新执行" : editing ? "编辑后点击执行 · Ctrl+Enter" : `已执行 ${cursor} / ${maxStep} 条指令`}</span>
    </div>
    <p className="classic-context">通用教学示例 · 虚拟地址 · {lesson ? "System V AMD64，保留帧指针。" : "代码仅在浏览器中处理。"}实验结论请用 GDB/GEF 从实际二进制中获取。</p>
    {issue && !dirty && <p className="classic-error" role="alert">第 {issue.line} 行：{issue.message}{execution && " 可回退查看停止前的状态。"}</p>}
    <div className={`classic-grid ${dirty || editing ? "is-editing" : ""}`}>
      <ResizableGrid storageKey="stack-three-columns-v1">
        {editing ? <section className="assembly-editor upstream-panel"><h2>x86-64 ASSEMBLY</h2><p>直接输入汇编 · {draft.syntax === "att" ? "源 → 目的" : "目的 ← 源"}</p><textarea aria-label="汇编代码输入" value={draft.source} spellCheck={false} autoCapitalize="off" autoComplete="off" wrap="off" maxLength={24000} onChange={event=>edit({source:event.target.value})} onKeyDown={event=>{if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)){event.preventDefault();execute();}}}/></section> : <AsmPanel asmCode={asmCode} activeLine={machine?.lastLine || 0} nextLine={next?.line} currentFunction={currentFunction} toolbar={<p className="assembly-caption">高亮：刚执行 · ← next：下一条</p>} />}
        <StackView stack={stack} rsp={Number(machine?.registers.rsp)} rbp={Number(machine?.registers.rbp)} currentFunction={currentFunction} addressFormat="hex" toolbar={<label className="stack-options"><input type="checkbox" checked={showFreed} onChange={event=>setShowFreed(event.target.checked)}/> 查看已释放位置的残留数据 · 每格 8 字节</label>} />
        <div className="classic-sidebar">
          {registers && <RegisterPanel registers={registers} prevRegisters={prevRegisters} expanded={expanded}/>}
          {!lesson && <details className="register-details" onToggle={event=>setExpanded(event.currentTarget.open)}><summary>更多寄存器与标志位</summary><p>{Object.entries(machine?.flags || {}).map(([name,value])=>`${name}=${value===null?"?":Number(value)}`).join(" · ")}</p></details>}
          <NarrationBox stepNumber={cursor} totalSteps={maxStep+1} title={cursor===0 ? "Program Start" : machine?.lastInstruction || "等待执行"} description={machine ? `${machine.explanation}${next ? ` 下一条：${next.text}` : ""}` : "修正代码后点击执行。"}/>
          <Legend names={names}/>
          {checkpoint && <details className="upstream-panel stage-note"><summary>阶段讲解 · {checkpoint.title}</summary><p>{checkpoint.text}</p></details>}
        </div>
      </ResizableGrid>
    </div>
    <fieldset className="transport-lock" disabled={!canNavigate}><TransportBar state={{...state,currentStep:cursor}} dispatch={navigate} maxStep={maxStep} phases={phases}/></fieldset>
    {!lesson && <details className="classic-help"><summary>支持的语法与执行约定</summary><p>支持 AT&T / Intel，16 个通用寄存器及其 32 位别名；mov、lea、push/pop、整数算术、比较、条件跳转、call/ret/leave。4 KiB 栈，最多 {MAX_STEPS} 步。不支持系统调用、外部函数、数据段、8/16 位寄存器、浮点和 SIMD。</p><p>本页解释执行指令，不生成机器码；代码地址以固定间隔编号。修改代码后需再次执行；编辑器中的方向键不会触发步进。</p></details>}
  </div>;
}
