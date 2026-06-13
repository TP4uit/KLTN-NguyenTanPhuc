import { motion } from "motion/react";
import { Wallet, ShieldCheck, Fingerprint, Lock } from "lucide-react";
import { useNavigate } from "react-router";

export function Hero() {
  const navigate = useNavigate();

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
      <div className="max-w-4xl w-full flex flex-col items-center text-center">
        
        {/* Status Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-blue-400">Network Online & Audited</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6"
        >
          Secure & Anonymous <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Voting
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed"
        >
          Participate in decentralized governance with unbreakable cryptographic security. 
          Your voice matters, your identity remains completely private.
        </motion.p>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={() => navigate("/dashboard")}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl overflow-hidden transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]"
          >
            {/* Shimmer Effect */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
            <Wallet className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Connect MetaMask Wallet</span>
          </button>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 w-full max-w-4xl border-t border-white/5 pt-12"
        >
          {[
            { icon: ShieldCheck, title: "Verifiable Integrity", desc: "Every vote is recorded on an immutable ledger" },
            { icon: Fingerprint, title: "Zero-Knowledge", desc: "Prove your eligibility without revealing your identity" },
            { icon: Lock, title: "End-to-End Encrypted", desc: "Military-grade encryption for all ballot data" }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center mb-5 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
              </div>
              <h3 className="text-white font-medium mb-2 text-lg">{feature.title}</h3>
              <p className="text-sm text-slate-500 max-w-[200px]">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
