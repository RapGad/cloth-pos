import React from 'react';
import { X } from 'lucide-react';
import type { ProductWithVariants } from '../shared/types.ts';

interface VariantSelectorModalProps {
  product: ProductWithVariants;
  onClose: () => void;
  onSelect: (variantId: number, size: string, color: string, selling_price: number) => void;
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({ product, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-500 mb-4">Select a variant to add to cart:</p>

        <div className="space-y-2 max-h-96 overflow-auto">
          {product.variants.map(variant => (
            <button
              key={variant.id}
              disabled={variant.stock_qty <= 0}
              onClick={() => onSelect(variant.id, variant.size, variant.color, product.selling_price)}
              className="w-full flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
            >
              <div className="flex gap-3">
                <span className="font-bold w-8">{variant.size}</span>
                <span className="text-gray-600">{variant.color}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Stock: {variant.stock_qty}</span>
                <span className="font-bold text-blue-600">GH₵{product.selling_price.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
