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
