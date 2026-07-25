import React, { useState, useEffect } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

interface AssetDrawerProps {
  symbol: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string, quantity: number, price: number, targetWatchlistId: string) => void;
  watchlists?: any[];
}

const AssetDrawer: React.FC<AssetDrawerProps> = ({ symbol, isOpen, onClose, onAdd, watchlists = [] }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('0');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('');

  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(watchlists[0]._id);
    }
  }, [watchlists, selectedWatchlistId]);

  useEffect(() => {
    if (!isOpen || !symbol) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/market/history?symbols=${symbol}&range=1mo`);
        if (response.ok) {
          const json = await response.json();
          if (json.length > 0) {
            const chartData = json[0].quotes
              .filter((q: any) => q.close !== null)
              .map((q: any) => ({
                date: new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                value: q.close
              }));
            setData(chartData);
            
            if (chartData.length > 0) {
              const latestPrice = chartData[chartData.length - 1].value;
              setCurrentPrice(latestPrice);
              setPrice(latestPrice.toFixed(2));
              
              const firstPrice = chartData[0].value;
              setChangePercent(((latestPrice - firstPrice) / firstPrice) * 100);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch asset details", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [symbol, isOpen]);

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultWatchlistId = watchlists[0]?._id;
    if (!defaultWatchlistId) {
      alert("No portfolio exists to add to. Please create one on the overview page.");
      return;
    }
    if (symbol) {
      onAdd(symbol, parseFloat(quantity), parseFloat(price), defaultWatchlistId);
      onClose();
    }
  };

  const handleWatchlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWatchlistId) {
      alert("Please select a watchlist first.");
      return;
    }
    if (symbol) {
      // Add with 0 quantity to just track it in the watchlist
      onAdd(symbol, 0, currentPrice, selectedWatchlistId);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {symbol && (
          <div className="p-6">
            <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-3xl font-bold text-white mb-1">{symbol}</h2>
            <div className="flex items-end gap-3 mb-8">
              <span className="text-2xl font-bold text-gray-200">
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm font-semibold mb-1 ${changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% (1mo)
              </span>
            </div>

            {/* Chart */}
            <div className="w-full h-64 bg-black/20 rounded-xl p-4 border border-white/5 mb-8">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center text-blue-400 animate-pulse">
                  Loading chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="drawerColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={changePercent >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={changePercent >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={changePercent >= 0 ? '#10b981' : '#ef4444'} 
                      fill="url(#drawerColor)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Form */}
            {/* Execute Trade Form */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Execute Trade
              </h3>
              <form onSubmit={handleTradeSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Quantity</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Avg Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={price} 
                        onChange={e => setPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-7 pr-3 text-white focus:outline-none focus:border-blue-500" 
                        required 
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg mt-2 transition-all">
                  Confirm Trade
                </button>
              </form>
            </div>

            {/* Add to Watchlist Form */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                Add to Watchlist
              </h3>
              <form onSubmit={handleWatchlistSubmit} className="flex flex-col gap-4">
                <div>
                  <select
                    value={selectedWatchlistId}
                    onChange={e => setSelectedWatchlistId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="" disabled>-- Select a Watchlist --</option>
                    {watchlists.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.region})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-semibold py-2.5 rounded-lg shadow-lg transition-all">
                  + Add to Watchlist
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssetDrawer;
