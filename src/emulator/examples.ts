import type { Syntax } from "./machine";
import { lessonSource } from "./lesson";

export const examples: { id: string; name: string; syntax: Syntax; source: string }[] = [
  { id: "nested-att", name: "函数调用 · AT&T", syntax: "att", source: `# 修改参数 7，再点击“执行代码”观察结果
# main → twice，返回 2 * 7 + 1 = 15
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp
    movq $7, -8(%rbp)
    movq -8(%rbp), %rdi
    call twice
    addq $1, %rax
    leave
    ret

twice:
    pushq %rbp
    movq %rsp, %rbp
    movq %rdi, %rax
    addq %rax, %rax
    popq %rbp
    ret
` },
  { id: "nested-intel", name: "函数调用 · Intel", syntax: "intel", source: `; Intel：目的操作数在前，源在后
; main → twice，返回 2 * 7 + 1 = 15
main:
    push rbp
    mov rbp, rsp
    sub rsp, 16
    mov qword ptr [rbp-8], 7
    mov rdi, [rbp-8]
    call twice
    add rax, 1
    leave
    ret

twice:
    push rbp
    mov rbp, rsp
    mov rax, rdi
    add rax, rax
    pop rbp
    ret
` },
  { id: "recursive", name: "递归阶乘 · AT&T", syntax: "att", source: `# 递归调用，每层栈帧保存自己的 n
# 结果：5! = 120
main:
    pushq %rbp
    movq %rsp, %rbp
    movq $5, %rdi
    call factorial
    leave
    ret

factorial:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp
    movq %rdi, -8(%rbp)
    cmpq $1, %rdi
    jle .Lbase
    subq $1, %rdi
    call factorial
    imulq -8(%rbp), %rax
    jmp .Ldone
.Lbase:
    movq $1, %rax
.Ldone:
    leave
    ret
` },
  { id: "loop", name: "循环求和 · Intel", syntax: "intel", source: `; 计算 1 + 2 + ... + 5 = 15
main:
    xor eax, eax
    mov ecx, 5
loop_sum:
    add eax, ecx
    dec ecx
    jnz loop_sum
    ret
` },
  { id: "lesson", name: "调用栈入门 · main → foo → bar", syntax: "att", source: lessonSource },
];
