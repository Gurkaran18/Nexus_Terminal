import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface WatchlistTabProps {
  region: 'US' | 'IN' | 'CRYPTO';
  watchlists: any[];
  onRefresh: () => void;
}

const WatchlistTab: React.FC<WatchlistTabProps> = ({ region, watchlists, onRefresh }) => {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  // Aggregate all symbols tracked in watchlists for this region
  const trackedSymbols = new Set<string>();
  watchlists.filter(w => w.region === region).forEach(w => {
    w.assets.forEach((a: any) => {
      trackedSymbols.add(a.symbol);
    });
  });

  const symbols = Array.from(trackedSymbols);

  useEffect(() => {
    if (symbols.length === 0) return;
    const symbolsStr = symbols.join(',');
    
    fetch(`http://localhost:5001/api/market/quote/${symbolsStr}`)
      .then(res => res.json())
      .then(data => {
        const prices: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach(d => prices[d.symbol] = d.price);
        } else if (data.symbol) {
          prices[data.symbol] = data.price;
        }
        setLivePrices(prices);
      })
      .catch(err => console.error("Error fetching live prices:", err));
  }, [region, watchlists]);

  const currencySymbol = region === 'IN' ? '₹' : '$';

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:5001/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'demo@example.com', name: newWatchlistName, region })
      });
      if (res.ok) {
        setNewWatchlistName('');
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to create watchlist:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const createForm = (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/30">
      <div>
        <h3 className="text-lg font-bold text-white">Create New Watchlist</h3>
        <p className="text-sm text-gray-400">Track a new set of assets in the {region} market.</p>
      </div>
      <form onSubmit={handleCreateWatchlist} className="flex w-full sm:w-auto gap-2">
        <input 
          type="text" 
          placeholder="Watchlist Name (e.g. Tech Stocks)"
          value={newWatchlistName}
          onChange={e => setNewWatchlistName(e.target.value)}
          className="flex-1 sm:w-64 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          required
        />
        <button 
          type="submit" 
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-colors whitespace-nowrap"
        >
          {isCreating ? 'Creating...' : '+ Create'}
        </button>
      </form>
    </div>
  );

  if (symbols.length === 0) {
    return (
      <>
        {createForm}
        <div className="glass-panel rounded-2xl p-8 text-center text-gray-400">
          <div className="text-4xl mb-4">👀</div>
          <h3 className="text-xl font-bold text-white mb-2">Watchlist Empty</h3>
          <p>Search for assets in the {region} market and add them to your watchlist.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {createForm}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Symbol</th>
                <th className="px-6 py-4 font-semibold text-right">LTP</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {symbols.map((symbol) => {
                const livePrice = livePrices[symbol];

                return (
                  <tr key={symbol} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/asset/${symbol}`)}>
                    <td className="px-6 py-4 font-bold text-white">{symbol}</td>
                    <td className="px-6 py-4 text-right font-semibold text-white">
                      {livePrice ? `${currencySymbol}${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Delete logic can be added later or just let them use the portfolio view
                          navigate('/portfolio');
                        }}
                        className="text-gray-500 hover:text-blue-400 transition-colors text-xs font-semibold"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default WatchlistTab;
