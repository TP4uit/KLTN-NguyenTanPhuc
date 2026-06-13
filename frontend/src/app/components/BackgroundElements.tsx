export function BackgroundElements() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      {/* Geometric Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Abstract Connectors Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-pattern" width="100" height="173.2" patternUnits="userSpaceOnUse">
            <path d="M50 0 L100 28.8 L100 86.6 L50 115.4 L0 86.6 L0 28.8 Z" fill="none" stroke="#fff" strokeWidth="1"/>
            <path d="M50 173.2 L100 144.4 L100 86.6 L50 115.4 L0 86.6 L0 144.4 Z" fill="none" stroke="#fff" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
      </svg>
      
      {/* Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[150px]" />
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px]" />
      
      {/* Overlay to fade out grid at the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,1)_80%)]" />
    </div>
  );
}
