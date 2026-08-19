import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface HoldingsTabProps {
  region: 'US' | 'IN' | 'CRYPTO';
  watchlists: any[];
}

const HoldingsTab: React.FC<HoldingsTabProps> = ({ region, watchlists }) => {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  // Aggregate holdings across all watchlists for this region (where quantity > 0)
  const holdingsMap: Record<string, { quantity: number; totalCost: number; symbol: string }> = {};
  
  watchlists.filter(w => w.region === region).forEach(w => {
    w.assets.forEach((a: any) => {
      if (a.quantity > 0) {
        if (!holdingsMap[a.symbol]) {
          holdingsMap[a.symbol] = { quantity: 0, totalCost: 0, symbol: a.symbol };
        }
        holdingsMap[a.symbol].quantity += a.quantity;
        holdingsMap[a.symbol].totalCost += a.quantity * a.averagePurchasePrice;
      }
    });
  });

  const holdings = Object.values(holdingsMap);

  // Fetch live prices for these symbols
  useEffect(() => {
    if (holdings.length === 0) return;
    const symbolsStr = holdings.map(h => h.symbol).join(',');
    
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

  if (holdings.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-gray-400">
        <div className="text-4xl mb-4">💼</div>
        <h3 className="text-xl font-bold text-white mb-2">No Holdings Found</h3>
        <p>You haven't bought any assets in the {region} market yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Symbol</th>
              <th className="px-6 py-4 font-semibold text-right">Quantity</th>
              <th className="px-6 py-4 font-semibold text-right">Avg Price</th>
              <th className="px-6 py-4 font-semibold text-right">LTP</th>
              <th className="px-6 py-4 font-semibold text-right">Inv. Value</th>
              <th className="px-6 py-4 font-semibold text-right">Cur. Value</th>
              <th className="px-6 py-4 font-semibold text-right">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {holdings.map((h, i) => {
              const livePrice = livePrices[h.symbol] || 0;
              const avgPrice = h.totalCost / h.quantity;
              const invValue = h.totalCost;
              const curValue = h.quantity * livePrice;
              const pnl = curValue - invValue;
              const pnlPercent = invValue > 0 ? (pnl / invValue) * 100 : 0;
              const isProfit = pnl >= 0;

              return (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{h.symbol}</td>
                  <td className="px-6 py-4 text-right text-gray-300">{h.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {currencySymbol}{avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-white">
                    {livePrice ? `${currencySymbol}${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {currencySymbol}{invValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {livePrice ? `${currencySymbol}${curValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {currencySymbol}{Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs opacity-80">({Math.abs(pnlPercent).toFixed(2)}%)</span>
                    </div>
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

export default HoldingsTab;
