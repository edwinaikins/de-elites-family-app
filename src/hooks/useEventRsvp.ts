import { useState, useEffect, useCallback } from 'react';
import { useMemberAuth } from '../context/MemberAuthContext';
import { fetchMyRsvps, submitRsvp } from '../lib/memberClient';
import { EventRsvpResponse } from '../types';

// Shared "RSVP Yes/No/Maybe for a free event" logic — used by the public
// Events section and the Member Portal's own Events tab, mirroring
// useEventPayments so both flows (paid vs free) feel consistent.
export function useEventRsvp() {
  const { member, token, openPortal } = useMemberAuth();

  const [rsvpByEventId, setRsvpByEventId] = useState<Record<string, EventRsvpResponse>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const refreshRsvps = useCallback(() => {
    if (!token) {
      setRsvpByEventId({});
      return;
    }
    fetchMyRsvps(token)
      .then((rsvps) => {
        const map: Record<string, EventRsvpResponse> = {};
        rsvps.forEach((r) => { map[r.eventId] = r.response; });
        setRsvpByEventId(map);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshRsvps();
  }, [refreshRsvps]);

  // If the member isn't logged in, this opens the portal login instead of
  // submitting anything — same pattern as payForEvent — so the caller
  // should re-prompt for their choice after they log back in.
  const rsvpForEvent = useCallback(
    async (eventId: string, response: EventRsvpResponse) => {
      if (!member || !token) {
        openPortal();
        return;
      }
      setErrorById((prev) => ({ ...prev, [eventId]: '' }));
      setSubmittingId(eventId);
      try {
        const saved = await submitRsvp(token, eventId, response);
        setRsvpByEventId((prev) => ({ ...prev, [eventId]: saved.response }));
      } catch (err: any) {
        setErrorById((prev) => ({ ...prev, [eventId]: err.message || 'Could not save your RSVP.' }));
      } finally {
        setSubmittingId(null);
      }
    },
    [member, token, openPortal]
  );

  return { rsvpByEventId, submittingId, errorById, rsvpForEvent, refreshRsvps };
}
