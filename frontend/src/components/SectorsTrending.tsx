import React, { useState, useEffect } from 'react';
import { Briefcase, Activity, Code, Heart, Zap } from 'lucide-react';

interface SectorData {
  name: string;
  symbol: string;
  priceChange: number;
}

// Helper to map sector names to icons
const getIcon = (name: string) => {
  switch (name) {
    case 'Technology': return <Code className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />;
    case 'Healthcare': return <Heart className="w-5 h-5 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" />;
    case 'Financials': return <Briefcase className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />;
    case 'Energy': return <Zap className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />;
    default: return <Activity className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />;
  }
};

interface SectorsTrendingProps {
  region: 'US' | 'IN' | 'CRYPTO';
}

const SectorsTrending: React.FC<SectorsTrendingProps> = ({ region }) => {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSectors = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/market/sectors?region=${region}`);
        if (response.ok) {
          const data = await response.json();
          setSectors(data);
        }
      } catch (err) {
        console.error("Failed to fetch sectors", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSectors();
  }, [region]);

  if (isLoading) {
    return (
      <div className="w-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex items-center justify-center">
        <span className="text-gray-400">Loading sectors...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col glass-panel border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
      {/* Background glowing orb */}
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="p-7 pb-4 border-b border-white/5 relative z-10">
        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 border-l-[3px] border-emerald-500 pl-3">
          Trending Sectors
        </h2>
      </div>

      <div className="w-full overflow-x-auto relative z-10 flex-grow">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-slate-900/30">
              <th className="p-5 pl-7">Sector</th>
              <th className="p-5 pr-7 text-right">1D Change</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => {
              const isUp = sector.priceChange >= 0;

              return (
                <tr key={sector.symbol} className="border-b border-white/5 hover:bg-slate-800/40 transition-all duration-300 group">
                  <td className="p-5 pl-7">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 group-hover:border-white/10 group-hover:shadow-lg transition-all">
                        {getIcon(sector.name)}
                      </div>
                      <span className="font-bold text-gray-200 group-hover:text-white transition-colors">{sector.name}</span>
                    </div>
                  </td>
                  <td className="p-5 pr-7 text-right">
                    <span className={`font-bold px-3 py-1.5 rounded-lg ${isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {isUp ? '+' : ''}{sector.priceChange.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SectorsTrending;
