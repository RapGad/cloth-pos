import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, PieChart, Download } from 'lucide-react';
import { api } from '../api.ts';

export const Reports: React.FC = () => {
  const [report, setReport] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadReport = async () => {
    let start = new Date();
    let end = new Date();

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (dateRange === 'month') {
      start.setMonth(end.getMonth() - 1);
    } else if (dateRange === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    }

    const data = await api.getProfitReport(start.toISOString(), end.toISOString());
    setReport(data);
  };

  useEffect(() => {
    loadReport();
  }, [dateRange, customStart, customEnd]);

  const totalRevenue = report.reduce((acc, r) => acc + r.revenue, 0);
  const totalProfit = report.reduce((acc, r) => acc + r.profit, 0);

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Profit Reports</h1>
        <div className="flex gap-4 items-center">
          <div className="flex bg-white rounded-lg shadow-sm border p-1">
            {['today', 'week', 'month', 'custom'].map((range) => (
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
          {dateRange === 'custom' && (
            <div className="flex gap-4 items-center bg-white border rounded-lg px-4 py-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">From</label>
                <input 
                  type="date" 
                  className="border-none focus:ring-0 text-sm p-0"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                />
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">To</label>
                <input 
                  type="date" 
                  className="border-none focus:ring-0 text-sm p-0"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
            <ShoppingBag size={32} />
          </div>
          <p className="text-gray-500 font-medium mb-1">Total Revenue</p>
          <p className="text-4xl font-black text-gray-900">GH₵{totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-green-50 text-green-600 rounded-2xl mb-4">
            <TrendingUp size={32} />
          </div>
          <p className="text-gray-500 font-medium mb-1">Net Profit</p>
          <p className="text-4xl font-black text-green-600">GH₵{totalProfit.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <PieChart size={20} className="text-blue-600" />
            Category Breakdown
          </h3>
          <button className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="overflow-auto flex-1 p-6">
          <table className="w-full">
            <thead className="text-left text-gray-500 text-sm border-b">
              <tr>
                <th className="pb-4 font-medium">Category</th>
                <th className="pb-4 font-medium text-right">Revenue</th>
                <th className="pb-4 font-medium text-right">Profit</th>
                <th className="pb-4 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.map(item => {
                const margin = (item.profit / (item.revenue || 1)) * 100;
                return (
                  <tr key={item.category} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-800">{item.category || 'General'}</td>
                    <td className="py-4 text-right text-gray-600">GH₵{item.revenue.toFixed(2)}</td>
                    <td className="py-4 text-right font-bold text-green-600">GH₵{item.profit.toFixed(2)}</td>
                    <td className="py-4 text-right">
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {report.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-400">
                    No data available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
