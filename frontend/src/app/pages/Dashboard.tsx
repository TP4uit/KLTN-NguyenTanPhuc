import { Shield, LogOut, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ZKPModal } from "../components/ZKPModal";
import { AnimatePresence } from "motion/react";
import { DashboardHeader } from "../components/DashboardHeader";

const CANDIDATES = [
  {
    id: "c1",
    name: "Elena Rostova",
    title: "DeFi Strategist",
    image: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc3NTkyNTMyOHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Focusing on protocol sustainability and long-term liquidity incentives for governance token holders.",
  },
  {
    id: "c2",
    name: "Marcus Chen",
    title: "Core Developer",
    image: "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NzYwNDM2NzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Advocating for zk-SNARKs integration and gas optimization across all network smart contracts.",
  },
  {
    id: "c3",
    name: "David Okafor",
    title: "Community Lead",
    image: "https://images.unsplash.com/photo-1560073743-0a45c01b68c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwbWFufGVufDF8fHx8MTc3NjA0MzY3NHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Dedicated to expanding educational resources and fostering a more inclusive Web3 ecosystem.",
  },
  {
    id: "c4",
    name: "Sarah Jenkins",
    title: "Security Researcher",
    image: "https://images.unsplash.com/photo-1623594675959-02360202d4d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwd29tYW58ZW58MXx8fHwxNzc2MDQzNjc0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Prioritizing comprehensive audits and implementing proactive threat-monitoring frameworks.",
  }
];

export function Dashboard() {
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [isGeneratingZKP, setIsGeneratingZKP] = useState(false);

  const handleVote = (id: string) => {
    setIsGeneratingZKP(true);
    // Simulate complex zero-knowledge proof generation and blockchain transaction
    setTimeout(() => {
      setIsGeneratingZKP(false);
      setVotedFor(id);
    }, 4500); // Wait 4.5 seconds to show off the modal
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Active Proposals</h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Select a candidate below to cast your anonymous, verifiable vote for the upcoming governance term.
          </p>
        </div>

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {CANDIDATES.map((candidate) => {
            const isVoted = votedFor === candidate.id;
            const hasVotedAny = votedFor !== null;
            
            return (
              <div 
                key={candidate.id}
                className={`flex flex-col bg-white rounded-2xl border ${isVoted ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'} p-6 shadow-sm hover:shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2`}
              >
                <div className="flex flex-col items-center text-center flex-1">
                  {/* Avatar */}
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm bg-slate-100">
                      <ImageWithFallback 
                        src={candidate.image} 
                        alt={`Portrait of ${candidate.name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isVoted && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Candidate Info */}
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">{candidate.name}</h2>
                  <h3 className="text-sm font-medium text-blue-600 mb-3">{candidate.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                    {candidate.description}
                  </p>
                </div>
                
                {/* Vote Action */}
                <button
                  onClick={() => handleVote(candidate.id)}
                  disabled={hasVotedAny}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isVoted 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-default' 
                      : hasVotedAny 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-sm focus:ring-blue-500 active:bg-blue-800'
                  }`}
                  aria-pressed={isVoted}
                  aria-label={`Vote for ${candidate.name}`}
                >
                  {isVoted ? 'Vote Recorded' : 'Vote'}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Loading Modal Overlay */}
      <AnimatePresence>
        {isGeneratingZKP && <ZKPModal />}
      </AnimatePresence>
    </div>
  );
}
