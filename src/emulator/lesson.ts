import type { Execution } from "./machine";

// Hand-written System V AMD64 example, independent of all course binaries.
export const lessonSource = `main:
    pushq %rbp
    movq %rsp, %rbp
    movq $7, %rdi
    call foo
    leave
    ret

foo:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp
    movq %rdi, -8(%rbp)
    movq -8(%rbp), %rdi
    call bar
    addq $1, %rax
    leave
    ret

bar:
    pushq %rbp
    movq %rsp, %rbp
    movq %rdi, %rax
    addq %rax, %rax
    popq %rbp
    ret
`;
export const lessonC = `long bar(long x) { return 2 * x; }
long foo(long x) { return bar(x) + 1; }
int main(void) { return (int)foo(7); }`;

export function lessonCheckpoints(execution: Execution) {
  const locate = (instruction: string, frame: string) => execution.states.findIndex(s => s.lastInstruction === instruction && s.frames.at(-1)?.name === frame);
  return [
    { step: 0, title: "起点", text: "从 main 的第一条指令之前开始。RSP 指向入口返回标记；其余寄存器初始为 0 是演示约定。先单步观察 main 保存帧指针，再调用 foo。" },
    { step: locate("call foo", "foo"), title: "call", text: "call 将下一条指令的返回地址压入栈，RSP 减少 8，再转到 foo。此时 RBP 仍属于 main：call 不会自动建立被调用函数的帧指针。" },
    { step: locate("pushq %rbp", "foo"), title: "保存 RBP", text: "foo 将 main 的 RBP 压栈，RSP 再减少 8。保存的帧指针和返回地址是两个独立的栈槽。" },
    { step: locate("movq %rsp, %rbp", "foo"), title: "建立栈帧", text: "把当前 RSP 复制到 RBP，建立 foo 的帧指针。此示例中，RBP 指向保存的调用者 RBP，RBP+8 指向返回地址。" },
    { step: locate("subq $16, %rsp", "foo"), title: "局部空间", text: "RSP 减少 16，为 foo 留出局部空间，同时满足后续调用的栈对齐。本次 sub 只改变指针，不会初始化内存；再走一步，参数 x=7 才被写入 RBP−8。" },
    { step: locate("call bar", "bar"), title: "嵌套调用", text: "foo 调用 bar，新的返回地址压入栈。main 和 foo 的数据仍然保留。继续单步，观察 bar 保存帧指针、计算 2×7，再恢复 RBP 并返回。" },
    { step: locate("leave", "foo"), title: "leave", text: "bar 已返回，foo 将结果加 1 得到 15。leave 相当于先 RSP←RBP，再 pop RBP；它释放 foo 的局部空间并恢复 main 的帧指针，此时尚未返回 main。" },
    { step: locate("ret", "main"), title: "ret", text: "ret 从栈顶取出返回地址，RSP 增加 8，继续执行 main 中 call 后的指令。释放栈空间不等于擦除内存：勾选残留数据即可查看。" },
    { step: execution.states.length - 1, title: "结束", text: "main 返回，RAX=15。演示用入口返回标记结束执行；真实程序由运行库接收 main 的返回值。回到 GDB，在独立示例和实验二进制中分别观察这些机制。" },
  ];
}
