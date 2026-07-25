import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PortfolioPerformanceChart from './charts/PortfolioPerformanceChart';
import AssetAllocation from './charts/AssetAllocation';
import { Edit2, Trash2, Check, X } from 'lucide-react';

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

const WatchlistView: React.FC = () => {
  const { watchlistId } = useParams<{ watchlistId: string }>();
  const [watchlist, setWatchlist] = useState<WatchlistData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  // Note: For charts we just need an array of symbols (the existing props), but for the AssetAllocation we might need to modify it or just pass the full assets.
  // Actually, AssetAllocation fetches from /api/portfolio/:email. It will now need to fetch the specific watchlist, or we pass the data down.
  // We'll update the charts to take the specific data instead of fetching it themselves, or update their fetch logic.
  // For now, let's just fetch the watchlist here.

  useEffect(() => {
    // In a real app we'd fetch the specific watchlist by ID.
    // Since we only added GET /api/watchlists/:email, we fetch all and find it.
    const fetchWatchlist = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:5001/api/watchlists/demo@example.com`);
        if (res.ok) {
          const all = await res.json();
          const found = all.find((w: any) => w._id === watchlistId);
          setWatchlist(found || null);
        }
      } catch (err) {
        console.error("Error fetching watchlist", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWatchlist();
  }, [watchlistId]);

  const handleUpdate = async (symbol: string) => {
    if (!watchlistId) return;
    try {
      await fetch(`http://localhost:5001/api/watchlists/${watchlistId}/assets/${symbol}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseFloat(editQty), averagePurchasePrice: parseFloat(editPrice) })
      });
      // simple refresh
      const res = await fetch(`http://localhost:5001/api/watchlists/demo@example.com`);
      if (res.ok) {
        const all = await res.json();
        const found = all.find((w: any) => w._id === watchlistId);
        setWatchlist(found || null);
      }
      setEditingSymbol(null);
    } catch (err) {
      console.error("Failed to update", err);
    }
  };

  const handleDelete = async (symbol: string) => {
    if (!watchlistId) return;
    if (!window.confirm(`Remove ${symbol}?`)) return;
    try {
      await fetch(`http://localhost:5001/api/watchlists/${watchlistId}/assets/${symbol}`, { method: 'DELETE' });
      // simple refresh
      const res = await fetch(`http://localhost:5001/api/watchlists/demo@example.com`);
      if (res.ok) {
        const all = await res.json();
        const found = all.find((w: any) => w._id === watchlistId);
        setWatchlist(found || null);
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 p-8">Loading watchlist data...</div>;
  }

  if (!watchlist) {
    return <div className="text-gray-400 p-8">Watchlist not found.</div>;
  }

  const symbols = watchlist.assets.map(a => a.symbol);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{watchlist.name}</h2>
          <p className="text-sm text-gray-400 mt-1">{watchlist.region === 'US' ? '🇺🇸 US Market' : '🇮🇳 Indian Market'} • {watchlist.assets.length} assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           {/* We pass the symbols to the Performance Chart so it can fetch history */}
          <PortfolioPerformanceChart watchlist={symbols} />
        </div>
        <div className="lg:col-span-1">
           {/* AssetAllocation needs to be modified to accept direct data rather than fetching. We will pass assets directly. */}
          <AssetAllocation assets={watchlist.assets} />
        </div>
      </div>

      {/* Asset Table */}
      <div className="glass-panel border-white/10 rounded-xl p-6 mt-6">
        <h3 className="text-xl font-bold text-gray-200 mb-4">Holdings</h3>
        {watchlist.assets.length === 0 ? (
          <div className="text-gray-500 py-4 text-center">No assets in this watchlist yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="pb-3 font-semibold">Symbol</th>
                  <th className="pb-3 font-semibold text-right">Quantity</th>
                  <th className="pb-3 font-semibold text-right">Avg Price</th>
                  <th className="pb-3 font-semibold text-right">Total Value</th>
                  <th className="pb-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.assets.map((asset, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-4 font-bold text-gray-200 group-hover:text-blue-400">{asset.symbol}</td>
                    
                    {editingSymbol === asset.symbol ? (
                      <>
                        <td className="py-4 text-right">
                          <input 
                            type="number" 
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-24 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-right text-white focus:outline-none"
                            step="any"
                          />
                        </td>
                        <td className="py-4 text-right">
                          <input 
                            type="number" 
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-right text-white focus:outline-none"
                            step="any"
                          />
                        </td>
                        <td className="py-4 text-right text-emerald-400 font-semibold">
                          ${(parseFloat(editQty || '0') * parseFloat(editPrice || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex justify-center items-center gap-3">
                            <button 
                              onClick={() => handleUpdate(asset.symbol)}
                              className="text-emerald-400 hover:text-emerald-300"
                              title="Save"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setEditingSymbol(null)}
                              className="text-gray-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 text-right text-gray-400">{asset.quantity}</td>
                        <td className="py-4 text-right text-gray-400">${asset.averagePurchasePrice.toFixed(2)}</td>
                        <td className="py-4 text-right text-emerald-400 font-semibold">${(asset.quantity * asset.averagePurchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-4 text-center">
                          <div className="flex justify-center items-center gap-3">
                            <button 
                              onClick={() => {
                                setEditingSymbol(asset.symbol);
                                setEditQty(asset.quantity.toString());
                                setEditPrice(asset.averagePurchasePrice.toString());
                              }}
                              className="text-blue-400 hover:text-blue-300"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(asset.symbol)}
                              className="text-rose-400 hover:text-rose-300"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistView;
