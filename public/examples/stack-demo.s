# Independent Linux x86-64 / System V AMD64 teaching example.
# Build: gcc -g -no-pie stack-demo.s -o stack-demo
.text
.globl main
.type main, @function
main:
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
.section .note.GNU-stack,"",@progbits
