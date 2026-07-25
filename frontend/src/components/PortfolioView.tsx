import React from 'react';
import PortfolioPerformanceChart from './charts/PortfolioPerformanceChart';
import AssetAllocation from './charts/AssetAllocation';
import { ArrowLeft, Edit2, Trash2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

interface PortfolioViewProps {
  watchlists: WatchlistData[];
  onUpdateAsset?: (symbol: string, quantity: number, price: number) => Promise<void>;
  onDeleteAsset?: (symbol: string) => Promise<void>;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ watchlists, onUpdateAsset, onDeleteAsset }) => {
  const navigate = useNavigate();
  const [editingSymbol, setEditingSymbol] = React.useState<string | null>(null);
  const [editQty, setEditQty] = React.useState<string>('');
  const [editPrice, setEditPrice] = React.useState<string>('');

  // Aggregate all assets across all watchlists
  const allAssets = watchlists.reduce((acc, w) => {
    w.assets.forEach(a => {
      const existing = acc.find(x => x.symbol === a.symbol);
      if (existing) {
        // Average the price
        const totalValue = (existing.quantity * existing.averagePurchasePrice) + (a.quantity * a.averagePurchasePrice);
        const totalQty = existing.quantity + a.quantity;
        existing.quantity = totalQty;
        existing.averagePurchasePrice = totalQty > 0 ? totalValue / totalQty : 0;
      } else {
        acc.push({ ...a });
      }
    });
    return acc;
  }, [] as WatchlistAsset[]);

  const symbols = allAssets.map(a => a.symbol);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Overview
          </button>
          <h2 className="text-3xl font-bold text-white tracking-tight">All Investments</h2>
          <p className="text-sm text-gray-400 mt-1">Aggregated portfolio across all watchlists • {allAssets.length} assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioPerformanceChart watchlist={symbols} />
        </div>
        <div className="lg:col-span-1">
          <AssetAllocation assets={allAssets} />
        </div>
      </div>

      {/* Asset Table */}
      <div className="glass-panel border-white/10 rounded-xl p-6 mt-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <h3 className="text-xl font-bold text-gray-200 mb-4 relative z-10">Total Holdings</h3>
        {allAssets.length === 0 ? (
          <div className="text-gray-500 py-8 text-center relative z-10 bg-slate-900/50 rounded-lg border border-white/5">
            You have no investments yet. Search for an asset and execute a trade to add it to your portfolio.
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 bg-slate-900/30">
                  <th className="pb-3 pt-3 px-4 font-semibold rounded-tl-lg">Symbol</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-right">Quantity</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-right">Avg Price</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-right">Total Value</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-center rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allAssets.map((asset, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4 font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{asset.symbol}</td>
                    
                    {editingSymbol === asset.symbol ? (
                      <>
                        <td className="py-4 px-4 text-right">
                          <input 
                            type="number" 
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-24 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-right text-white focus:outline-none"
                            step="any"
                          />
                        </td>
                        <td className="py-4 px-4 text-right">
                          <input 
                            type="number" 
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-right text-white focus:outline-none"
                            step="any"
                          />
                        </td>
                        <td className="py-4 px-4 text-right text-emerald-400 font-bold">
                          ${(parseFloat(editQty || '0') * parseFloat(editPrice || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center items-center gap-3">
                            <button 
                              onClick={() => {
                                if(onUpdateAsset) onUpdateAsset(asset.symbol, parseFloat(editQty), parseFloat(editPrice));
                                setEditingSymbol(null);
                              }}
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
                        <td className="py-4 px-4 text-right text-gray-400 font-medium">{asset.quantity.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right text-gray-400 font-medium">${asset.averagePurchasePrice.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right text-emerald-400 font-bold">
                          ${(asset.quantity * asset.averagePurchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-center">
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
                              onClick={() => {
                                if(window.confirm(`Remove ${asset.symbol} from portfolio?`) && onDeleteAsset) {
                                  onDeleteAsset(asset.symbol);
                                }
                              }}
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

export default PortfolioView;
