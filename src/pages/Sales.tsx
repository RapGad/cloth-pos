import React, { useEffect, useState, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, Package } from 'lucide-react';
import { api } from '../api.ts';
import type { ProductWithVariants, CartItem } from '../shared/types.ts';
import { VariantSelectorModal } from '../components/VariantSelectorModal.tsx';
import { CheckoutModal } from '../components/CheckoutModal.tsx';

export const Sales: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const addToCart = (variantId: number, size: string, color: string, _price: number) => {
    if (!selectedProduct) return;

    setCart(prev => {
      const existing = prev.find(item => item.variantId === variantId);
      if (existing) {
        return prev.map(item => 
          item.variantId === variantId 
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, {
        variantId,
        productId: selectedProduct.id,
        name: selectedProduct.name,
        size,
        color,
        cost_price: selectedProduct.cost_price,
        selling_price: selectedProduct.selling_price,
        qty: 1,
        discount: 0
      }];
    });
    setSelectedProduct(null);
  };

  const updateQty = (variantId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variantId === variantId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (variantId: number) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.selling_price * item.qty), 0);

  const handleCheckoutSuccess = () => {
    setCart([]);
    setIsCheckoutOpen(false);
    loadProducts(); // Refresh stock
  };

  return (
    <div className="flex h-full">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col p-6 bg-gray-100 border-r">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products or categories..." 
              className="w-full pl-10 pr-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col border">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Product Name</th>
                  <th className="p-4 font-semibold text-gray-600">Category</th>
                  <th className="p-4 font-semibold text-gray-600">Price</th>
                  <th className="p-4 font-semibold text-gray-600">Stock</th>
                  <th className="p-4 font-semibold text-gray-600 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map(product => {
                  const totalStock = product.variants.reduce((a, v) => a + v.stock_qty, 0);
                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{product.name}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-blue-600">
                        GH₵{product.selling_price.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${totalStock < 5 ? 'text-orange-500' : 'text-gray-500'}`}>
                          {totalStock} units
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          className="bg-blue-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="inline-block">
                        <Package className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">No Products Found</h3>
                        <p className="text-gray-500">Try adjusting your search or add products in Inventory.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 bg-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart /> Current Sale
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              Cart is empty
            </div>
          ) : (
            cart.map(item => (
              <div key={item.variantId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.size} / {item.color}</p>
                  <p className="text-sm font-bold text-blue-600">GH₵{(item.selling_price * item.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white rounded border">
                    <button onClick={() => updateQty(item.variantId, -1)} className="p-1 hover:bg-gray-100"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                    <button onClick={() => updateQty(item.variantId, 1)} className="p-1 hover:bg-gray-100"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.variantId)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between mb-2 text-gray-600">
            <span>Subtotal</span>
            <span>GH₵{cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-4 text-xl font-bold text-gray-800">
            <span>Total</span>
            <span>GH₵{cartTotal.toFixed(2)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-200"
          >
            Checkout
          </button>
        </div>
      </div>

      {selectedProduct && (
        <VariantSelectorModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onSelect={addToCart}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          total={cartTotal}
          cart={cart}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
};
