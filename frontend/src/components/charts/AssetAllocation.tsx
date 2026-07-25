import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

interface AllocationData {
  name: string;
  value: number;
}

interface AssetAllocationProps {
  assets?: { symbol: string, quantity: number, averagePurchasePrice: number }[];
  onLoadSample?: () => void;
}

const AssetAllocation: React.FC<AssetAllocationProps> = ({ assets = [], onLoadSample }) => {
  const [data, setData] = useState<AllocationData[]>([]);

  useEffect(() => {
    if (assets.length === 0) {
      setData([]);
      return;
    }

    const allocationMap: Record<string, number> = {};
    assets.forEach((item) => {
      const investedValue = item.quantity * item.averagePurchasePrice;
      allocationMap[item.symbol] = (allocationMap[item.symbol] || 0) + investedValue;
    });

    const chartData = Object.keys(allocationMap).map(symbol => ({
      name: symbol,
      value: allocationMap[symbol]
    })).sort((a, b) => b.value - a.value);

    setData(chartData);
  }, [assets]);

  return (
    <div className="w-full h-96 bg-[#1e293b]/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col">
      <h2 className="text-xl font-bold text-gray-200 mb-2">Asset Allocation</h2>
      <p className="text-xs text-gray-400 mb-6">Based on invested value</p>
      
      <div className="flex-grow w-full">
        {data.length === 0 ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl overflow-hidden group">
            {/* Skeleton Donut Chart */}
            <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
               <svg viewBox="0 0 100 100" className="w-40 h-40">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="100 25" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="50 75" strokeDashoffset="-100" />
               </svg>
            </div>
            
            <div className="z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-2 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium text-sm">No allocation data</p>
              <button 
                onClick={onLoadSample}
                className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Load Sample
              </button>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Invested']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-gray-300 font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AssetAllocation;
