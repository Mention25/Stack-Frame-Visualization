// Compare against an actual x86-64 binary assembled by GCC, when available.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { runAssembly } = require('../.local/test-build/emulator/machine.js');
const { examples } = require('../.local/test-build/emulator/examples.js');
const gcc = spawnSync('gcc', ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
const available = process.arch === 'x64' && ['win32', 'linux'].includes(process.platform) && gcc.status === 0;
const root = path.resolve('.local/native-tests');
function native(source, syntax, id) {
  fs.mkdirSync(root, { recursive: true });
  const asmPath = path.join(root, `${id}.s`), cPath = path.join(root, `${id}.c`), exe = path.join(root, `${id}${process.platform === 'win32' ? '.exe' : ''}`);
  const code = source.split('\n').map(line => line.replace(syntax === 'att' ? /#.*/ : /[;#].*/, '')).join('\n').replace(/\bmain\b/g, 'demo');
  fs.writeFileSync(asmPath, '.text\n.globl demo\n' + (syntax === 'intel' ? '.intel_syntax noprefix\n' : '') + code + '\n');
  fs.writeFileSync(cPath, '#include <stdio.h>\nextern unsigned long long __attribute__((sysv_abi)) demo(void);\nint main(void) { printf("%llu\\n", demo()); return 0; }\n');
  const build = spawnSync('gcc', ['-g', '-O0', path.basename(cPath), path.basename(asmPath), '-o', path.basename(exe)], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(build.status, 0, build.stderr || build.error?.message);
  const run = spawnSync(exe, [], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  assert.equal(run.status, 0, run.stderr || run.error?.message);
  return BigInt(run.stdout.trim());
}

test('all built-in examples match actual assembled x86-64 execution', { skip: !available }, () => {
  examples.forEach(example => {
    const simulation = runAssembly(example.source, example.syntax);
    assert.equal(simulation.complete, true, simulation.issue?.message);
    assert.equal(native(example.source, example.syntax, example.id), simulation.states.at(-1).registers.rax, example.id);
  });
});

test('arithmetic flags match the processor for carry, signed overflow and logical operations', { skip: !available }, () => {
  const cases = [
    'movl $0x7fffffff, %eax\naddl $1, %eax',
    'movl $0xffffffff, %eax\naddl $1, %eax',
    'xorl %eax, %eax\nsubl $1, %eax',
    'movq $-1, %rax\ncmpq $1, %rax',
    'movq $0x8000000000000000, %rax\nnegq %rax',
    'movl $0xffffffff, %eax\naddl $1, %eax\nincl %eax',
    'movl $0x12345678, %eax\ntestl $0x11111111, %eax',
    'movl $0x7fffffff, %eax\nimull $3, %eax',
  ];
  const bit = { CF: 0, PF: 2, ZF: 6, SF: 7, OF: 11 };
  cases.forEach((body, index) => {
    const observed = native('main:\n' + body + '\npushfq\npopq %rax\nret', 'att', `flags-${index}`);
    const expected = runAssembly('main:\n' + body + '\nret').states.at(-1).flags;
    Object.entries(expected).forEach(([name, value]) => {
      if (value !== null) assert.equal(!!(observed & (1n << BigInt(bit[name]))), value, `${index}: ${name}`);
    });
  });
});
