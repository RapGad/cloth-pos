import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Edit2 } from 'lucide-react';
import { api } from '../api.ts';
import type { ProductWithVariants } from '../shared/types.ts';
import { AddProductModal } from '../components/AddProductModal.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { permissions } from '../utils/permissions.ts';

export const Inventory: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [search, setSearch] = useState('');

  const canManage = permissions.canManageInventory(currentUser?.role);

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await api.deleteProduct(id);
      loadProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Product
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products or categories..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Category</th>
                {canManage && <th className="p-4 font-semibold text-gray-600 text-right">Cost</th>}
                <th className="p-4 font-semibold text-gray-600 text-right">Selling</th>
                {canManage && <th className="p-4 font-semibold text-gray-600 text-right text-green-600">Profit</th>}
                <th className="p-4 font-semibold text-gray-600">Variants</th>
                <th className="p-4 font-semibold text-gray-600">Total Stock</th>
                {canManage && <th className="p-4 font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map(product => {
                const totalStock = product.variants.reduce((acc, v) => acc + v.stock_qty, 0);
                const unitProfit = product.selling_price - product.cost_price;
                const totalProfit = unitProfit * totalStock;
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4 text-gray-500">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        {product.category || 'General'}
                      </span>
                    </td>
                    {canManage && <td className="p-4 text-right text-gray-500">GH₵{product.cost_price.toFixed(2)}</td>}
                    <td className="p-4 text-right font-bold text-blue-600">GH₵{product.selling_price.toFixed(2)}</td>
                    {canManage && <td className="p-4 text-right font-bold text-green-600">GH₵{totalProfit.toFixed(2)}</td>}
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {product.variants.map(v => (
                          <span key={v.id} className="text-xs bg-gray-100 px-2 py-1 rounded border">
                            {v.size}/{v.color} ({v.stock_qty})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-medium">
                      {totalStock}
                    </td>
                    {canManage && (
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 5} className="p-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && canManage && (
        <AddProductModal 
          initialProduct={selectedProduct || undefined}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
            loadProducts();
          }} 
        />
      )}
    </div>
  );
};
