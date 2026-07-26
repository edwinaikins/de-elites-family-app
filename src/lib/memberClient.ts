import { MemberAccount, MemberProfileUpdate, WelfareDuesPayment, EventPayment, PaymentInitResponse } from '../types';

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

export async function memberLogin(email: string, password: string): Promise<{ token: string; member: MemberAccount }> {
  const res = await fetch('/api/member/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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

export async function initializeDuesPayment(token: string, period: string): Promise<PaymentInitResponse> {
  const res = await fetch('/api/payments/dues/initialize', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ period }),
  });
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

export async function verifyPayment(token: string, reference: string): Promise<{ type: 'dues' | 'event' }> {
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reference }),
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
  update: Partial<{ fullName: string; chapter: string; role: string; duesAmount: number; currency: string; status: string; resetPassword: string }>
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
