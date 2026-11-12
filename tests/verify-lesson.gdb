# Linux x86-64: gcc -g -no-pie public/examples/stack-demo.s -o .local/stack-demo
# gdb -nx -q -batch -x tests/verify-lesson.gdb .local/stack-demo
set pagination off
set confirm off
set debuginfod enabled off
set disassembly-flavor att
break *main
run
python
import gdb
def reg(name):
    return int(gdb.parse_and_eval("$" + name))
def word(address):
    return int.from_bytes(gdb.selected_inferior().read_memory(address, 8).tobytes(), "little")
base, original_rbp = reg("rsp"), reg("rbp")
# Expected relative RSP after each of the 21 instructions.
offsets = [-8, -8, -8, -16, -24, -24, -40, -40, -40, -48, -56, -56, -56, -56, -48, -40, -40, -16, -8, 0, 8]
for step, offset in enumerate(offsets, 1):
    ins = gdb.selected_frame().architecture().disassemble(reg("rip"), count=2)
    mnemonic = ins[0]["asm"].split()[0]
    old_sp, old_bp = reg("rsp"), reg("rbp")
    target = word(old_sp) if mnemonic.startswith("ret") else None
    gdb.execute("si", to_string=True)
    assert reg("rsp") == base + offset, (step, "rsp")
    if mnemonic.startswith("call"):
        assert word(reg("rsp")) == ins[1]["addr"], (step, "return address")
        assert reg("rbp") == old_bp, (step, "call changed rbp")
        assert old_sp % 16 == 0, (step, "call alignment")
    if target is not None:
        assert reg("rip") == target, (step, "return target")
    if step >= 8:
        assert word(base - 32) == 7, (step, "local x")
    if step == 6:
        assert reg("rbp") == base - 24
        assert word(reg("rbp")) == base - 8
    if step == 18:
        assert reg("rbp") == base - 8
    if step >= 17:
        assert reg("rax") == 15
assert reg("rbp") == original_rbp
print("PASS: 21 native steps; stack deltas, call alignment, return addresses, local x, frame restoration and result 15")
end
continue
