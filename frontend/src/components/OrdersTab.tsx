import React, { useEffect, useState } from 'react';

interface OrdersTabProps {
  region: 'US' | 'IN' | 'CRYPTO';
}

interface Order {
  _id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  date: string;
  // Orders created before the close feature have no status; they are open.
  status?: 'open' | 'closed';
  closePrice?: number;
  closedAt?: string;
  realizedPnL?: number;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ region }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`http://localhost:5001/api/orders/demo@example.com?region=${region}`)
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching orders:", err);
        setIsLoading(false);
      });
  }, [region]);

  const currencySymbol = region === 'IN' ? '₹' : '$';

  const isClosed = (o: Order) => o.status === 'closed';
  const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleClose = async (order: Order) => {
    if (!window.confirm(`Close your ${order.type} position in ${order.symbol} at the current market price?`)) return;
    setClosingId(order._id);
    try {
      const res = await fetch(`http://localhost:5001/api/orders/${order._id}/close`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => (o._id === updated._id ? updated : o)));
      } else {
        const body = await res.json().catch(() => ({}));
        window.alert(body.error || 'Failed to close the position.');
      }
    } catch (err) {
      console.error("Error closing order:", err);
      window.alert('Failed to close the position.');
    } finally {
      setClosingId(null);
    }
  };

  // Realized P&L only exists for closed positions.
  const closedOrders = orders.filter(isClosed);
  const realizedTotal = closedOrders.reduce((sum, o) => sum + (o.realizedPnL || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-gray-400">
        <div className="text-4xl mb-4">📜</div>
        <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
        <p>You haven't executed any trades in the {region} market yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Symbol</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold text-right">Quantity</th>
              <th className="px-6 py-4 font-semibold text-right">Price</th>
              <th className="px-6 py-4 font-semibold text-right">Total</th>
              <th className="px-6 py-4 font-semibold text-right">Close Price</th>
              <th className="px-6 py-4 font-semibold text-right">Realized P&L</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-gray-300">
                  {new Date(o.date).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-bold text-white">{o.symbol}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${o.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {o.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-300">{o.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-300">
                  {currencySymbol}{o.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-white">
                  {currencySymbol}{money(o.total)}
                </td>
                <td className="px-6 py-4 text-right text-gray-300">
                  {isClosed(o) && typeof o.closePrice === 'number' ? `${currencySymbol}${money(o.closePrice)}` : '—'}
                </td>
                <td className={`px-6 py-4 text-right font-semibold ${!isClosed(o) ? 'text-gray-500' : (o.realizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isClosed(o) && typeof o.realizedPnL === 'number'
                    ? `${o.realizedPnL >= 0 ? '+' : '-'}${currencySymbol}${money(Math.abs(o.realizedPnL))}`
                    : '—'}
                </td>
                <td className="px-6 py-4 text-center">
                  {isClosed(o) ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                      Closed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClose(o)}
                      disabled={closingId === o._id}
                      className="px-3 py-1 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                      title="Close this position at the current market price"
                    >
                      {closingId === o._id ? 'Closing…' : 'Close'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {closedOrders.length > 0 && (
            <tfoot>
              <tr className="bg-white/5 border-t border-white/10 text-sm">
                <td className="px-6 py-4 font-semibold text-gray-300" colSpan={7}>
                  Realized P&L ({closedOrders.length} closed)
                </td>
                <td className={`px-6 py-4 text-right font-bold ${realizedTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {realizedTotal >= 0 ? '+' : '-'}{currencySymbol}{money(Math.abs(realizedTotal))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default OrdersTab;
