// A tiny pub/sub bridge between payWithPaystack() (a plain function, called
// from anywhere — hooks, event handlers) and <MockPaystackCheckout />, the
// single modal instance mounted once in App.tsx that actually renders the
// simulated checkout UI. This lets every existing call site that already
// awaits payWithPaystack(...) keep working unchanged whether it lands on
// the real Paystack popup or the mock one — the routing happens inside
// payWithPaystack based on `publicKey === 'mock'`.

export interface MockCheckoutRequest {
  amount: number; // major currency units, e.g. cedis
  currency: string;
  email: string;
  reference: string;
}

export interface MockCheckoutHandle extends MockCheckoutRequest {
  resolve: (response: { reference: string; channel: 'card' | 'mobile_money' }) => void;
  reject: (error: Error) => void;
}

type Listener = (request: MockCheckoutHandle) => void;

let activeListener: Listener | null = null;

// Called once by <MockPaystackCheckout /> on mount. Returns an unsubscribe
// function for cleanup.
export function registerMockCheckoutListener(fn: Listener): () => void {
  activeListener = fn;
  return () => {
    if (activeListener === fn) activeListener = null;
  };
}

export function openMockCheckout(request: MockCheckoutRequest): Promise<{ reference: string; channel: 'card' | 'mobile_money' }> {
  return new Promise((resolve, reject) => {
    if (!activeListener) {
      reject(new Error('Mock payment UI is not mounted. Please reload the page and try again.'));
      return;
    }
    activeListener({ ...request, resolve, reject });
  });
}
