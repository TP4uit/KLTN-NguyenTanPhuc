import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Users, Box, ArrowUpRight, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { DashboardHeader } from '../components/DashboardHeader';
import { connectLocalElection, formatAccount, getConnectedLocalElection, localElection } from '../lib/localElection';

const mockResults = [
  { id: "c3", candidateId: 3, name: "David Okafor", title: "Community Lead", votes: 2150, color: "#3b82f6", image: "https://images.unsplash.com/photo-1560073743-0a45c01b68c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwbWFufGVufDF8fHx8MTc3NjA0MzY3NHww&ixlib=rb-4.1.0&q=80&w=1080" },
  { id: "c1", candidateId: 1, name: "Elena Rostova", title: "DeFi Strategist", votes: 1420, color: "#8b5cf6", image: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc3NTkyNTMyOHww&ixlib=rb-4.1.0&q=80&w=1080" },
  { id: "c2", candidateId: 2, name: "Marcus Chen", title: "Core Developer", votes: 980, color: "#10b981", image: "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NzYwNDM2NzR8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  { id: "c4", candidateId: 4, name: "Sarah Jenkins", title: "Security Researcher", votes: 845, color: "#f59e0b", image: "https://images.unsplash.com/photo-1623594675959-02360202d4d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwcHJvZmVzc2lvbmFsJTIwd29tYW58ZW58MXx8fHwxNzc2MDQzNjc0fDA&ixlib=rb-4.1.0&q=80&w=1080" }
];

export function Results() {
  const [results, setResults] = useState(mockResults);
  const [account, setAccount] = useState<string | null>(null);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnChain, setIsOnChain] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Connect MetaMask to load localhost vote counts.");
  const displayResults = isOnChain ? [...results].sort((a, b) => b.votes - a.votes) : results;
  const totalVotes = displayResults.reduce((sum, c) => sum + c.votes, 0);

  const loadResults = async (requestAccount: boolean) => {
    setIsRefreshing(true);

    try {
      const connection = requestAccount ? await connectLocalElection() : await getConnectedLocalElection();

      if (!connection) {
        setStatusMessage("Connect MetaMask to load localhost vote counts.");
        return;
      }

      const counts = await Promise.all([1, 2, 3, 4].map((candidateId) => connection.contract.getVotes(candidateId)));
      const blockNumber = await connection.provider.getBlockNumber();

      setAccount(connection.account);
      setLatestBlock(blockNumber);
      setResults((current) =>
        current.map((candidate) => ({
          ...candidate,
          votes: Number(counts[candidate.candidateId - 1]),
        })),
      );
      setIsOnChain(true);
      setStatusMessage(`Loaded on-chain tallies from ${localElection.network}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load on-chain vote counts.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadResults(false);
  }, []);

  const percentageFor = (votes: number) => {
    if (totalVotes === 0) {
      return "0.0";
    }

    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = percentageFor(data.votes);
      return (
        <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl min-w-[200px]">
          <p className="font-semibold text-slate-900 text-lg mb-1">{data.name}</p>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 flex justify-between">Votes: <strong className="text-slate-900">{data.votes.toLocaleString()}</strong></span>
            <span className="text-slate-500 flex justify-between">Share: <strong className="text-slate-900">{percentage}%</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">Election Analytics</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl">
              Real-time cryptographic tallying for the current governance proposals.
            </p>
            <p className="text-sm text-slate-500 mt-2">{statusMessage}</p>
          </div>
          <button
            onClick={() => loadResults(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : account ? <RefreshCw className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {account ? `Refresh ${formatAccount(account)}` : "Connect MetaMask"}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Votes Cast</p>
              <p className="text-3xl font-bold text-slate-900">{totalVotes.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1 font-medium">
                <ArrowUpRight className="w-3 h-3" /> +12% in last hour
              </p>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Network Turnout</p>
              <p className="text-3xl font-bold text-slate-900">68.4%</p>
              <p className="text-xs text-slate-500 mt-1">Of eligible ZK-proof holders</p>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Blocks Processed</p>
              <p className="text-3xl font-bold text-slate-900">{latestBlock?.toLocaleString() ?? "14,205"}</p>
              <p className="text-xs text-slate-500 mt-1">{isOnChain ? "Latest localhost block" : "Mock display until connected"}</p>
            </div>
          </motion.div>
        </div>

        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ delay: 0.3 }}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6">Vote Distribution</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayResults} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 14, fontWeight: 500 }}
                  width={140}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={40} animationDuration={1500}>
                  {displayResults.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Live Leaderboard</h2>
            <span className="text-sm font-medium text-slate-500">Auto-updating</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {displayResults.map((candidate, index) => {
              const percentage = percentageFor(candidate.votes);
              return (
                <div key={candidate.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  {/* Rank & Avatar */}
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>
                    
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100 shrink-0">
                      <ImageWithFallback src={candidate.image} alt={candidate.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-slate-900">{candidate.name}</h3>
                      <p className="text-sm text-slate-500">{candidate.title}</p>
                    </div>
                  </div>
                  
                  {/* Progress & Votes */}
                  <div className="ml-0 sm:ml-auto flex flex-col sm:items-end w-full sm:w-1/2 max-w-md gap-2 mt-2 sm:mt-0">
                    <div className="flex justify-between w-full text-sm">
                      <span className="font-bold text-slate-900">{candidate.votes.toLocaleString()} <span className="text-slate-500 font-normal">votes</span></span>
                      <span className="font-bold" style={{ color: candidate.color }}>{percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.5, delay: 0.5 + (index * 0.1) }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: candidate.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
