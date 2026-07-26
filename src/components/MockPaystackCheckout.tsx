import React, { useEffect, useState } from 'react';
import { CreditCard, Lock, X, Loader2, CheckCircle2 } from 'lucide-react';
import { registerMockCheckoutListener, MockCheckoutHandle } from '../lib/mockPaystackStore';

// Simulated Paystack Inline checkout, shown instead of the real popup
// whenever the backend has no live Paystack keys configured (see
// isMockPaymentsEnabled() in server.ts). Mounted once in App.tsx; every
// payWithPaystack() call site elsewhere in the app is unaware this exists —
// it just awaits a promise that resolves/rejects the same way the real
// Paystack popup would.
type Stage = 'form' | 'processing' | 'success';

export default function MockPaystackCheckout() {
  const [request, setRequest] = useState<MockCheckoutHandle | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [cardNumber, setCardNumber] = useState('4084 0840 8408 4081');
  const [expiry, setExpiry] = useState('12/29');
  const [cvv, setCvv] = useState('408');

  useEffect(() => {
    return registerMockCheckoutListener((req) => {
      setRequest(req);
      setStage('form');
      setCardNumber('4084 0840 8408 4081');
      setExpiry('12/29');
      setCvv('408');
    });
  }, []);

  if (!request) return null;

  const handleCancel = () => {
    request.reject(new Error('Payment window closed before completing.'));
    setRequest(null);
  };

  const handleDecline = () => {
    request.reject(new Error('Your card was declined (simulated failure).'));
    setRequest(null);
  };

  const handlePay = () => {
    setStage('processing');
    setTimeout(() => {
      setStage('success');
      setTimeout(() => {
        request.resolve({ reference: request.reference });
        setRequest(null);
      }, 900);
    }, 1300);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0b0b0b] border border-luxury-gold/30 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header mimicking Paystack's real popup chrome */}
        <div className="bg-[#011B33] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center shrink-0">
              <span className="text-[#011B33] font-black text-xs">P</span>
            </div>
            <span className="text-white font-sans font-bold text-sm">Paystack</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[9px] font-black uppercase tracking-wider">
              Test Mode
            </span>
          </div>
          {stage === 'form' && (
            <button onClick={handleCancel} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6">
          {stage === 'form' && (
            <>
              <div className="text-center mb-6">
                <span className="font-mono text-2xl font-black text-white">
                  {request.currency} {request.amount.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-500 mt-1">{request.email}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Card Number</label>
                  <div className="mt-1 flex items-center gap-2 bg-[#161616] border border-gray-800 rounded px-3 py-2.5">
                    <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="bg-transparent text-white text-sm flex-1 focus:outline-none font-mono min-w-0"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Expiry</label>
                    <input
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="mt-1 w-full bg-[#161616] border border-gray-800 rounded px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">CVV</label>
                    <input
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="mt-1 w-full bg-[#161616] border border-gray-800 rounded px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                className="w-full mt-6 py-3 rounded bg-[#00C3F9] hover:bg-[#00b0e0] text-[#011B33] font-sans font-black tracking-widest text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Pay {request.currency} {request.amount.toFixed(2)}
              </button>

              <button
                onClick={handleDecline}
                className="w-full mt-2 py-2 text-[10px] text-gray-600 hover:text-red-400 uppercase font-bold tracking-widest transition-colors cursor-pointer"
              >
                Simulate Declined Card
              </button>

              <p className="mt-4 text-center text-[9px] text-gray-600 leading-relaxed">
                Simulated checkout — no real Paystack account is configured. No money moves and any card details entered are ignored.
              </p>
            </>
          )}

          {stage === 'processing' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-luxury-gold animate-spin" />
              <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">Processing Payment...</span>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <span className="text-white text-sm font-bold">Payment Successful</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
