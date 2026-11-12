const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runAssembly, readMemory, instructionAddress } = require('../.local/test-build/machine.js');
const { lessonSource, lessonCheckpoints } = require('../.local/test-build/lesson.js');

test('lesson checkpoints preserve call, frame, alignment and return semantics', () => {
  const run = runAssembly(lessonSource);
  assert.equal(run.complete, true);
  const points = lessonCheckpoints(run);
  assert.deepEqual(points.map(p => p.step), [0, 4, 5, 6, 7, 10, 18, 19, 21]);
  const states = Object.fromEntries(points.map(p => [p.title, run.states[p.step]]));
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

test('downloadable assembly contains exactly the instructions shown in the lesson', () => {
  const source = fs.readFileSync('public/examples/stack-demo.s', 'utf8');
  const normalize = text => text.split('\n').map(line => line.replace(/#.*/, '').trim()).filter(line => line && !line.startsWith('.'));
  assert.deepEqual(normalize(source), normalize(lessonSource));
});
