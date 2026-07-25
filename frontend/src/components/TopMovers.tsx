import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MoverData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

type TabType = 'gainers' | 'losers' | 'volumeShockers';

interface TopMoversProps {
  region: 'US' | 'IN' | 'CRYPTO';
  onSymbolClick?: (symbol: string) => void;
}

const TopMovers: React.FC<TopMoversProps> = ({ region, onSymbolClick }) => {
  const [activeTab, setActiveTab] = useState<TabType>('gainers');
  const [data, setData] = useState<{ [key in TabType]: MoverData[] }>({
    gainers: [],
    losers: [],
    volumeShockers: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMovers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/market/movers?region=${region}`);
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch movers", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovers();
  }, [region]);

  const renderList = (list: MoverData[]) => {
    if (isLoading) return <div className="p-4 text-center text-gray-400">Loading live data...</div>;
    
    return (
      <div className="flex flex-col gap-2 mt-4">
        {list.map(item => {
          const isUp = item.changePercent >= 0;
          return (
            <div 
              key={item.symbol} 
              className="flex justify-between items-center p-4 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-700/50 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer group"
              onClick={() => onSymbolClick && onSymbolClick(item.symbol)}
            >
              <div className="flex flex-col">
                <span className="font-bold text-gray-100 group-hover:text-blue-400 transition-colors">{item.symbol}</span>
                <span className="text-xs text-gray-500 truncate max-w-[140px] font-medium">{item.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-gray-100">${item.price.toFixed(2)}</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {item.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel border border-white/10 rounded-3xl p-7 shadow-2xl relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
          Top Movers
        </h2>
      </div>
      
      {/* Pill Navigation */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide relative z-10">
        <button 
          onClick={() => setActiveTab('gainers')}
          className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === 'gainers' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30' : 'bg-slate-800/50 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'}`}
        >
          Gainers
        </button>
        <button 
          onClick={() => setActiveTab('losers')}
          className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === 'losers' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/25 border border-rose-400/30' : 'bg-slate-800/50 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'}`}
        >
          Losers
        </button>
        <button 
          onClick={() => setActiveTab('volumeShockers')}
          className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${activeTab === 'volumeShockers' ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30' : 'bg-slate-800/50 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'}`}
        >
          Volume Shockers
        </button>
      </div>

      <div className="relative z-10 flex-grow">
        {renderList(data[activeTab])}
      </div>
    </div>
  );
};

export default TopMovers;
