import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";

export function ZKPModal() {
  const [hexCode, setHexCode] = useState("0x00000000");

  useEffect(() => {
    // Generates a random cryptographic-looking hex code every 100ms
    const interval = setInterval(() => {
      setHexCode(`0x${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0').toUpperCase()}`);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] rounded-2xl p-8 max-w-sm sm:max-w-md w-full text-center relative overflow-hidden"
      >
        {/* Decorative Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0V0zm10 10h10v10H10V10zM0 10h10v10H0V10z' fill='%23ffffff' fill-rule='evenodd' fill-opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        {/* High-tech Spinner */}
        <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          {/* Outer dashed ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full"
          />
          {/* Middle solid ring with gradient */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-2 border-transparent border-t-blue-400 border-b-cyan-400 rounded-full"
          />
          {/* Inner pulsing glow */}
          <motion.div
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-5 bg-blue-500/20 rounded-full blur-md"
          />
          
          {/* Center Lock Icon */}
          <Lock className="w-8 h-8 text-cyan-300 relative z-10 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
          
          {/* Orbiting particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              className="absolute inset-0 origin-center"
            >
              <div className="w-2 h-2 bg-cyan-300 rounded-full shadow-[0_0_10px_#67e8f9] absolute -top-1 left-1/2 -translate-x-1/2" />
            </motion.div>
          ))}
        </div>

        {/* Typography */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
          Generating Zero-Knowledge Proof
        </h3>
        
        {/* Simulated Cryptographic Hash Generation */}
        <div className="text-xs font-mono text-cyan-400 mb-5 h-4 flex justify-center gap-1 opacity-80">
          <span>[</span>
          <span>{hexCode}</span>
          <span>...</span>
          <span>]</span>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed px-2">
          Encrypting your vote and generating anonymous proof locally... 
          <span className="block mt-1 font-medium text-slate-300">Please do not close this window.</span>
        </p>
        
        {/* Bottom edge neon scanning line */}
        <motion.div 
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-0 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-75" 
        />
      </motion.div>
    </motion.div>
  );
}
