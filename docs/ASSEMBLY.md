# 在网页中执行汇编

1. 打开 [在线页面](https://mention25.github.io/Stack-Frame-Visualization/)，默认进入“输入汇编”。
2. 选择 AT&T 或 Intel 语法，编辑左侧代码；每行一条指令，函数和分支目标使用标签。
3. 点击“执行代码”或按 Ctrl / Command + Enter。网页会从输入内容计算执行历史，而非读取预设答案。
4. 使用单步、回退、重置、播放和进度条查看状态。青色行表示刚执行的指令，黄色行号表示下一条。
5. 编辑后会标记为未执行的新草稿，并停用旧轨迹的控制按钮，直到再次执行。草稿保存在本浏览器中，不上传至服务器。

“固定示例”标签保留上游原始 29 步教学示例。

## 支持范围

| 内容 | 支持形式 |
| --- | --- |
| 数据移动 | mov、lea；AT&T 的 movslq / cltq 与 Intel 的 movsxd / cdqe |
| 栈与调用 | 64 位 push、pop、call、ret、leave；call 目标必须为代码内标签 |
| 算术 | add、sub、inc、dec、neg、双操作数 imul（包括立即数简写） |
| 位操作与比较 | and、or、xor、not、cmp、test |
| 控制流 | jmp、je/jz、jne/jnz、jg/jnle、jge/jnl、jl/jnge、jle/jng、ja/jnbe、jae/jnb/jnc、jb/jnae/jc、jbe/jna、js/jns、jo/jno、jp/jpe、jnp/jpo；nop |
| 寄存器 | RAX/RBX/RCX/RDX/RSI/RDI/RBP/RSP、R8–R15 及全部对应的 32 位别名 |
| 操作数宽度 | 32 位、64 位；32 位寄存器写入会清零对应 64 位寄存器的高 32 位 |
| 数字 | 十进制、0x 十六进制、负数；计算使用 BigInt，避免大整数精度损失 |
| 内存 | AT&T 的 disp(%base,%index,scale)，Intel 的 [base+index*scale+disp]；scale 为 1/2/4/8，基址与索引使用 64 位寄存器 |
| 注释 | AT&T 使用 #；Intel 使用 # 或 ; |

AT&T 的源在前、目的在后；支持 q/l 大小后缀，如 `movq $7, %rax`、`movl $7, %eax`。Intel 的目的在前；如 `mov rax, 7`、`mov qword ptr [rbp-8], 7`。内存宽度无法由寄存器确定时，必须提供后缀或 qword/dword ptr。

支持 `.text`、`.section .text`、`.globl/.global`、`.type/.size`、`.align/.p2align` 及常用 `.cfi_*` 元数据指令；它们不参与运行状态计算。支持与当前选择相符的 `.att_syntax prefix` 或 `.intel_syntax noprefix`。不支持一行多条 AT&T 指令。

不支持间接调用或跳转、系统调用、外部函数（如 printf）、数据段、8/16 位操作、浮点、SIMD、机器码／二进制导入、GDB/objdump 带地址及字节的反汇编清单。这是明确限定范围的解释器，不是完整 x86-64 模拟器。未支持的指令／操作数会报错，不会被当作空操作执行。

## 执行约定与显示含义

- 入口依次选择 `_start`、`main`，否则从第一条指令开始；RSP 初始为 `0x7ff8`，其他通用寄存器初始为 0，条件标志初始未知。
- 栈内存范围为 `0x7000`–`0x7fff`，按小端序读写。栈顶预置 `0xffffffffffffffff`，作为入口函数返回时的结束标记。
- 虚拟代码地址从 `0x400000` 开始，每条指令按 8 的间隔编号，用于指令位置和返回地址显示。**8 不是实际 x86-64 指令长度。** 不模拟真实程序装载、操作系统入口、地址随机化或二进制布局。
- `call` 压入下一条指令的虚拟地址；`ret` 弹出返回地址。返回地址与对应调用不匹配时停止，并提示检查栈平衡。这是教学边界，不模拟任意修改返回地址后的执行。
- 上限为 500 行、24000 个字符、2000 个执行步骤。无限循环在步数上限处停止，已执行的历史仍可回放。
- `??` 表示未初始化字节；读取未初始化内存、越界访问和未知条件标志都会停止。此处理用于报告不确定状态，不代表实际 CPU 会为所有这些情况主动报错。
- ZF/SF/CF/OF/PF 根据指令更新。IMUL 后未定义的标志以 `?` 显示。UI 显示所有寄存器的完整 64 位状态；数值可切换十六进制或有符号十进制。
- 回退从完整状态快照中恢复寄存器、标志、内存和调用链。已释放的内存没有被清零，可勾选查看残留数据。
- “函数调用链”根据实际执行的 call/ret 跟踪，不推断编译器调试信息、尾调用或帧指针省略后的函数归属。

## 如何验证

`npm test` 包含解析错误、调用／返回、递归、分支、栈寻址、小端序、32 位清零、64 位精度、标志位、快照独立性、越界和步数上限检查。

`tests/native.test.cjs` 在 x86-64 的 Windows/Linux 且存在 GCC 时，将四个独立示例汇编成真正的可执行文件，对比返回结果；另将算术指令的标志与处理器的 RFLAGS 对照。其输出文件位于忽略提交的 `.local/native-tests/`。没有 GCC 的环境会明确跳过这些对照测试，普通解释器测试仍运行。

这些验证覆盖受支持语义，不将虚拟地址等同于真实机器码地址。教学时仍应使用 GDB/GEF 对实际编译的二进制逐步检查。

实现参考：[GNU as 的 AT&T / Intel 差异](https://sourceware.org/binutils/docs/as/i386_002dVariations.html)、[GNU as 内存寻址](https://sourceware.org/binutils/docs/as/i386_002dMemory.html)、[Intel 64 / IA-32 指令手册](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)。
