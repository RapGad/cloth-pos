import React, { useState } from 'react';
import { X, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import { api } from '../api.ts';
import type { CartItem } from '../shared/types.ts';

interface CheckoutModalProps {
  total: number;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ total, cart, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const hasPrinter = await api.checkPrinterStatus();
      if (!hasPrinter) {
        const proceed = window.confirm("No printer found. Do you want to continue without printing?");
        if (!proceed) {
          setIsProcessing(false);
          return;
        }
      }

      const salePayload = {
        total,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId,
          qty: item.qty,
          cost_at_sale: item.cost_price,
          price_at_sale: item.selling_price,
          discount: item.discount
        }))
      };
      console.log('Sending sale payload:', salePayload);
      const result = await api.processSale(salePayload);
      
      try {
        await api.printReceipt({
          receiptNumber: result.receipt_number,
          timestamp: new Date().toISOString(),
          customerName: 'Walk-in Customer', // TODO: Add customer selection
          paymentMethod: paymentMethod,
          total: total,
          items: cart.map(item => ({
            name: item.name,
            size: item.size,
            color: item.color,
            qty: item.qty,
            price: item.selling_price
          }))
        });
      } catch (printError) {
        console.error('Printing failed:', printError);
        // Continue to success screen even if printing fails
      }
      
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Payment failed');
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 text-center">
          <div className="flex justify-center mb-4 text-green-500">
            <CheckCircle size={64} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-500">Printing receipt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-gray-500 mb-1">Total Amount</p>
            <p className="text-5xl font-bold text-gray-900">GH₵{total.toFixed(2)}</p>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Banknote size={32} />
              <span className="font-medium">Cash</span>
            </button>
            <button 
              onClick={() => setPaymentMethod('mobile')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'mobile' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Smartphone size={32} />
              <span className="font-medium">Mobile</span>
            </button>
          </div>

          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Processing...' : `Pay GH₵${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
