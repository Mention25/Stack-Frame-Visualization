const {test} = require('node:test');
const assert = require('node:assert/strict');
const {runAssembly} = require('../.local/test-build/emulator/machine.js');
const {displayRegisters,stackEntries,assemblyLines} = require('../.local/test-build/emulator/presentation.js');
const {lessonSource} = require('../.local/test-build/emulator/lesson.js');

test('upstream display adapter preserves full 64-bit values and unsigned stack bytes', () => {
  const run=runAssembly('main:\nmovq $0xffffffffffffffff, %rax\npushq %rax\npopq %rax\nret');
  const state=run.states[2];
  assert.equal(displayRegisters(state).rax,'0xffffffffffffffff');
  assert.equal(displayRegisters(state,true).rax,'-1');
  const row=stackEntries(state).find(e=>e.address===Number(state.registers.rsp));
  assert.equal(row.value,'0xffffffffffffffff');
  assert.equal(row.bytes,'ff ff ff ff ff ff ff ff');
});
test('display adapter distinguishes uninitialized, changed, and freed local memory', () => {
  const run=runAssembly(lessonSource);
  const before=stackEntries(run.states[7],run.states[6]).find(e=>e.address===0x7fd8);
  assert.equal(before.value,'0x????????????????');
  const after=stackEntries(run.states[8],run.states[7]).find(e=>e.address===0x7fd8);
  assert.equal(after.value,'0x7'); assert.equal(after.highlight,true); assert.equal(after.owner,'foo');
  assert.equal(stackEntries(run.states.at(-1)).length,0);
  const freed=stackEntries(run.states.at(-1),undefined,true).find(e=>e.address===0x7fd8);
  assert.equal(freed.freed,true); assert.equal(freed.value,'0x7');
});
test('assembly display keeps source line numbers, comments and function membership', () => {
  const source='main:\n  call foo # invoke\n  ret\nfoo:\n  movq $7, %rax\n  ret';
  const lines=assemblyLines(source,runAssembly(source));
  assert.equal(lines[1].num,2); assert.equal(lines[1].comment,'invoke');
  assert.equal(lines[4].fn,'foo'); assert.equal(lines[4].text,'movq $7, %rax');
});
