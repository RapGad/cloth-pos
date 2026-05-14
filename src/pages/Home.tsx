import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, AlertTriangle, Calendar, PieChart, Package } from 'lucide-react';
import { api } from '../api.ts';

export const Home: React.FC = () => {
  const [report, setReport] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    totalOrders: 0,
    lowStock: 0,
    inventoryValue: 0
  });
  const [dateRange, setDateRange] = useState('today');

  const loadData = async () => {
    try {
      const now = new Date();
      let start = new Date();
      
      if (dateRange === 'today') {
        const today = new Date();
        today.setDate(today.getDate() - 6); // Show last 7 days for trend even if filter is today
        start = today;
      } else if (dateRange === 'week') {
        start.setDate(now.getDate() - 7);
      } else if (dateRange === 'month') {
        start.setMonth(now.getMonth() - 1);
      }

      const startDate = start.toISOString();
      const endDate = now.toISOString();

      const [profitData, products, trendData] = await Promise.all([
        api.getProfitReport(startDate, endDate),
        api.getProducts(),
        api.getSalesTrend(startDate, endDate)
      ]);

      setReport(profitData);
      setTrend(trendData);
      
      // Calculate basic stats
      const lowStockCount = products.reduce((acc, p) => 
        acc + p.variants.filter(v => v.stock_qty < 5).length, 0
      );

      const inventoryValue = products.reduce((acc, p) => 
        acc + p.variants.reduce((vAcc, v) => vAcc + (v.stock_qty * p.selling_price), 0), 0
      );

      setStats({
        todaySales: profitData.reduce((acc, r) => acc + r.revenue, 0),
        totalOrders: 0, 
        lowStock: lowStockCount,
        inventoryValue: inventoryValue
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const totalProfit = report.reduce((acc, r) => acc + r.profit, 0);

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex bg-white rounded-lg shadow-sm border p-1">
          {['today', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === range 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag size={24} />
            </div>
            <h3 className="text-gray-500 font-medium">Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">GH₵{stats.todaySales.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Total revenue for selected period</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package size={24} />
            </div>
            <h3 className="text-gray-500 font-medium">Inventory Values</h3>
          </div>
          <p className="text-3xl font-bold text-indigo-600">GH₵{stats.inventoryValue?.toFixed(2) || '0.00'}</p>
          <p className="text-sm text-gray-500 mt-2">Total value of stock on hand</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-gray-500 font-medium">Net Profit</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">GH₵{totalProfit.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Total profit after costs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-gray-500 font-medium">Low Stock</h3>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.lowStock}</p>
          <p className="text-sm text-gray-500 mt-2">Items with less than 5 units</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-blue-600" />
            Profit by Category
          </h3>
          <div className="space-y-4">
            {report.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{item.category || 'General'}</span>
                  <span className="font-bold text-gray-900">GH₵{item.profit.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (item.profit / (totalProfit || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {report.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                No sales data for this period
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Performance Trend
          </h3>
          <div className="flex-1 flex items-end gap-2 h-48 pt-4">
            {trend.length === 0 ? (
              <div className="w-full text-center text-gray-400 self-center">No trend data available</div>
            ) : (
              trend.map((day) => {
                const maxRevenue = Math.max(...trend.map(t => t.revenue), 1);
                const heightPercentage = (day.revenue / maxRevenue) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div 
                      className="w-full bg-blue-100 rounded-t-sm hover:bg-blue-200 transition-all relative"
                      style={{ height: `${Math.max(heightPercentage, 4)}%` }} // Min height for visibility
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                        GH₵{day.revenue.toFixed(2)}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 rotate-0 truncate w-full text-center">
                      {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
