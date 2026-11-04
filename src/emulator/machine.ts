// A bounded teaching interpreter. Code addresses identify instructions, not encoded bytes.
export type Syntax = "att" | "intel";
export const REGISTER_NAMES = ["rax", "rbx", "rcx", "rdx", "rsi", "rdi", "rbp", "rsp", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15"] as const;
export type Register = typeof REGISTER_NAMES[number];
export type Flags = Record<"ZF" | "SF" | "CF" | "OF" | "PF", boolean | null>;
export const STACK_BASE = 0x7000;
export const STACK_TOP = 0x8000;
export const CODE_BASE = 0x400000n;
export const MAX_STEPS = 2000;
export const END_ADDRESS = 0xffffffffffffffffn;
const SOURCE_LIMIT = 24000;
type Width = 32 | 64;
type RegisterOperand = { kind: "reg"; name: Register; width: Width };
type MemoryOperand = { kind: "mem"; base?: Register; index?: Register; scale: number; displacement: bigint; width?: Width };
type Operand = RegisterOperand | MemoryOperand | { kind: "imm"; value: bigint };
export type Instruction = { op: string; operands: Operand[]; width: Width; target?: string; line: number; text: string };
export type Program = { instructions: Instruction[]; labels: Map<string, number>; entry: number; entryName: string };
export type Frame = { name: string; returnAddress: bigint; stackAddress: number };
export type MachineState = {
  registers: Record<Register, bigint>;
  flags: Flags;
  memory: Uint8Array;
  initialized: Uint8Array;
  frames: Frame[];
  pc: number;
  lastLine: number;
  lastInstruction: string;
  halted: boolean;
  explanation: string;
};
export type Execution = { program: Program; states: MachineState[]; issue?: { line: number; message: string }; complete: boolean };
export class AssemblyError extends Error {
  line: number;
  constructor(line: number, message: string) { super(message); this.name = "AssemblyError"; this.line = line; }
}
const aliases = new Map<string, RegisterOperand>();
REGISTER_NAMES.forEach((name, i) => {
  aliases.set(name, { kind: "reg", name, width: 64 });
  const small = i < 8 ? ["eax", "ebx", "ecx", "edx", "esi", "edi", "ebp", "esp"][i] : `${name}d`;
  aliases.set(small, { kind: "reg", name, width: 32 });
});
const jumps = new Set(["jmp", "je", "jz", "jne", "jnz", "jg", "jnle", "jge", "jnl", "jl", "jnge", "jle", "jng", "ja", "jnbe", "jae", "jnb", "jnc", "jb", "jnae", "jc", "jbe", "jna", "js", "jns", "jo", "jno", "jp", "jpe", "jnp", "jpo"]);
const binary = new Set(["mov", "lea", "add", "sub", "and", "or", "xor", "cmp", "test", "imul", "movsx"]);
const unary = new Set(["push", "pop", "inc", "dec", "neg", "not"]);
const plain = new Set(["leave", "ret", "nop", "cdqe"]);
const suffixed = new Set([...binary, ...unary].filter(x => x !== "movsx"));
const u64 = (value: bigint) => BigInt.asUintN(64, value);
export const instructionAddress = (index: number) => CODE_BASE + BigInt(index) * 8n;
export const hex = (value: bigint, pad = 16) => `0x${u64(value).toString(16).padStart(pad, "0")}`;
function fail(line: number, message: string): never { throw new AssemblyError(line, message); }
function integer(text: string, line: number): bigint {
  if (!/^[+-]?(?:0x[0-9a-f]+|[0-9]+)$/i.test(text)) fail(line, `无法识别整数“${text}”；支持十进制、0x 十六进制及负数。`);
  const sign = text[0] === "-" ? -1n : 1n;
  const result = sign * BigInt(text.replace(/^[+-]/, ""));
  if (result < -(1n << 63n) || result > (1n << 64n) - 1n) fail(line, "整数超出 64 位范围。");
  return result;
}
function register(text: string, line: number, syntax: Syntax): RegisterOperand {
  if ((syntax === "att") !== text.startsWith("%")) fail(line, `寄存器“${text}”与所选语法不符。`);
  const found = aliases.get(text.replace(/^%/, "").toLowerCase());
  if (!found) fail(line, `不支持寄存器“${text}”；请使用通用 64 位或 32 位寄存器。`);
  return { ...found };
}
function addressRegister(text: string, line: number, syntax: Syntax): Register {
  const found = register(text, line, syntax);
  if (found.width !== 64) fail(line, "内存寻址请使用 64 位基址／索引寄存器。");
  return found.name;
}
function splitOperands(text: string, line: number): string[] {
  if (!text.trim()) return [];
  const parts: string[] = [];
  const brackets: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "(" || char === "[") brackets.push(char);
    if (char === ")" || char === "]") {
      const open = brackets.pop();
      if (open !== (char === ")" ? "(" : "[")) fail(line, "操作数括号不匹配。");
    }
    if (char === "," && !brackets.length) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  if (brackets.length) fail(line, "操作数括号不匹配。");
  parts.push(text.slice(start).trim());
  if (parts.some(x => !x)) fail(line, "缺少操作数。");
  return parts;
}
function operand(text: string, line: number, syntax: Syntax): Operand {
  if (syntax === "att") {
    if (text.startsWith("$")) return { kind: "imm", value: integer(text.slice(1), line) };
    if (text.startsWith("%")) return register(text, line, syntax);
    const match = text.match(/^([+-]?(?:0x[0-9a-f]+|\d+))?\(([^()]*)\)$/i);
    if (!match) fail(line, `不支持操作数“${text}”。AT&T 使用 $立即数、%寄存器、偏移(%基址,%索引,比例)。`);
    const fields = match[2].split(",").map(x => x.trim());
    if (fields.length > 3 || (!fields[0] && !fields[1])) fail(line, "内存操作数需要基址或索引。");
    const base = fields[0] ? addressRegister(fields[0], line, syntax) : undefined;
    const index = fields[1] ? addressRegister(fields[1], line, syntax) : undefined;
    const scale = fields[2] ? Number(integer(fields[2], line)) : 1;
    if (![1, 2, 4, 8].includes(scale) || (fields[2] && !index) || index === "rsp") fail(line, "索引比例只支持 1/2/4/8，且 %rsp 不能作为索引寄存器。");
    const displacement = match[1] ? integer(match[1], line) : 0n;
    if (displacement !== BigInt.asIntN(32, displacement)) fail(line, "内存位移必须是有符号 32 位整数。");
    return { kind: "mem", base, index, scale, displacement };
  }
  if (aliases.has(text.toLowerCase())) return register(text, line, syntax);
  if (/^[+-]?(?:0x[0-9a-f]+|\d+)$/i.test(text)) return { kind: "imm", value: integer(text, line) };
  const match = text.match(/^(?:(qword|dword)\s+(?:ptr\s+)?)?\[([^\[\]]+)\]$/i);
  if (!match) fail(line, `不支持操作数“${text}”。Intel 使用寄存器、立即数及 [基址+索引*比例+偏移]。`);
  const expression = match[2].replace(/\s+/g, "");
  const terms = expression.match(/[+-]?[^+-]+/g) || [];
  if (terms.join("") !== expression) fail(line, "内存地址表达式无效。");
  let base: Register | undefined, index: Register | undefined, scale = 1, displacement = 0n;
  for (let term of terms) {
    const negative = term.startsWith("-");
    term = term.replace(/^[+-]/, "");
    if (/^(?:0x[0-9a-f]+|\d+)$/i.test(term)) { displacement += integer(term, line) * (negative ? -1n : 1n); continue; }
    if (negative) fail(line, "不支持减去寄存器作为地址。");
    const product = term.split("*");
    if (product.length > 2) fail(line, "内存索引表达式无效。");
    const name = addressRegister(product[0], line, syntax);
    if (product.length === 2 || base) {
      if (index) fail(line, "内存地址只支持一个索引寄存器。");
      index = name;
      scale = product[1] ? Number(integer(product[1], line)) : 1;
      if (![1, 2, 4, 8].includes(scale) || index === "rsp") fail(line, "索引比例只支持 1/2/4/8，且 rsp 不能作为索引。");
    } else base = name;
  }
  if (!base && !index) fail(line, "内存地址需要基址或索引寄存器。");
  if (displacement !== BigInt.asIntN(32, displacement)) fail(line, "内存位移必须是有符号 32 位整数。");
  return { kind: "mem", base, index, scale, displacement, width: match[1] ? (match[1].toLowerCase() === "qword" ? 64 : 32) : undefined };
}

export function parseAssembly(source: string, syntax: Syntax = "att"): Program {
  if (source.length > SOURCE_LIMIT) fail(1, `代码最多 ${SOURCE_LIMIT} 个字符。`);
  const lines = source.split(/\r?\n/);
  if (lines.length > 500) fail(501, "代码最多 500 行。");
  const instructions: Instruction[] = [];
  const labels = new Map<string, number>();
  lines.forEach((raw, offset) => {
    const line = offset + 1;
    let text = raw.replace(syntax === "att" ? /#.*/ : /[;#].*/, "").trim();
    if (!text) return;
    if (syntax === "att" && text.includes(";")) fail(line, "AT&T 模式每行只支持一条指令；请用换行分隔，并用 # 添加注释。");
    if (text.startsWith(".")) {
      if (text === ".text") return;
      if (/^\.(?:globl|global|type|size|p2align|align|cfi_startproc|cfi_endproc|cfi_def_cfa_offset|cfi_offset|cfi_def_cfa_register|cfi_def_cfa|cfi_restore|cfi_remember_state|cfi_restore_state)(?:\s|$)/.test(text)) return;
      if (/^\.section\s+\.text\s*$/.test(text)) return;
      if (text === ".att_syntax prefix" || text === ".att_syntax" || text === ".intel_syntax noprefix") {
        if (text.startsWith(syntax === "att" ? ".att_syntax" : ".intel_syntax")) return;
        fail(line, "语法指令与上方语法选择不一致，请切换语法。");
      }
    }
    const label = text.match(/^([A-Za-z_.$][\w.$]*):\s*/);
    if (label) {
      if (labels.has(label[1])) fail(line, `标签“${label[1]}”重复。`);
      labels.set(label[1], instructions.length);
      text = text.slice(label[0].length).trim();
      if (!text) return;
    }
    const tokens = text.match(/^(\S+)(?:\s+(.*))?$/)!;
    let op = tokens[1].toLowerCase();
    let width: Width | undefined;
    if (syntax === "att" && /[ql]$/.test(op) && suffixed.has(op.slice(0, -1))) {
      width = op.endsWith("q") ? 64 : 32; op = op.slice(0, -1);
    }
    if (syntax === "att" && ["callq", "retq", "leaveq"].includes(op)) op = op.slice(0, -1);
    if (syntax === "att" && ["movabs", "movabsq"].includes(op)) { op = "mov"; width = 64; }
    if ((syntax === "att" && op === "movslq") || (syntax === "intel" && op === "movsxd")) op = "movsx";
    if (syntax === "att" && op === "cltq") op = "cdqe";
    const parts = splitOperands(tokens[2] || "", line);
    if (op === "call" || jumps.has(op)) {
      if (parts.length !== 1 || !/^[A-Za-z_.$][\w.$]*$/.test(parts[0])) fail(line, "call / 跳转仅支持当前代码中定义的直接标签。");
      instructions.push({ op, operands: [], target: parts[0], width: 64, line, text });
      return;
    }
    if (!binary.has(op) && !unary.has(op) && !plain.has(op)) fail(line, `不支持指令“${tokens[1]}”。请查看“支持的语法”；不支持的指令不会被跳过。`);
    const count = binary.has(op) ? 2 : unary.has(op) ? 1 : 0;
    if (parts.length !== count) fail(line, `“${tokens[1]}”需要 ${count} 个操作数。`);
    const operands = parts.map(x => operand(x, line, syntax));
    if (syntax === "intel" && operands.length === 2) operands.reverse(); // Canonical source, destination.
    const [src, dst] = operands;
    const sizes = operands.flatMap(x => x.kind !== "imm" && x.width ? [x.width] : []);
    if (op === "movsx") {
      if (src.kind === "imm" || dst.kind !== "reg" || dst.width !== 64 || (src.kind === "reg" && src.width !== 32) || (src.kind === "mem" && src.width && src.width !== 32)) fail(line, "movslq / movsxd 只支持 32 位源到 64 位寄存器。");
      width = 64;
    } else {
      width ??= sizes[0] ?? ((op === "push" || op === "pop" || plain.has(op)) ? 64 : undefined);
      if (!width) fail(line, "无法确定操作数宽度；使用 q/l 后缀或 qword/dword ptr。");
      if (sizes.some(size => size !== width)) fail(line, "操作数宽度不一致（32 位与 64 位不能混用）。");
    }
    if (binary.has(op)) {
      if (dst.kind === "imm") fail(line, "目的操作数不能是立即数。");
      if (src.kind === "mem" && dst.kind === "mem") fail(line, "不支持内存到内存操作，请通过寄存器传递。");
      if (op === "lea" && (src.kind !== "mem" || dst.kind !== "reg")) fail(line, "lea 需要内存地址表达式与目的寄存器。");
      if (op === "imul" && dst.kind !== "reg") fail(line, "双操作数 imul 的目的必须是寄存器。");
    }
    if (unary.has(op) && op !== "push" && src.kind === "imm") fail(line, "该指令不能写入立即数。");
    if ((op === "push" || op === "pop") && width !== 64) fail(line, "此模式的 push / pop 只支持 64 位操作数。");
    for (const x of operands) if (x.kind === "imm") {
      if (width === 32 && (x.value < -(1n << 31n) || x.value > 0xffffffffn)) fail(line, "立即数超出 32 位范围。");
      const requiresSigned32 = op === "push" || (width === 64 && !(op === "mov" && dst?.kind === "reg"));
      if (requiresSigned32 && BigInt.asIntN(64, x.value) !== BigInt.asIntN(32, x.value)) fail(line, "该 64 位指令的立即数必须能以有符号 32 位编码；可先用 mov 将大数放入寄存器。");
    }
    instructions.push({ op, operands, width, line, text });
  });
  if (!instructions.length) fail(1, "请输入至少一条指令。");
  instructions.forEach(i => {
    if (i.target && (!labels.has(i.target) || labels.get(i.target)! >= instructions.length)) fail(i.line, `标签“${i.target}”未指向可执行指令；不支持外部函数调用。`);
  });
  const entryName = labels.has("_start") ? "_start" : labels.has("main") ? "main" : [...labels.entries()].find(([, pc]) => pc === 0)?.[0] || "入口";
  const entry = labels.get(entryName) ?? 0;
  if (entry >= instructions.length) fail(lines.length, "入口标签后没有可执行指令。");
  return { instructions, labels, entry, entryName };
}

function memoryOffset(address: bigint, bytes: number, line: number) {
  if (address < BigInt(STACK_BASE) || address + BigInt(bytes) > BigInt(STACK_TOP)) fail(line, `访问 ${hex(address)} 越界；可用栈内存为 0x7000–0x7fff。`);
  return Number(address) - STACK_BASE;
}
export function readMemory(state: MachineState, address: bigint, width: Width, line = 0): bigint {
  const bytes = width / 8, offset = memoryOffset(address, bytes, line);
  let value = 0n;
  for (let i = 0; i < bytes; i++) {
    if (!state.initialized[offset + i]) fail(line, `读取未初始化的栈内存 ${hex(address + BigInt(i))}；请先写入该位置。`);
    value |= BigInt(state.memory[offset + i]) << BigInt(i * 8);
  }
  return value;
}
function writeMemory(state: MachineState, address: bigint, width: Width, value: bigint, line: number) {
  const offset = memoryOffset(address, width / 8, line);
  value = BigInt.asUintN(width, value);
  for (let i = 0; i < width / 8; i++) {
    state.memory[offset + i] = Number((value >> BigInt(i * 8)) & 255n);
    state.initialized[offset + i] = 1;
  }
}
function addressOf(state: MachineState, operand: MemoryOperand) {
  return u64(operand.displacement + (operand.base ? state.registers[operand.base] : 0n) + (operand.index ? state.registers[operand.index] * BigInt(operand.scale) : 0n));
}
function read(state: MachineState, operand: Operand, width: Width, line: number) {
  if (operand.kind === "imm") return BigInt.asUintN(width, operand.value);
  if (operand.kind === "reg") return BigInt.asUintN(operand.width, state.registers[operand.name]);
  return readMemory(state, addressOf(state, operand), width, line);
}
function write(state: MachineState, operand: Operand, width: Width, value: bigint, line: number) {
  if (operand.kind === "imm") fail(line, "目的操作数不能是立即数。");
  if (operand.kind === "reg") state.registers[operand.name] = BigInt.asUintN(operand.width, value); // 32-bit writes zero the upper half.
  else writeMemory(state, addressOf(state, operand), width, value, line);
}
function arithmeticFlags(state: MachineState, a: bigint, b: bigint, result: bigint, width: Width, subtract: boolean) {
  const sign = 1n << BigInt(width - 1);
  const value = BigInt.asUintN(width, result);
  let low = Number(value & 255n), bits = 0;
  while (low) { bits += low & 1; low >>>= 1; }
  state.flags = {
    ZF: value === 0n, SF: !!(value & sign), PF: bits % 2 === 0,
    CF: subtract ? a < b : result > (1n << BigInt(width)) - 1n,
    OF: !!((subtract ? (a ^ b) & (a ^ value) : ~(a ^ b) & (a ^ value)) & sign),
  };
}
function branch(flags: Flags, op: string, line: number): boolean {
  const f = (key: keyof Flags) => {
    if (flags[key] === null) fail(line, `${key} 标志未定义；请先用 cmp / test 或合适的算术指令设置。`);
    return flags[key];
  };
  switch (op) {
    case "jmp": return true;
    case "je": case "jz": return f("ZF");
    case "jne": case "jnz": return !f("ZF");
    case "jg": case "jnle": return !f("ZF") && f("SF") === f("OF");
    case "jge": case "jnl": return f("SF") === f("OF");
    case "jl": case "jnge": return f("SF") !== f("OF");
    case "jle": case "jng": return f("ZF") || f("SF") !== f("OF");
    case "ja": case "jnbe": return !f("CF") && !f("ZF");
    case "jae": case "jnb": case "jnc": return !f("CF");
    case "jb": case "jnae": case "jc": return f("CF");
    case "jbe": case "jna": return f("CF") || f("ZF");
    case "js": return f("SF"); case "jns": return !f("SF");
    case "jo": return f("OF"); case "jno": return !f("OF");
    case "jp": case "jpe": return f("PF"); case "jnp": case "jpo": return !f("PF");
    default: return false;
  }
}
export function initialMachine(program: Program): MachineState {
  const registers = Object.fromEntries(REGISTER_NAMES.map(name => [name, 0n])) as Record<Register, bigint>;
  registers.rsp = BigInt(STACK_TOP - 8);
  const state: MachineState = {
    registers, flags: { ZF: null, SF: null, CF: null, OF: null, PF: null },
    memory: new Uint8Array(STACK_TOP - STACK_BASE), initialized: new Uint8Array(STACK_TOP - STACK_BASE),
    frames: [{ name: program.entryName, returnAddress: END_ADDRESS, stackAddress: STACK_TOP - 8 }],
    pc: program.entry, lastLine: 0, lastInstruction: "初始状态", halted: false,
    explanation: `从 ${program.entryName} 开始。RSP=0x7ff8；栈顶放置“演示结束”返回标记，其他通用寄存器初始为 0。`,
  };
  writeMemory(state, registers.rsp, 64, END_ADDRESS, 0);
  return state;
}
export function executeInstruction(program: Program, previous: MachineState): MachineState {
  if (previous.halted) return previous;
  const instruction = program.instructions[previous.pc];
  if (!instruction) fail(previous.lastLine, "执行位置不在程序内。");
  const { op, operands: [src, dst], width, line, target } = instruction;
  const state: MachineState = {
    ...previous, registers: { ...previous.registers }, flags: { ...previous.flags },
    memory: previous.memory.slice(), initialized: previous.initialized.slice(), frames: previous.frames.map(f => ({ ...f })),
    pc: previous.pc + 1, lastLine: line, lastInstruction: instruction.text,
    explanation: `已执行第 ${line} 行：${instruction.text}。`,
  };
  const push = (value: bigint) => {
    state.registers.rsp = u64(state.registers.rsp - 8n);
    writeMemory(state, state.registers.rsp, 64, value, line);
  };
  const pop = () => {
    const value = readMemory(state, state.registers.rsp, 64, line);
    state.registers.rsp = u64(state.registers.rsp + 8n);
    return value;
  };
  if (op === "mov") write(state, dst, width, read(state, src, width, line), line);
  else if (op === "lea") write(state, dst, width, addressOf(state, src as MemoryOperand), line);
  else if (op === "movsx") write(state, dst, 64, BigInt.asIntN(32, read(state, src, 32, line)), line);
  else if (op === "cdqe") state.registers.rax = u64(BigInt.asIntN(32, state.registers.rax));
  else if (op === "push") { const value = read(state, src, 64, line); push(value); state.explanation += " RSP 减少 8，将值写入新的栈顶。"; }
  else if (op === "pop") { const value = pop(); write(state, src, 64, value, line); state.explanation += " 读取栈顶，RSP 增加 8，再写入目的操作数。"; }
  else if (op === "call") {
    const returnAddress = instructionAddress(state.pc);
    push(returnAddress);
    state.frames.push({ name: target!, returnAddress, stackAddress: Number(state.registers.rsp) });
    state.pc = program.labels.get(target!)!;
    state.explanation += ` 压入虚拟返回地址 ${hex(returnAddress, 6)}，进入 ${target}。`;
  } else if (op === "ret") {
    const returnAddress = pop();
    const frame = state.frames[state.frames.length - 1];
    if (!frame || returnAddress !== frame.returnAddress) fail(line, `返回地址 ${hex(returnAddress)} 与当前调用不匹配。请检查 RSP、局部空间释放与保存的返回地址。`);
    state.frames.pop();
    if (returnAddress === END_ADDRESS) { state.halted = true; state.explanation = `入口函数返回，执行结束。RAX=${hex(state.registers.rax)}（有符号值 ${BigInt.asIntN(64, state.registers.rax)}）。`; }
    else {
      state.pc = Number((returnAddress - CODE_BASE) / 8n);
      state.explanation += ` 弹出返回地址，返回 ${state.frames[state.frames.length - 1]?.name || "调用者"}。`;
    }
  } else if (op === "leave") { state.registers.rsp = state.registers.rbp; state.registers.rbp = pop(); state.explanation += " RSP←RBP，随后弹出并恢复调用者的 RBP。"; }
  else if (jumps.has(op)) {
    const taken = branch(state.flags, op, line);
    if (taken) state.pc = program.labels.get(target!)!;
    state.explanation += taken ? ` 跳转到 ${target}。` : " 条件不满足，继续下一条。";
  } else if (["add", "sub", "cmp", "and", "or", "xor", "test", "imul"].includes(op)) {
    const a = read(state, dst, width, line), b = read(state, src, width, line);
    let result: bigint;
    if (op === "add" || op === "sub" || op === "cmp") {
      result = op === "add" ? a + b : a - b;
      arithmeticFlags(state, a, b, result, width, op !== "add");
    } else if (op === "imul") {
      result = BigInt.asIntN(width, a) * BigInt.asIntN(width, b);
      const overflow = BigInt.asIntN(width, result) !== result;
      state.flags = { ZF: null, SF: null, PF: null, CF: overflow, OF: overflow };
    } else {
      result = op === "xor" ? a ^ b : op === "or" ? a | b : a & b;
      arithmeticFlags(state, 0n, 0n, result, width, false);
      state.flags.CF = false; state.flags.OF = false;
    }
    if (op !== "cmp" && op !== "test") write(state, dst, width, result, line);
  } else if (["inc", "dec", "neg", "not"].includes(op)) {
    const a = read(state, src, width, line), oldCarry = state.flags.CF;
    const result = op === "inc" ? a + 1n : op === "dec" ? a - 1n : op === "neg" ? -a : ~a;
    if (op === "neg") arithmeticFlags(state, 0n, a, result, width, true);
    else if (op !== "not") { arithmeticFlags(state, a, 1n, result, width, op === "dec"); state.flags.CF = oldCarry; }
    write(state, src, width, result, line);
  }
  if (state.registers.rsp < BigInt(STACK_BASE) || state.registers.rsp > BigInt(STACK_TOP)) fail(line, `RSP=${hex(state.registers.rsp)} 超出 4 KiB 演示栈范围。`);
  if (!state.halted && state.pc >= program.instructions.length) {
    if (state.frames.length > 1) fail(line, "被调用函数执行到末尾，请使用 ret 返回调用者。");
    state.halted = true; state.explanation += " 已到达代码末尾，执行结束（未执行入口 ret）。";
  }
  return state;
}
export function runAssembly(source: string, syntax: Syntax = "att", limit = MAX_STEPS): Execution {
  const program = parseAssembly(source, syntax);
  const states = [initialMachine(program)];
  const budget = Math.max(1, Math.min(MAX_STEPS, Math.floor(limit) || MAX_STEPS));
  for (let i = 0; i < budget; i++) {
    const current = states[states.length - 1];
    try {
      const next = executeInstruction(program, current);
      states.push(next);
      if (next.halted) return { program, states, complete: true };
    } catch (error) {
      if (!(error instanceof AssemblyError)) throw error;
      return { program, states, complete: false, issue: { line: error.line, message: error.message } };
    }
  }
  return { program, states, complete: false, issue: { line: program.instructions[states[states.length - 1].pc]?.line || 0, message: `达到 ${budget} 步上限，已停止。请检查循环的退出条件或缩短输入。` } };
}
