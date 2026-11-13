import { AssemblyPlayground } from "./components/AssemblyPlayground";
import "./styles/classic.css";

export const App: React.FC = () => (
  <div className="workspace">
    <header className="workspace-header"><strong>调用栈可视化</strong></header>
    <main className="workspace-main" aria-label="汇编可视化">
      <AssemblyPlayground />
    </main>
    <footer className="classic-footer">原作者 <a href="https://github.com/NickZhuxy/Stack-Frame-Visualization">Nick Zhu</a> · 扩展与维护 Mention25 · <a href={`${import.meta.env.BASE_URL}attribution.html`}>来源与许可</a></footer>
  </div>
);
