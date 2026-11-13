const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runAssembly, parseAssembly, readMemory, instructionAddress, STACK_TOP, END_ADDRESS, AssemblyError } = require('../.local/test-build/emulator/machine.js');
const { examples } = require('../.local/test-build/emulator/examples.js');
const last = execution => execution.states.at(-1);
function finished(source, syntax = 'att') {
  const result = runAssembly(source, syntax);
  assert.equal(result.complete, true, result.issue?.message);
  return result;
}

test('AT&T and Intel examples give the same registers, memory and call depths at every step', () => {
  const a = finished(examples[0].source), b = finished(examples[1].source, 'intel');
  assert.equal(a.states.length, b.states.length);
  a.states.forEach((state, i) => {
    assert.deepEqual(state.registers, b.states[i].registers);
    assert.deepEqual(state.memory, b.states[i].memory);
    assert.deepEqual(state.flags, b.states[i].flags);
    assert.equal(state.frames.length, b.states[i].frames.length);
  });
  assert.equal(last(a).registers.rax, 15n);
  assert.equal(last(a).registers.rsp, BigInt(STACK_TOP));
  assert.equal(last(a).registers.rbp, 0n);
});

test('call stores the next instruction address; return restores the caller', () => {
  const run = finished(examples[0].source);
  const call = run.states.findIndex(s => s.lastInstruction === 'call twice');
  const before = run.states[call - 1], after = run.states[call];
  assert.equal(after.registers.rsp, before.registers.rsp - 8n);
  assert.equal(readMemory(after, after.registers.rsp, 64), instructionAddress(before.pc + 1));
  assert.deepEqual(after.frames.map(f => f.name), ['main', 'twice']);
  const ret = run.states.find(s => s.lastInstruction === 'ret' && !s.halted);
  assert.equal(ret.pc, before.pc + 1);
  assert.equal(ret.registers.rsp, before.registers.rsp);
});

test('recursive calls preserve independent local variables and frames', () => {
  const run = finished(examples[2].source);
  assert.equal(last(run).registers.rax, 120n);
  assert.equal(Math.max(...run.states.map(s => s.frames.length)), 6);
  assert.equal(last(run).frames.length, 0);
  assert.equal(last(run).registers.rsp, BigInt(STACK_TOP));
});

test('conditional looping follows flags and ends with the computed sum', () => {
  const run = finished(examples[3].source, 'intel');
  assert.equal(last(run).registers.rax, 15n);
  assert.equal(last(run).registers.rcx, 0n);
  assert.equal(run.states.filter(s => s.lastInstruction === 'add eax, ecx').length, 5);
});

test('snapshots are independent, including memory, registers and frames', () => {
  const run = finished(examples[0].source);
  const start = run.states[0];
  assert.equal(start.registers.rsp, BigInt(STACK_TOP - 8));
  assert.equal(readMemory(start, start.registers.rsp, 64), END_ADDRESS);
  assert.equal(start.initialized.reduce((sum, n) => sum + n, 0), 8);
  assert.deepEqual(start.frames.map(f => f.name), ['main']);
  assert.notEqual(start.memory, run.states[1].memory);
  assert.notEqual(start.registers, run.states[1].registers);
  assert.notEqual(start.frames[0], run.states[1].frames[0]);
});

test('64-bit values remain precise; 32-bit writes zero the high half', () => {
  const run = finished('movabsq $0xfedcba9876543210, %rax\nmovl $0xffffffff, %eax\nmovq %rax, %r8\nret');
  assert.equal(run.states[1].registers.rax, 0xfedcba9876543210n);
  assert.equal(last(run).registers.rax, 0xffffffffn);
  assert.equal(last(run).registers.r8, 0xffffffffn);
});

test('signed extension handles eax and memory sources', () => {
  assert.equal(last(finished('movl $-7, %eax\ncltq\nret')).registers.rax, BigInt.asUintN(64, -7n));
  assert.equal(last(finished('subq $8, %rsp\nmovl $-2, (%rsp)\nmovslq (%rsp), %rax\naddq $8, %rsp\nret')).registers.rax, BigInt.asUintN(64, -2n));
  assert.equal(last(finished('mov eax, -7\nmovsxd rax, eax\nret', 'intel')).registers.rax, BigInt.asUintN(64, -7n));
});

test('mixed-width stack writes use little endian and preserve adjacent bytes', () => {
  const run = finished('subq $8, %rsp\nmovabsq $0x1122334455667788, %rax\nmovq %rax, (%rsp)\nmovl $0xaabbccdd, 4(%rsp)\nmovq (%rsp), %rax\naddq $8, %rsp\nret');
  assert.equal(last(run).registers.rax, 0xaabbccdd55667788n);
});

test('LEA and indexed operands calculate addresses without reading memory', () => {
  const run = finished('subq $32, %rsp\nmovq $2, %rcx\nleaq 8(%rsp,%rcx,4), %rax\nmovq $42, (%rax)\nmovq 8(%rsp,%rcx,4), %rdx\naddq $32, %rsp\nret');
  assert.equal(last(run).registers.rdx, 42n);
  const intel = finished('sub rsp, 32\nmov rcx, 2\nlea rax, [rsp+rcx*4+8]\nmov qword ptr [rax], 42\nmov rdx, [rsp+rcx*4+8]\nadd rsp, 32\nret', 'intel');
  assert.deepEqual(last(run).registers, last(intel).registers);
});

test('PUSH RSP captures old RSP; POP memory uses incremented RSP for its address', () => {
  const run = finished('movq %rsp, %rbx\npushq %rsp\npopq %rax\nsubq $16, %rsp\npushq $42\npopq (%rsp)\nmovq (%rsp), %rdx\naddq $16, %rsp\nret');
  assert.equal(last(run).registers.rax, last(run).registers.rbx);
  assert.equal(last(run).registers.rdx, 42n);
});

test('signed and unsigned comparisons distinguish negative values', () => {
  const signed = finished('movq $-1, %rax\ncmpq $1, %rax\njl yes\nmovq $0, %rax\nret\nyes: movq $42, %rax\nret');
  assert.equal(last(signed).registers.rax, 42n);
  const unsigned = finished('movq $-1, %rax\ncmpq $1, %rax\nja yes\nmovq $0, %rax\nret\nyes: movq $42, %rax\nret');
  assert.equal(last(unsigned).registers.rax, 42n);
});

test('arithmetic reports carry, sign, overflow, zero and parity correctly', () => {
  let s = last(finished('movl $0xffffffff, %eax\naddl $1, %eax\nret'));
  assert.deepEqual(s.flags, { ZF: true, SF: false, PF: true, CF: true, OF: false });
  s = last(finished('movl $0x7fffffff, %eax\naddl $1, %eax\nret'));
  assert.equal(s.flags.OF, true); assert.equal(s.flags.CF, false); assert.equal(s.flags.SF, true);
  s = last(finished('xorl %eax, %eax\nsubl $1, %eax\nret'));
  assert.equal(s.flags.CF, true); assert.equal(s.flags.SF, true); assert.equal(s.flags.OF, false);
});

test('INC preserves carry, NOT preserves flags, IMUL invalidates undefined flags', () => {
  const run = finished('xorl %eax, %eax\nsubl $1, %eax\nincl %eax\nnotl %eax\nret');
  assert.equal(last(run).flags.CF, true); assert.equal(last(run).flags.ZF, true);
  const mul = runAssembly('movq $3, %rax\nimulq $2, %rax\nje there\nthere: ret');
  assert.equal(last(mul).registers.rax, 6n); assert.match(mul.issue.message, /标志未定义/);
});

test('source errors report line numbers and reject unsupported/ambiguous syntax', () => {
  for (const [source, line] of [
    ['main:\n syscall', 2], ['main: nop\nmain: ret', 2], ['call missing', 1],
    ['movq %eax, %rax', 1], ['movq (%rbp), (%rsp)', 1], ['mov $7, (%rsp)', 1],
    ['pushl %eax', 1], ['addq $0x123456789, %rax', 1], ['movq %rax, (%rsp', 1],
    ['.data\nvalue: .quad 7', 1], ['call *%rax', 1], ['movq $7, %ah', 1],
    ['movq $7, (%rax,%rsp,2)', 1], ['movq $7, 0x100000000(%rax)', 1],
    ['.text; syscall', 1], ['.cfi_unknown', 1],
  ]) assert.throws(() => parseAssembly(source), error => error instanceof AssemblyError && error.line === line, source);
  assert.throws(() => parseAssembly('mov [rsp], 7', 'intel'), /宽度/);
  assert.throws(() => parseAssembly('mov rax, [rbp++8]', 'intel'), /表达式/);
  assert.throws(() => parseAssembly('.intel_syntax noprefix\nret', 'att'), /选择不一致/);
});

test('out-of-bounds and uninitialized reads stop without committing a partial instruction', () => {
  const run = runAssembly('subq $8, %rsp\nmovq (%rsp), %rax\nret');
  assert.equal(run.complete, false); assert.equal(run.states.length, 2); assert.equal(run.issue.line, 2);
  assert.match(run.issue.message, /未初始化/);
  const bounds = runAssembly('subq $8192, %rsp\nret');
  assert.equal(bounds.states.length, 1); assert.equal(last(bounds).registers.rsp, BigInt(STACK_TOP - 8));
  assert.match(bounds.issue.message, /超出/);
});

test('stack corruption is reported and finite budgets stop infinite loops', () => {
  const run = runAssembly('subq $8, %rsp\nmovq $0, (%rsp)\nret');
  assert.equal(run.issue.line, 3); assert.match(run.issue.message, /返回地址/);
  const loop = runAssembly('again: jmp again', 'att', 25);
  assert.equal(loop.states.length, 26); assert.equal(loop.complete, false); assert.match(loop.issue.message, /25 步上限/);
});

test('entry selection, local labels, directives and falling off code are explicit', () => {
  const run = finished('.text\n.globl main\nother: movq $99, %rax\nret\nmain: movq $7, %rax\nret');
  assert.equal(last(run).registers.rax, 7n);
  assert.equal(last(finished('movq $9, %rax')).registers.rax, 9n);
  assert.equal(runAssembly('main: call fn\nret\nfn: nop').complete, false);
});
