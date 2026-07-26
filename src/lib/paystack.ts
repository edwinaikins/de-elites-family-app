// Thin wrapper around Paystack's Inline JS checkout (loaded via a <script>
// tag in index.html, so `window.PaystackPop` is expected to already be
// present by the time this runs). Amount/reference/currency all come from
// our own backend (see /api/payments/*/initialize) — never computed here —
// so the client can't influence what actually gets charged.
//
// When the backend has no real Paystack keys configured, it initializes
// payments in mock mode instead (see server.ts's isMockPaymentsEnabled())
// and returns publicKey: 'mock' / mock: true. payWithPaystack() below
// detects that and opens the simulated checkout (MockPaystackCheckout.tsx)
// instead of the real Paystack popup — every call site stays unchanged.

import { openMockCheckout } from './mockPaystackStore';

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
  mock?: boolean;
}

export function isPaystackReady(): boolean {
  return typeof window !== 'undefined' && !!window.PaystackPop;
}

export function payWithPaystack(params: PayWithPaystackParams): Promise<{ reference: string }> {
  if (params.mock || params.publicKey === 'mock') {
    return openMockCheckout({
      amount: params.amount,
      currency: params.currency,
      email: params.email,
      reference: params.reference,
    });
  }

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
