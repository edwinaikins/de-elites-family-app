import { MemberAccount, MemberProfileUpdate, WelfareDuesPayment, EventPayment, PaymentInitResponse, DuesBalance, AdminPaymentRecord, ManualPaymentInput } from '../types';

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

// `channel` (e.g. "card" / "mobile_money") is only ever honored by the
// server for mock payments — for real payments the channel always comes
// from Paystack's own verify response, so passing it here for a real
// payment is simply ignored server-side.
export async function verifyPayment(token: string, reference: string, channel?: string): Promise<{ type: 'dues' | 'event' }> {
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

export async function createMemberAccount(payload: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  duesAmount?: number;
  currency?: string;
  chapter?: string;
  role?: string;
}): Promise<MemberAccount> {
  const res = await fetch('/api/admin/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function updateMemberAccount(
  id: string,
  update: Partial<{ fullName: string; username: string; chapter: string; role: string; duesAmount: number; currency: string; status: string; resetPassword: string }>
): Promise<MemberAccount> {
  const res = await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return handleJson(res);
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

export async function deleteAdminPayment(type: 'dues' | 'event', id: string): Promise<void> {
  const res = await fetch(`/api/admin/payments/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await handleJson(res);
}
