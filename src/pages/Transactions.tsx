import React, { useEffect, useState } from 'react';
import { Search, Eye, X, Download } from 'lucide-react';
import { api } from '../api.ts';
import { Pagination } from '../components/Pagination.tsx';
import { exportToCSV } from '../utils/csv.ts';

export const Transactions: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadSales = async () => {
    const data = await api.getSales(search || undefined);
    setSales(data);
  };

  useEffect(() => {
    loadSales();
  }, [search]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const viewDetails = async (sale: any) => {
    const details = await api.getSaleDetails(sale.id);
    setSaleDetails(details);
    setSelectedSale(sale);
  };

  // Pagination Logic
  const totalPages = Math.ceil(sales.length / itemsPerPage);
  const paginatedSales = sales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const dataToExport = sales.map(sale => ({
      'Receipt #': sale.receipt_number || sale.id, // Fallback to ID if receipt_number missing in summary
      Date: new Date(sale.timestamp).toLocaleString(),
      Method: sale.payment_method,
      Total: sale.total.toFixed(2)
    }));

    exportToCSV(dataToExport, `transactions_export_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Transactions</h1>
        <div className="flex gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search receipt number..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={handleExport}
            className="bg-white border text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col border">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Receipt #</th>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Method</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
                <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">#{sale.id.toString().padStart(6, '0')}</td>
                  <td className="p-4 text-gray-500">{new Date(sale.timestamp).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="capitalize bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-blue-600">GH₵{sale.total.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => viewDetails(sale)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={sales.length}
        />
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Sale Details #{selectedSale.id.toString().padStart(6, '0')}</h2>
              <button onClick={() => setSelectedSale(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Date: {new Date(selectedSale.timestamp).toLocaleString()}</span>
                <span>Method: <span className="capitalize">{selectedSale.payment_method}</span></span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">Item</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {saleDetails.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.size} / {item.color}</div>
                        </td>
                        <td className="p-3 text-center">{item.qty}</td>
                        <td className="p-3 text-right">GH₵{item.price_at_sale.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">GH₵{(item.price_at_sale * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-blue-600">GH₵{selectedSale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
