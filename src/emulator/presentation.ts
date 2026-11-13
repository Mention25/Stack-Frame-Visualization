import { END_ADDRESS, STACK_BASE, STACK_TOP, hex, instructionAddress } from "./machine";
import type { Execution, MachineState } from "./machine";
import type { AsmLine, RegisterState, StackEntry } from "../types";

// Adapt interpreter snapshots to the upstream visual components, without narrowing 64-bit values.
export function assemblyLines(source: string, execution: Execution): AsmLine[] {
  const names = new Set([execution.program.entryName, ...execution.program.instructions.filter(i => i.op === "call").map(i => i.target!)]);
  let fn = execution.program.entryName;
  return source.trimEnd().split("\n").map((line, index) => {
    const split = line.search(/[;#]/);
    const text = (split < 0 ? line : line.slice(0, split)).trim();
    const label = text.match(/^([\w.$]+):/);
    if (label && names.has(label[1])) fn = label[1];
    return { num: index + 1, text, fn, type: label ? "label" : "inst", comment: split < 0 ? undefined : line.slice(split + 1).trim() };
  });
}

export function displayRegisters(state: MachineState, decimal = false): RegisterState {
  const values = Object.fromEntries(Object.entries(state.registers).map(([name, value]) => [name, decimal ? BigInt.asIntN(64, value).toString() : hex(value, 4)]));
  return { ...values, rsp: values.rsp, rbp: values.rbp, rip: state.halted ? "已结束" : hex(instructionAddress(state.pc), 6) };
}

export function stackEntries(state: MachineState, previous?: MachineState, showFreed = false, decimal = false): StackEntry[] {
  const rsp = Number(state.registers.rsp);
  let low = Math.max(STACK_BASE, Math.floor(rsp / 8) * 8);
  const first = state.initialized.findIndex(value => value !== 0);
  if (showFreed && first >= 0) low = Math.min(low, STACK_BASE + Math.floor(first / 8) * 8);
  const entries: StackEntry[] = [];
  for (let address = STACK_TOP - 8; address >= low; address -= 8) {
    const offset = address - STACK_BASE;
    const bytes = Array.from({length:8}, (_, i) => state.initialized[offset+i] ? state.memory[offset+i].toString(16).padStart(2,"0") : "??");
    const initialized = bytes.every(byte => byte !== "??");
    const word = initialized ? BigInt("0x" + [...bytes].reverse().join("")) : 0n;
    const returned = state.frames.find(frame => frame.stackAddress === address);
    const owner = [...state.frames].reverse().find(frame => address <= frame.stackAddress);
    const freed = address + 8 <= rsp;
    const label = freed ? "已释放 · 残留数据" : returned ? (returned.returnAddress === END_ADDRESS ? "入口返回标记" : `${returned.name} 返回地址`) : `${owner?.name || "栈"} 的栈空间`;
    entries.push({ address, value: initialized ? (decimal ? BigInt.asIntN(64,word).toString() : hex(word,1)) : `0x${[...bytes].reverse().join("")}`, label,
      highlight: !!previous && bytes.some((_,i) => state.memory[offset+i] !== previous.memory[offset+i] || state.initialized[offset+i] !== previous.initialized[offset+i]),
      owner: freed ? undefined : owner?.name, freed, bytes: bytes.join(" ") });
  }
  return entries;
}
