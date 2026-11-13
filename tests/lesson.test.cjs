const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runAssembly, readMemory, instructionAddress } = require('../.local/test-build/emulator/machine.js');
const { lessonSource } = require('../.local/test-build/emulator/lesson.js');

test('nested example preserves call, frame, alignment and return semantics', () => {
  const run = runAssembly(lessonSource);
  assert.equal(run.complete, true);
  const after = (instruction, frame) => run.states.find(s => s.lastInstruction === instruction && s.frames.at(-1)?.name === frame);
  const states = {
    call: after('call foo', 'foo'),
    '建立栈帧': after('movq %rsp, %rbp', 'foo'),
    '局部空间': after('subq $16, %rsp', 'foo'),
    '嵌套调用': after('call bar', 'bar'),
    leave: after('leave', 'foo'),
    ret: after('ret', 'main'),
    '结束': run.states.at(-1),
  };
  assert.equal(states.call.registers.rbp, 0x7ff0n);
  assert.equal(readMemory(states.call, states.call.registers.rsp, 64), instructionAddress(4));
  assert.equal(states['建立栈帧'].registers.rbp, 0x7fe0n);
  const local = states['局部空间'];
  assert.equal(local.registers.rsp, 0x7fd0n);
  assert.equal(local.registers.rsp % 16n, 0n);
  assert.equal(local.initialized[0xfd8], 0);
  assert.equal(readMemory(run.states[8], 0x7fd8n, 64), 7n);
  assert.deepEqual(states['嵌套调用'].frames.map(f => f.name), ['main', 'foo', 'bar']);
  assert.equal(states.leave.registers.rsp, 0x7fe8n);
  assert.equal(states.leave.registers.rbp, 0x7ff0n);
  assert.equal(states.leave.frames.at(-1).name, 'foo');
  assert.equal(states.ret.registers.rsp, 0x7ff0n);
  assert.equal(states.ret.pc, 4);
  assert.equal(readMemory(states.ret, 0x7fd8n, 64), 7n);
  assert.equal(states['结束'].registers.rax, 15n);
  assert.equal(states['结束'].registers.rsp, 0x8000n);
});

test('native assembly fixture matches the default nested example', () => {
  const source = fs.readFileSync('public/examples/stack-demo.s', 'utf8');
  const normalize = text => text.split('\n').map(line => line.replace(/#.*/, '').trim()).filter(line => line && !line.startsWith('.'));
  assert.deepEqual(normalize(source), normalize(lessonSource));
});
