import { AssemblyPlayground } from "./AssemblyPlayground";
export function StackLesson() {
  return <><AssemblyPlayground lesson /><details id="gdb-verification" className="classic-help"><summary>在 GDB/GEF 中验证这个独立示例</summary>
    <p>Linux x86-64：下载 <a href={`${import.meta.env.BASE_URL}examples/stack-demo.s`} download>stack-demo.s</a>，编译并调试：</p>
    <pre>{["gcc -g -no-pie stack-demo.s -o stack-demo", "gdb ./stack-demo"].join("\n")}</pre>
    <pre>{["set disassembly-flavor att", "break *main", "run", "disassemble main", "disassemble foo", "disassemble bar", "info registers rsp rbp rip rax rdi", "x/8gx $rsp", "si"].join("\n")}</pre>
    <p>每次 si 后再次查看寄存器和栈，比较指令前后的变化和实际返回目标。网页中的绝对地址、初值和入口返回标记属于教学约定。正常退出状态为 15（GDB 可显示为八进制 017）。</p>
    <p>本例保留帧指针；实际程序可能省略帧指针、内联函数或使用不同栈布局。参数与局部变量也不一定在栈上。理解原理后，继续使用 GDB/GEF 分析实验二进制。</p>
  </details></>;
}
