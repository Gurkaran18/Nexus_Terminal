import React, { useEffect, useRef, useState } from 'react';
import { useMarketData } from './hooks/useMarketData';
import SearchComponent from './components/SearchComponent';
import TopMovers from './components/TopMovers';
import SectorsTrending from './components/SectorsTrending';
import AssetDrawer from './components/AssetDrawer';
import WatchlistView from './components/WatchlistView';
import AssetDetail from './components/AssetDetail';
import PortfolioView from './components/PortfolioView';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './index.css';

interface WatchlistAsset {
  symbol: string;
  quantity: number;
  averagePurchasePrice: number;
}

interface WatchlistData {
  _id: string;
  name: string;
  region: 'US' | 'IN';
  assets: WatchlistAsset[];
}

// ---------------------------------------------------------------------------
// Child Component: Mini Asset Card for Live Ticker Strip
// ---------------------------------------------------------------------------
interface MiniAssetCardProps {
  symbol: string;
  price: number;
}

const MiniAssetCard: React.FC<MiniAssetCardProps> = ({ symbol, price }) => {
  const prevPriceRef = useRef<number>(price);
  const [flashClass, setFlashClass] = useState<string>('');

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlashClass('flash-up');
    } else if (price < prevPriceRef.current) {
      setFlashClass('flash-down');
    }
    prevPriceRef.current = price;

    const timer = setTimeout(() => {
      setFlashClass('');
    }, 1500);
    return () => clearTimeout(timer);
  }, [price]);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);

  return (
    <div className="mini-ticker">
      <span className="mini-symbol">{symbol}</span>
      <span className={`mini-price ${flashClass}`}>
        {formattedPrice}
      </span>
    </div>
  );
};

const SYMBOL_NAMES: Record<string, string> = {
  'GSPC': 'S&P 500',
  'DJI': 'DOW JONES',
  'IXIC': 'NASDAQ',
  'NSEI': 'NIFTY 50',
  'BSESN': 'SENSEX',
  'CNXIT': 'NIFTY IT'
};

// ---------------------------------------------------------------------------
// Main Dashboard Layout
// ---------------------------------------------------------------------------
const App: React.FC = () => {
  const [region, setRegion] = useState<'US' | 'IN' | 'CRYPTO'>('US');
  const marketPayload = useMarketData(region);
  const { regionData, marqueeData } = marketPayload || { regionData: {}, marqueeData: {} };
  
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Watchlists State
  const [watchlists, setWatchlists] = useState<WatchlistData[]>([]);
  const [portfolioPnL, setPortfolioPnL] = useState<{ amount: number, percent: number }>({ amount: 0, percent: 0 });
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const userEmail = 'demo@example.com';

  const fetchWatchlists = async () => {
    try {
      const res = await fetch(`http://localhost:5001/api/watchlists/${userEmail}`);
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data);
      }
    } catch (err) {
      console.error("Failed to fetch watchlists:", err);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  // Calculate Portfolio 24h P&L whenever watchlists change
  useEffect(() => {
    const fetchPnL = async () => {
      if (watchlists.length === 0) {
        setPortfolioPnL({ amount: 0, percent: 0 });
        return;
      }
      
      const symbols = Array.from(new Set(watchlists.flatMap(w => w.assets.map(a => a.symbol))));
      if (symbols.length === 0) {
        setPortfolioPnL({ amount: 0, percent: 0 });
        return;
      }

      try {
        const res = await fetch(`http://localhost:5001/api/market/quotes?symbols=${symbols.join(',')}`);
        if (res.ok) {
          const quotes = await res.json();
          let totalValue = 0;
          let totalChange = 0;
          
          watchlists.forEach(w => {
            w.assets.forEach(a => {
              const q = quotes.find((x: any) => x.symbol === a.symbol);
              if (q) {
                totalValue += a.quantity * q.price;
                totalChange += a.quantity * q.change;
              }
            });
          });
          
          const previousValue = totalValue - totalChange;
          const percent = previousValue > 0 ? (totalChange / previousValue) * 100 : 0;
          setPortfolioPnL({ amount: totalChange, percent });
        }
      } catch (err) {
        console.error("Failed to fetch quotes for P&L", err);
      }
    };
    
    fetchPnL();
    
    // Refresh P&L periodically every minute
    const intervalId = setInterval(fetchPnL, 60000);
    return () => clearInterval(intervalId);
  }, [watchlists]);

  // Calculate Dynamic Health Index
  const healthIndex = React.useMemo(() => {
    if (!watchlists || watchlists.length === 0) return 0;
    
    let totalInvested = 0;
    let cryptoInvested = 0;
    const uniqueAssets = new Set<string>();
    
    watchlists.forEach(w => {
      w.assets.forEach(a => {
        const invested = a.quantity * a.averagePurchasePrice;
        totalInvested += invested;
        uniqueAssets.add(a.symbol);
        
        // Very basic heuristic for crypto: ends with -USD
        if (a.symbol.endsWith('-USD')) {
          cryptoInvested += invested;
        }
      });
    });

    if (totalInvested === 0) return 0;

    let score = 50; // Base score
    
    // Diversification by number of assets (up to +30 points)
    const assetBonus = Math.min(uniqueAssets.size * 5, 30);
    score += assetBonus;
    
    // Crypto risk penalty
    const cryptoRatio = cryptoInvested / totalInvested;
    if (cryptoRatio > 0.8) {
      score -= 25; // Heavily penalized for >80% crypto
    } else if (cryptoRatio > 0.5) {
      score -= 15; // Penalized for >50% crypto
    } else if (cryptoRatio > 0) {
      score += 5; // Small bonus for some crypto diversification
    }
    
    // Ensure score stays between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [watchlists]);

  const handleCreateWatchlist = async () => {
    const name = prompt("Enter Watchlist Name:");
    if (!name) return;
    const regionSelection = prompt("Enter Region (US or IN):", "US");
    const reg = regionSelection?.toUpperCase() === 'IN' ? 'IN' : 'US';
    
    try {
      const res = await fetch('http://localhost:5001/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, name, region: reg })
      });
      if (res.ok) {
        fetchWatchlists();
      }
    } catch (err) {
      console.error("Failed to create watchlist:", err);
    }
  };

  const handleRenameWatchlist = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/watchlists/${id}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setEditingWatchlistId(null);
        fetchWatchlists();
      }
    } catch (err) {
      console.error("Failed to rename:", err);
    }
  };

  const handleAddToWatchlist = (symbol: string) => {
    setDrawerSymbol(symbol);
  };

  const handleAddTrade = async (symbol: string, quantity: number, averagePurchasePrice: number, targetWatchlistId: string) => {
    if (!targetWatchlistId) {
      alert("Please select a watchlist to add to.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:5001/api/watchlists/${targetWatchlistId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, quantity, averagePurchasePrice })
      });
      if (res.ok) {
        fetchWatchlists();
        alert(`${symbol} added to Watchlist!`);
      }
    } catch (err) {
      console.error("Failed to add trade:", err);
    }
  };

  const handleUpdateAsset = async (symbol: string, quantity: number, averagePurchasePrice: number) => {
    const w = watchlists.find(w => w.assets.some(a => a.symbol === symbol));
    if (!w) return;
    try {
      await fetch(`http://localhost:5001/api/watchlists/${w._id}/assets/${symbol}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, averagePurchasePrice })
      });
      fetchWatchlists();
    } catch (err) {
      console.error("Failed to update asset:", err);
    }
  };

  const handleDeleteAsset = async (symbol: string) => {
    try {
      const relevant = watchlists.filter(w => w.assets.some(a => a.symbol === symbol));
      for (const w of relevant) {
        await fetch(`http://localhost:5001/api/watchlists/${w._id}/assets/${symbol}`, { method: 'DELETE' });
      }
      fetchWatchlists();
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`sidebar glass-panel border-r border-t-0 border-b-0 border-l-0 flex flex-col p-6 sticky top-0 h-screen overflow-y-auto ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            NexusTerminal
          </h1>
        </div>

        <div className="mb-8 flex-grow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wider">My Watchlists</h3>
            <button onClick={handleCreateWatchlist} className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <button 
            onClick={() => { navigate('/'); setIsSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${location.pathname === '/' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-300 hover:bg-white/5'}`}
          >
            Market Overview
          </button>
          
          <div className="flex flex-col gap-1">
            {watchlists.map(w => (
              <div key={w._id} className="group relative">
                {editingWatchlistId === w._id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-sm text-white w-full"
                      autoFocus
                      onKeyDown={e => { if(e.key==='Enter') handleRenameWatchlist(w._id); if(e.key==='Escape') setEditingWatchlistId(null); }}
                    />
                    <button onClick={() => handleRenameWatchlist(w._id)} className="text-emerald-400">✓</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { navigate(`/watchlist/${w._id}`); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${location.pathname === `/watchlist/${w._id}` ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <span className="truncate pr-2">{w.name}</span>
                    <span className="text-[10px] uppercase font-bold opacity-60 bg-black/20 px-1.5 py-0.5 rounded">{w.region}</span>
                  </button>
                )}
                {/* Rename Button (shows on hover) */}
                {location.pathname !== `/watchlist/${w._id}` && editingWatchlistId !== w._id && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingWatchlistId(w._id); setEditName(w.name); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                D
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-200">Demo User</div>
                <div className="text-xs text-gray-500">{userEmail}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        
        {/* TOP NAVIGATION / TICKER BAR */}
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-3xl font-bold header-gradient-text tracking-tight">Market Overview</h2>
                <p className="text-sm text-gray-400 mt-1">Real-time telemetry and portfolio analytics</p>
              </div>
            </div>

            {/* Middle Search Component */}
            <div className="flex-grow max-w-md mx-auto hidden md:block w-full">
              <SearchComponent onAdd={handleAddToWatchlist} />
            </div>
            
            <div className="flex bg-slate-900/80 border border-white/10 rounded-lg p-1 backdrop-blur-md shadow-lg overflow-x-auto">
              <button 
                onClick={() => setRegion('US')}
                className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all duration-200 ${region === 'US' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                🇺🇸 US Markets
              </button>
              <button 
                onClick={() => setRegion('IN')}
                className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all duration-200 ${region === 'IN' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                🇮🇳 Indian Markets
              </button>
              <button 
                onClick={() => setRegion('CRYPTO')}
                className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all duration-200 ${region === 'CRYPTO' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                🪙 Crypto
              </button>
            </div>
          </div>
          
          <div className="md:hidden">
             <SearchComponent onAdd={handleAddToWatchlist} />
          </div>

          {/* Marquee Ticker */}
          <div className="w-full bg-slate-900/40 border-y border-white/5 py-2 overflow-hidden flex items-center">
            <div className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-white/10 z-10 bg-slate-950">
              Live
            </div>
            {!marketPayload ? (
              <div className="text-xs text-gray-500 flex items-center gap-2 pl-4">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Connecting to socket stream...
              </div>
            ) : (
              <div className="marquee-wrapper ml-4">
                <div className="marquee-content">
                  {/* Duplicate array for seamless infinite scrolling */}
                  {[...Object.entries(marqueeData), ...Object.entries(marqueeData)].map(([symbol, price], i) => (
                    <div key={`${symbol}-${i}`} className="flex items-center gap-2 mx-6">
                      <span className="text-xs font-semibold text-gray-400">{symbol}</span>
                      <span className="text-sm font-bold text-gray-200">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price as number)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* KPI SUMMARY BAR (Globally Visible) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div 
            onClick={() => navigate('/portfolio')}
            className="glass-panel rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:bg-slate-800/60 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 group relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider group-hover:text-blue-400 transition-colors">Total Invested</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
            <span className="text-2xl font-bold text-white relative z-10">
              ${watchlists.reduce((total, w) => total + w.assets.reduce((sum, a) => sum + (a.quantity * a.averagePurchasePrice), 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">24h P&L (Est.)</span>
            <span className={`text-2xl font-bold flex items-center gap-2 ${portfolioPnL.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioPnL.amount >= 0 ? '+' : '-'}${Math.abs(portfolioPnL.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${portfolioPnL.amount >= 0 ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'}`}>
                {portfolioPnL.percent >= 0 ? '+' : ''}{portfolioPnL.percent.toFixed(2)}%
              </span>
            </span>
          </div>
          <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Health Index</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-blue-400">{healthIndex}<span className="text-sm text-gray-500">/100</span></span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${healthIndex > 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_#10b981]' : healthIndex > 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-[0_0_8px_#eab308]' : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_#f43f5e]'}`}
                  style={{ width: `${healthIndex}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Socket Status</span>
            <div className="flex items-center gap-2 mt-auto">
              {marketPayload ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                  </span>
                  <span className="text-sm font-bold text-emerald-400 tracking-widest">LIVE</span>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-sm font-bold text-rose-500 tracking-widest">OFFLINE</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={
            <>
              {/* REGIONAL INDICES WIDGET */}
              {region !== 'CRYPTO' && (
                <div className="mb-8">
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(regionData).map(([symbol, price]) => (
                       <MiniAssetCard key={symbol} symbol={SYMBOL_NAMES[symbol] || symbol} price={price as number} />
                    ))}
                  </div>
                </div>
              )}

              {/* WIDGET GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1">
                  <TopMovers region={region} onSymbolClick={(symbol) => setDrawerSymbol(symbol)} />
                </div>
                <div className="lg:col-span-2">
                  <SectorsTrending region={region} />
                </div>
              </div>
            </>
          } />
          <Route path="/watchlist/:watchlistId" element={
            <WatchlistView />
          } />
          <Route path="/asset/:symbol" element={
            <AssetDetail onAdd={handleAddTrade} watchlists={watchlists} />
          } />
          <Route path="/portfolio" element={
            <PortfolioView 
              watchlists={watchlists} 
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          } />
        </Routes>

      </main>

      {/* Asset Drawer */}
      <AssetDrawer 
        symbol={drawerSymbol} 
        isOpen={!!drawerSymbol} 
        onClose={() => setDrawerSymbol(null)} 
        onAdd={handleAddTrade}
        watchlists={watchlists}
      />
    </div>
  );
};

export default App;
