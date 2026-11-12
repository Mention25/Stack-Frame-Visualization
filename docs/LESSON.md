# 调用栈入门

在线入口：<https://mention25.github.io/Stack-Frame-Visualization/>

默认页面采用独立的 `main → foo → bar` 示例。`main` 把 7 传给 `foo`，`foo` 保存参数后调用 `bar`，`bar` 返回两倍参数，最后 `foo` 加 1，返回值为 15。页面中的 C 代码说明等价逻辑，汇编是手写的教学实现，不是特定编译器的输出。

9 个观察点覆盖起点、call、保存 RBP、建立帧指针、局部空间、嵌套调用、leave、ret 和结束。执行历史由已有解释器计算，可逐条单步或回退；面板显示执行后的状态，同时单独标出下一条指令。释放的内存可通过“查看已释放位置的残留数据”观察。

## 约定和边界

- 采用 System V AMD64 的寄存器传参约定，并显式保留帧指针；每次 call 前 RSP 为 16 字节对齐。
- 教学解释器使用虚拟代码地址、有限栈空间、零初始通用寄存器和入口返回标记。下载的真实程序由运行库调用 main，初值和绝对地址不同。
- 本例把 foo 的参数保存到局部栈槽，另外 8 字节用于对齐；分配空间本身不初始化内存。
- RBP 帧指针、局部变量和栈帧布局并非所有程序都相同；优化、内联和调用约定会影响实际情况。
- 不包含课程二进制、目标地址或实验答案。演示用于理解机制；实验信息必须通过 GDB/GEF 从实际二进制获取。

## 在 Linux x86-64 中复现

下载页面提供的 `stack-demo.s`，然后：

```sh
gcc -g -no-pie stack-demo.s -o stack-demo
gdb ./stack-demo
```

```gdb
set disassembly-flavor att
break *main
run
disassemble main
disassemble foo
disassemble bar
info registers rsp rbp rip rax rdi
x/8gx $rsp
si
```

每次 si 后重新观察寄存器和栈。应比较变化量、保存的帧指针与实际返回目标，而非要求网页和 GDB 中的绝对地址一致。正常退出状态为 15（GDB 可能显示为八进制 017），不是运行失败。

## 维护与验证

```sh
npm ci
npx tsc --noEmit
npm test
npm run build
```

`tests/lesson.test.cjs` 检查各观察点的栈状态，以及下载文件和页面指令完全一致。既有原生执行测试会使用 GCC 对照所有内置示例的返回值。

在 Linux x86-64 下，进一步逐指令验证下载程序：

```sh
mkdir -p .local
gcc -g -no-pie public/examples/stack-demo.s -o .local/stack-demo
gdb -nx -q -batch -x tests/verify-lesson.gdb .local/stack-demo
```

该检查核对全部 21 条指令后的 RSP 变化、每次 call 前的栈对齐、call 保存的真实返回地址、ret 的跳转目标、局部变量残留、RBP 恢复和最终返回值。

2026-11-13：上述 21 项 Node 测试全部通过，无跳过；WSL Ubuntu 24.04 的原生 GDB 验证通过。浏览器检查涵盖关键步骤跳转、单步/回退、播放、残留内存、GDB 说明入口和响应式布局。
