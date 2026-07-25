import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';

interface AssetDetailProps {
  onAdd: (symbol: string, quantity: number, averagePurchasePrice: number, targetWatchlistId: string) => void;
  watchlists: any[];
}

const AssetDetail: React.FC<AssetDetailProps> = ({ onAdd, watchlists }) => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [range, setRange] = useState<'1d' | '5d' | '1mo' | '1y'>('1mo');
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('');

  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(watchlists[0]._id);
    }
  }, [watchlists, selectedWatchlistId]);

  useEffect(() => {
    if (!symbol) return;
    
    const fetchAssetData = async () => {
      setIsLoading(true);
      try {
        const [quoteRes, historyRes] = await Promise.all([
          fetch(`http://localhost:5001/api/market/quote/${symbol}`),
          fetch(`http://localhost:5001/api/market/history?symbols=${symbol}&range=${range}`)
        ]);

        if (quoteRes.ok) {
          const qData = await quoteRes.json();
          setQuote(qData);
          setPrice(qData.price?.toString() || '');
        }

        if (historyRes.ok) {
          const hData = await historyRes.json();
          const targetData = hData.find((d: any) => d.symbol === symbol);
          if (targetData && targetData.quotes) {
            const chartData = targetData.quotes
              .filter((q: any) => q.close !== null)
              .map((q: any) => ({
                date: new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                price: q.close
              }));
            setHistory(chartData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch asset data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetData();
  }, [symbol, range]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !price) return;
    
    const defaultWatchlistId = watchlists[0]?._id;
    if (!defaultWatchlistId) {
      alert("No portfolio exists to add to. Please create one on the overview page.");
      return;
    }
    
    onAdd(symbol, parseFloat(quantity), parseFloat(price), defaultWatchlistId);
    setQuantity('');
  };

  const handleWatchlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWatchlistId) {
      alert("Please select a watchlist first.");
      return;
    }
    if (symbol && quote) {
      onAdd(symbol, 0, quote.price, selectedWatchlistId);
      // Optional: alert or toast here if needed
    }
  };

  if (isLoading && !quote) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quote) return <div className="text-white">Asset not found.</div>;

  const isUp = quote.changePercent >= 0;
  const changeColor = isUp ? 'text-emerald-400' : 'text-rose-400';
  const formatNum = (num: number) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);

  return (
    <div className="flex flex-col gap-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Left Column */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-white tracking-tight">{quote.symbol}</h1>
            <h2 className="text-xl text-gray-400 mb-4">{quote.name}</h2>
            
            <div className="flex items-end gap-4">
              <span className="text-5xl font-bold text-white">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency || 'USD' }).format(quote.price)}
              </span>
              <span className={`text-xl font-semibold flex items-center gap-1 mb-1 ${changeColor}`}>
                {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%) 1D
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 h-[400px] flex flex-col">
            <div className="flex gap-2 mb-4">
              {(['1d', '5d', '1mo', '1y'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${range === r ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10'}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="flex-1 w-full relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isUp ? "#10b981" : "#ef4444"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Stats */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4">Key Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Market Cap</div>
                <div className="text-lg font-semibold text-gray-200">{formatNum(quote.marketCap)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">P/E Ratio</div>
                <div className="text-lg font-semibold text-gray-200">{quote.trailingPE ? quote.trailingPE.toFixed(2) : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">52W High</div>
                <div className="text-lg font-semibold text-gray-200">${quote.fiftyTwoWeekHigh?.toFixed(2) || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">52W Low</div>
                <div className="text-lg font-semibold text-gray-200">${quote.fiftyTwoWeekLow?.toFixed(2) || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Action Card) */}
        <div className="w-full lg:w-80 flex flex-col gap-6 sticky top-24">
          
          {/* Execute Trade Form */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Trade {quote.symbol}
            </h3>
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  required
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Avg Price ($)</label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="border-t border-white/10 my-2"></div>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Estimated Cost</span>
                <span className="text-white font-semibold">
                  ${(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors"
              >
                Execute Trade
              </button>
            </form>
          </div>

          {/* Add to Watchlist Form */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              Add to Watchlist
            </h3>
            <form onSubmit={handleWatchlistSubmit} className="flex flex-col gap-4">
              <div>
                <select
                  value={selectedWatchlistId}
                  onChange={e => setSelectedWatchlistId(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="" disabled>-- Select a Watchlist --</option>
                  {watchlists.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.region})</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold py-3 px-4 rounded-xl shadow-lg transition-colors"
              >
                + Add to Watchlist
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;
