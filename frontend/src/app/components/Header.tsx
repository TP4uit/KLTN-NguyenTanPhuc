import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="w-full absolute top-0 left-0 right-0 z-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Veri<span className="text-blue-500">Vote</span>
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#" className="hover:text-white transition-colors">How it Works</a>
          <a href="#" className="hover:text-white transition-colors">Security</a>
          <a href="#" className="hover:text-white transition-colors">Audit Logs</a>
          <a href="#" className="hover:text-white transition-colors">Governance</a>
        </nav>
      </div>
    </header>
  );
}
