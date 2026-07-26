// Thin wrapper around Paystack's Inline JS checkout (loaded via a <script>
// tag in index.html, so `window.PaystackPop` is expected to already be
// present by the time this runs). Amount/reference/currency all come from
// our own backend (see /api/payments/*/initialize) — never computed here —
// so the client can't influence what actually gets charged.

interface PaystackPopSetupOptions {
  key: string;
  email: string;
  amount: number; // smallest currency unit (e.g. pesewas, kobo)
  currency?: string;
  ref: string;
  metadata?: Record<string, any>;
  onSuccess?: (response: { reference: string }) => void;
  onCancel?: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        metadata?: Record<string, any>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export interface PayWithPaystackParams {
  publicKey: string;
  email: string;
  amount: number; // in major currency units (e.g. cedis, naira) — converted to subunits here
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
}

export function isPaystackReady(): boolean {
  return typeof window !== 'undefined' && !!window.PaystackPop;
}

export function payWithPaystack(params: PayWithPaystackParams): Promise<{ reference: string }> {
  return new Promise((resolve, reject) => {
    if (!isPaystackReady()) {
      reject(new Error('Payment provider failed to load. Please check your connection and try again.'));
      return;
    }

    const handler = window.PaystackPop!.setup({
      key: params.publicKey,
      email: params.email,
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      ref: params.reference,
      metadata: params.metadata,
      callback: (response) => {
        resolve({ reference: response.reference });
      },
      onClose: () => {
        reject(new Error('Payment window closed before completing.'));
      },
    });

    handler.openIframe();
  });
}
