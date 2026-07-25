import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PortfolioPerformanceChartProps {
  watchlist?: string[];
  onLoadSample?: () => void;
}

const ranges = ['1w', '1mo', '1y', '2y', '5y'];

const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({ watchlist = [], onLoadSample }) => {
  const [range, setRange] = useState('1mo');
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (watchlist.length === 0) {
      setData([]);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/market/history?symbols=${watchlist.join(',')}&range=${range}`);
        if (response.ok) {
          const json = await response.json();
          
          // Aggregate logic: sum up the closing prices for all symbols on each date
          // (assuming quantity = 1 for simplicity of visualization as requested)
          const aggregated: Record<string, number> = {};
          
          json.forEach((item: any) => {
            item.quotes.forEach((q: any) => {
              // Ensure we have a valid close price
              if (q.close !== null && q.close !== undefined) {
                // Group by simple date string (YYYY-MM-DD)
                const dateKey = new Date(q.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: range === '1y' || range === '2y' || range === '5y' ? '2-digit' : undefined });
                aggregated[dateKey] = (aggregated[dateKey] || 0) + q.close;
              }
            });
          });

          // Convert object to array and sort by actual date parsing (since keys are formatted strings)
          // Actually, let's keep original Date strings for sorting, then format.
          const tempAggr: Record<string, number> = {};
          json.forEach((item: any) => {
             item.quotes.forEach((q: any) => {
                 if (q.close !== null && q.close !== undefined) {
                     const time = new Date(q.date).getTime();
                     tempAggr[time] = (tempAggr[time] || 0) + q.close;
                 }
             });
          });
          
          const chartData = Object.keys(tempAggr)
            .sort((a, b) => Number(a) - Number(b))
            .map(timeStr => {
               const d = new Date(Number(timeStr));
               const isYear = range === '1y' || range === '2y' || range === '5y';
               return {
                  date: d.toLocaleDateString(undefined, { month: 'short', day: isYear ? undefined : 'numeric', year: isYear ? '2-digit' : undefined }),
                  value: tempAggr[timeStr]
               };
            });

          setData(chartData);
        }
      } catch (err) {
        console.error("Failed to fetch historical data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [watchlist, range]);

  return (
    <div className="w-full h-96 bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-200">Watchlist Growth</h2>
        
        {/* Time Range Toggles */}
        {watchlist.length > 0 && (
          <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
            {ranges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                  range === r ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow w-full">
        {watchlist.length === 0 ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl overflow-hidden group">
            {/* Skeleton Chart Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:10},{v:15},{v:12},{v:20},{v:18},{v:25},{v:22},{v:30}]}>
                   <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-2 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">No assets in your portfolio</p>
              <button 
                onClick={onLoadSample}
                className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Load Sample Portfolio Data
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-blue-400 animate-pulse">
            Calculating historical performance...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value > 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#60a5fa' }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Watchlist Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PortfolioPerformanceChart;
