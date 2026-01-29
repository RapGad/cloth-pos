import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import { api } from '../api.ts';
import type { ProductWithVariants } from '../shared/types.ts';

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: ProductWithVariants;
}

interface VariantDraft {
  id?: number;
  size: string;
  color: string;
  stock_qty: number;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSuccess, initialProduct }) => {
  const [name, setName] = useState(initialProduct?.name || '');
  const [costPrice, setCostPrice] = useState(initialProduct ? initialProduct.cost_price.toString() : '');
  const [sellingPrice, setSellingPrice] = useState(initialProduct ? initialProduct.selling_price.toString() : '');
  const [category, setCategory] = useState(initialProduct?.category || 'General');
  
  // Detect if product has real variants (not just default)
  const hasRealVariants = initialProduct 
    ? initialProduct.variants.length > 1 || 
      (initialProduct.variants.length === 1 && 
       !(initialProduct.variants[0].size === 'Standard' && initialProduct.variants[0].color === 'Default'))
    : false;
  
  const [hasVariants, setHasVariants] = useState(hasRealVariants);
  const [stockQty, setStockQty] = useState(
    initialProduct && !hasRealVariants 
      ? initialProduct.variants[0]?.stock_qty || 0 
      : 0
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    initialProduct && hasRealVariants
      ? initialProduct.variants.map(v => ({ id: v.id, size: v.size, color: v.color, stock_qty: v.stock_qty }))
      : [{ size: 'M', color: 'Black', stock_qty: 10 }]
  );

  const categories = ['General', 'Shoes', 'Club-T', 'Jeans', 'Shirts', 'Dresses', 'Accessories'];

  const handleAddVariant = () => {
    setVariants([...variants, { size: '', color: '', stock_qty: 0 }]);
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name,
        cost_price: parseFloat(costPrice),
        selling_price: parseFloat(sellingPrice),
        tax_rate: 0,
        category: category
      };

      // If no variants, create a default variant
      const finalVariants = hasVariants 
        ? variants 
        : [{ size: 'Standard', color: 'Default', stock_qty: stockQty }];

      if (initialProduct) {
        await api.updateProduct({ ...productData, id: initialProduct.id }, finalVariants);
      } else {
        await api.addProduct(productData, finalVariants);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{initialProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input 
                required
                className="w-full border rounded-lg p-2"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                className="w-full border rounded-lg p-2"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (GH₵)</label>
              <input 
                required
                type="number"
                step="0.01"
                className="w-full border rounded-lg p-2"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (GH₵)</label>
              <input 
                required
                type="number"
                step="0.01"
                className="w-full border rounded-lg p-2"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Variants Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <input
              type="checkbox"
              id="hasVariants"
              checked={hasVariants}
              onChange={(e) => setHasVariants(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700 cursor-pointer">
              This product has variants (size/color options)
            </label>
          </div>

          {/* Stock Quantity for Non-Variant Products */}
          {!hasVariants && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input 
                required
                type="number"
                min="0"
                className="w-full border rounded-lg p-2"
                value={stockQty}
                onChange={e => setStockQty(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">Total number of items in stock</p>
            </div>
          )}

          {/* Variants Section */}
          {hasVariants && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Variants (Size / Color)</label>
                <button 
                  type="button"
                  onClick={handleAddVariant}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={16} /> Add Variant
                </button>
              </div>
              
              <div className="space-y-2">
                {variants.map((variant, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border">
                    <input 
                      required
                      placeholder="Size"
                      className="w-24 border rounded p-1 text-sm"
                      value={variant.size}
                      onChange={e => updateVariant(idx, 'size', e.target.value)}
                    />
                    <input 
                      required
                      placeholder="Color"
                      className="flex-1 border rounded p-1 text-sm"
                      value={variant.color}
                      onChange={e => updateVariant(idx, 'color', e.target.value)}
                    />
                    <input 
                      required
                      type="number"
                      min="0"
                      placeholder="Qty"
                      className="w-24 border rounded p-1 text-sm"
                      value={variant.stock_qty}
                      onChange={e => updateVariant(idx, 'stock_qty', parseInt(e.target.value) || 0)}
                    />
                    {variants.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="text-red-500 hover:bg-red-100 p-1 rounded"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {initialProduct ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
};
