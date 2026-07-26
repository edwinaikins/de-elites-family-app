import { useState, useEffect, useCallback } from 'react';
import { useMemberAuth } from '../context/MemberAuthContext';
import { fetchMyEventPayments, initializeEventPayment, verifyPayment } from '../lib/memberClient';
import { payWithPaystack } from '../lib/paystack';

// Shared "pay & register for an upcoming event" logic — used by the public
// Events section and the Member Portal's own Events tab so both surfaces
// stay in lockstep instead of maintaining two copies of the Paystack flow.
export function useEventPayments() {
  const { member, token, openPortal } = useMemberAuth();

  const [paidEventIds, setPaidEventIds] = useState<Set<string>>(new Set());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const refreshPaidEvents = useCallback(() => {
    if (!token) {
      setPaidEventIds(new Set());
      return;
    }
    fetchMyEventPayments(token)
      .then((payments) => {
        setPaidEventIds(new Set(payments.filter((p) => p.status === 'success').map((p) => p.eventId)));
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshPaidEvents();
  }, [refreshPaidEvents]);

  const payForEvent = useCallback(
    async (eventId: string) => {
      if (!member || !token) {
        openPortal();
        return;
      }
      setErrorById((prev) => ({ ...prev, [eventId]: '' }));
      setPayingId(eventId);
      try {
        const init = await initializeEventPayment(token, eventId);
        const { reference } = await payWithPaystack({
          publicKey: init.publicKey,
          email: init.email,
          amount: init.amount,
          currency: init.currency,
          reference: init.reference,
          metadata: { type: 'event', eventId },
        });
        await verifyPayment(token, reference);
        setPaidEventIds((prev) => new Set(prev).add(eventId));
      } catch (err: any) {
        setErrorById((prev) => ({ ...prev, [eventId]: err.message || 'Payment could not be completed.' }));
      } finally {
        setPayingId(null);
      }
    },
    [member, token, openPortal]
  );

  return { paidEventIds, payingId, errorById, payForEvent, refreshPaidEvents };
}
