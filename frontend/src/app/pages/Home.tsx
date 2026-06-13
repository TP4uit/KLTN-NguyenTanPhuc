import { Header } from "../components/Header";
import { BackgroundElements } from "../components/BackgroundElements";
import { Hero } from "../components/Hero";

export function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <BackgroundElements />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <Hero />
      </div>
    </div>
  );
}
