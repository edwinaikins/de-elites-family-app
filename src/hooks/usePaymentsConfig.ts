import { useEffect, useState } from 'react';

// Module-level cache so every component that wants to know "are we in mock
// payment mode?" (to show a small Test Mode badge) shares one fetch instead
// of each hammering the endpoint on mount.
let cachedMock: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

async function fetchMockFlag(): Promise<boolean> {
  if (cachedMock !== null) return cachedMock;
  if (!inFlight) {
    inFlight = fetch('/api/payments/config')
      .then((res) => res.json())
      .then((json) => {
        cachedMock = !!json?.data?.mock;
        return cachedMock as boolean;
      })
      .catch(() => false)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function usePaymentsConfig() {
  const [mock, setMock] = useState<boolean>(cachedMock ?? false);

  useEffect(() => {
    let cancelled = false;
    fetchMockFlag().then((value) => {
      if (!cancelled) setMock(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { mock };
}
