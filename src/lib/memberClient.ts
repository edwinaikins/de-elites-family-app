import { MemberAccount, MemberProfileUpdate, WelfareDuesPayment, EventPayment, MemberBill, EventRsvp, EventRsvpResponse, AdminEventRsvp, PaymentInitResponse, DuesBalance, AdminPaymentRecord, ManualPaymentInput } from '../types';

async function handleJson<T>(res: Response): Promise<T> {
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `Request failed: ${res.statusText}`);
  }
  return result.data as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function memberLogin(username: string, password: string): Promise<{ token: string; member: MemberAccount }> {
  const res = await fetch('/api/member/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleJson(res);
}

export async function fetchMyProfile(token: string): Promise<MemberAccount> {
  const res = await fetch('/api/member/me', { headers: authHeaders(token) });
  return handleJson(res);
}

export async function updateMyProfile(token: string, update: MemberProfileUpdate): Promise<MemberAccount> {
  const res = await fetch('/api/member/me', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(update),
  });
  return handleJson(res);
}

export async function changeMyPassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/member/change-password', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await handleJson(res);
}

export async function fetchMyDuesHistory(token: string): Promise<WelfareDuesPayment[]> {
  const res = await fetch('/api/member/dues-history', { headers: authHeaders(token) });
  return handleJson(res);
}

export async function fetchMyEventPayments(token: string): Promise<EventPayment[]> {
  const res = await fetch('/api/member/event-payments', { headers: authHeaders(token) });
  return handleJson(res);
}

// `amount` is optional — omit it (or leave undefined) to pay off the full
// remaining balance for the period; pass a smaller number to make a
// partial/installment payment. The server re-validates it against what's
// actually still owed either way.
export async function initializeDuesPayment(token: string, period: string, amount?: number): Promise<PaymentInitResponse> {
  const res = await fetch('/api/payments/dues/initialize', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ period, amount }),
  });
  return handleJson(res);
}

export async function fetchMyDuesBalance(token: string, period: string): Promise<DuesBalance> {
  const res = await fetch(`/api/member/dues-balance/${encodeURIComponent(period)}`, { headers: authHeaders(token) });
  return handleJson(res);
}

export async function initializeEventPayment(token: string, eventId: string): Promise<PaymentInitResponse> {
  const res = await fetch('/api/payments/event/initialize', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ eventId }),
  });
  return handleJson(res);
}

// --- Executive Dues ---
// A second, separate recurring dues stream billed on top of regular welfare
// dues — only members with executiveDuesAmount > 0 owe anything. Same
// balance/history/pay shape as regular dues above, just its own endpoints.

export async function fetchMyExecutiveDuesHistory(token: string): Promise<WelfareDuesPayment[]> {
  const res = await fetch('/api/member/executive-dues-history', { headers: authHeaders(token) });
  return handleJson(res);
}

export async function fetchMyExecutiveDuesBalance(token: string, period: string): Promise<DuesBalance> {
  const res = await fetch(`/api/member/executive-dues-balance/${encodeURIComponent(period)}`, { headers: authHeaders(token) });
  return handleJson(res);
}

export async function initializeExecutiveDuesPayment(token: string, period: string, amount?: number): Promise<PaymentInitResponse> {
  const res = await fetch('/api/payments/executive-dues/initialize', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ period, amount }),
  });
  return handleJson(res);
}

// --- One-off bills ---
// A single non-recurring charge an admin created for this member (see
// createBill below) — separate from any recurring dues cycle.

export async function fetchMyBills(token: string): Promise<MemberBill[]> {
  const res = await fetch('/api/member/bills', { headers: authHeaders(token) });
  return handleJson(res);
}

export async function initializeBillPayment(token: string, billId: string): Promise<PaymentInitResponse> {
  const res = await fetch('/api/payments/bill/initialize', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ billId }),
  });
  return handleJson(res);
}

// --- Event RSVPs (free events only) ---

export async function fetchMyRsvps(token: string): Promise<EventRsvp[]> {
  const res = await fetch('/api/member/rsvps', { headers: authHeaders(token) });
  return handleJson(res);
}

export async function submitRsvp(token: string, eventId: string, response: EventRsvpResponse): Promise<EventRsvp> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ response }),
  });
  return handleJson(res);
}

export async function fetchEventRsvpsAdmin(eventId: string): Promise<AdminEventRsvp[]> {
  const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/rsvps`);
  return handleJson(res);
}

// `channel` (e.g. "card" / "mobile_money") is only ever honored by the
// server for mock payments — for real payments the channel always comes
// from Paystack's own verify response, so passing it here for a real
// payment is simply ignored server-side.
export async function verifyPayment(
  token: string,
  reference: string,
  channel?: string
): Promise<{ type: 'dues' | 'event' | 'executive-dues' | 'bill' }> {
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reference, channel }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Payment verification failed.');
  }
  return { type: result.type };
}

// --- Admin: member account management ---

export async function fetchAllMemberAccounts(): Promise<MemberAccount[]> {
  const res = await fetch('/api/admin/members');
  return handleJson(res);
}

// The server also attempts to email the new member their username +
// temporary password + login instructions — emailSent/mailMock report
// whether that actually went out (mailMock === true means it was only
// logged server-side, e.g. no SMTP configured yet) so the caller can tell
// the admin whether they need to share the credentials some other way.
export async function createMemberAccount(payload: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  duesAmount?: number;
  executiveDuesAmount?: number;
  currency?: string;
  chapter?: string;
  role?: string;
}): Promise<{ member: MemberAccount; emailSent: boolean; mailMock: boolean }> {
  const res = await fetch('/api/admin/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Failed to create member account');
  }
  return { member: result.data as MemberAccount, emailSent: !!result.emailSent, mailMock: !!result.mailMock };
}

// emailSent is only meaningful when `update.resetPassword` was set — that's
// the only case where the server attempts to send an email (a new temporary
// password the member needs to know about). It's `undefined` otherwise.
export async function updateMemberAccount(
  id: string,
  update: Partial<{
    fullName: string;
    username: string;
    chapter: string;
    role: string;
    phone: string;
    duesAmount: number;
    executiveDuesAmount: number;
    currency: string;
    status: string;
    resetPassword: string;
  }>
): Promise<{ member: MemberAccount; emailSent?: boolean; mailMock: boolean }> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Failed to update member account');
  }
  return { member: result.data as MemberAccount, emailSent: result.emailSent, mailMock: !!result.mailMock };
}

export async function deleteMemberAccount(id: string): Promise<void> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await handleJson(res);
}

export async function fetchMemberDuesHistoryAdmin(id: string): Promise<WelfareDuesPayment[]> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}/dues`);
  return handleJson(res);
}

export async function fetchMemberEventPaymentsAdmin(id: string): Promise<EventPayment[]> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}/event-payments`);
  return handleJson(res);
}

export async function fetchMemberExecutiveDuesHistoryAdmin(id: string): Promise<WelfareDuesPayment[]> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}/executive-dues`);
  return handleJson(res);
}

export async function fetchMemberBillsAdmin(id: string): Promise<MemberBill[]> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}/bills`);
  return handleJson(res);
}

// --- Admin: reconciliation ---

export async function fetchAllPaymentsAdmin(): Promise<AdminPaymentRecord[]> {
  const res = await fetch('/api/admin/payments');
  return handleJson(res);
}

export async function createManualPayment(input: ManualPaymentInput): Promise<AdminPaymentRecord> {
  const res = await fetch('/api/admin/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleJson(res);
}

export async function deleteAdminPayment(type: 'dues' | 'event' | 'executive-dues' | 'bill', id: string): Promise<void> {
  const res = await fetch(`/api/admin/payments/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await handleJson(res);
}

// --- Admin: one-off bills ---
// Separate from the manual-payment-log mechanism above (which only ever
// records something that's already been paid) — a bill starts out UNPAID,
// admin-created, and the member pays it themselves from their portal (or an
// admin marks it paid manually later via updateBill's markPaidChannel).

export async function createBill(input: {
  memberIds: string[];
  label: string;
  amount: number;
  currency?: string;
}): Promise<MemberBill[]> {
  const res = await fetch('/api/admin/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleJson(res);
}

export async function updateBill(
  id: string,
  update: Partial<{ label: string; amount: number; markPaidChannel: string }>
): Promise<MemberBill> {
  const res = await fetch(`/api/admin/bills/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return handleJson(res);
}

export async function deleteBill(id: string): Promise<void> {
  const res = await fetch(`/api/admin/bills/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await handleJson(res);
}
