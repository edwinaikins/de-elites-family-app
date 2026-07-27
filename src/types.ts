export interface Pillar {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  quote: string;
}

export interface Leader {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  bio: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Legacy' | 'Community' | 'Philanthropy' | 'Movement' | 'Events';
  image: string;
  description: string;
  date: string;
  isVideo?: boolean;
}

export interface Shoutout {
  id: string;
  name: string;
  role: string;
  message: string;
  timestamp: string;
  theme: 'gold-glow' | 'minimalist' | 'regal-banner' | 'charcoal-border';
  likes: number;
  approved?: boolean;
}

export interface Member {
  id: string;
  name: string;
  chapter: string;
  role: string;
  image: string;
  bio: string;
  joinedDate: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    github?: string;
  };
  featured?: boolean;
}

export interface EliteEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  category: 'Meeting' | 'Summit' | 'Concert' | 'Community' | 'Launch';
  buttonText?: string;
  buttonLink?: string;
  // When set (> 0), the event requires payment to register and a "Pay &
  // Register" flow (Paystack) is shown instead of a plain link button.
  // Left unset or 0 for free events.
  price?: number;
  currency?: string;
}

export interface HeroConfig {
  id: string;
  title: string;
  slogan: string;
  description: string;
  joinButtonText: string;
  exploreButtonText: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  logo?: string;
}

export interface CmsUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'moderator';
}

// --- Member Portal (accounts, auth, payments) ---
//
// MemberAccount is a distinct concept from both `Member` (the old public
// Member Directory profile, currently unused in the UI) and `CmsUser` (the
// admin/moderator CMS login). It's the login + profile a real family member
// uses to sign into their own portal, edit their bio, and track/pay dues.
// Kept on its own backend table (never part of the public cms_sections
// payload) since it carries an email + password hash.

export interface MemberAccount {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  image?: string;
  chapter?: string;
  role?: string;
  phone?: string;
  // Configurable per member (per admin decision) — the recurring welfare
  // dues amount this member is expected to pay each period, in the
  // platform's configured currency (see DUES_CURRENCY env var).
  duesAmount: number;
  currency: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

// The subset of MemberAccount fields a member can edit about themselves via
// the portal (bio + a few soft profile fields). Dues amount, email, and
// status are admin-controlled only.
export interface MemberProfileUpdate {
  bio?: string;
  image?: string;
  phone?: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface WelfareDuesPayment {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  // The dues period this payment covers, e.g. "2026-08" for August 2026.
  // A period can have more than one successful payment row against it —
  // members are allowed to pay it off in installments (see DuesBalance).
  period: string;
  reference: string;
  status: PaymentStatus;
  // How the payment cleared — "card", "mobile_money", etc. Set once the
  // payment succeeds (real payments: from Paystack's verify response; mock
  // payments: whichever tab was used in the simulated checkout).
  channel?: string;
  paidAt?: string;
  createdAt: string;
}

export interface EventPayment {
  id: string;
  memberId: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  currency: string;
  reference: string;
  status: PaymentStatus;
  channel?: string;
  paidAt?: string;
  createdAt: string;
}

// GET /api/member/dues-balance/:period — how much of the configured monthly
// dues amount a member has already paid off for one period, so the portal
// can show "GHS 20 of GHS 50 paid" and cap what they can still pay.
export interface DuesBalance {
  period: string;
  duesAmount: number;
  paid: number;
  remaining: number;
  currency: string;
}

// GET /api/admin/payments — one flattened, reconcilable row per dues or
// event payment across every member, used by the CMS's Payments tab.
export interface AdminPaymentRecord {
  id: string;
  type: 'dues' | 'event';
  memberId: string;
  memberName: string;
  memberEmail: string;
  // Dues period (e.g. "2026-08") for type 'dues', event title for type 'event'.
  label: string;
  amount: number;
  currency: string;
  channel?: string;
  reference: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

// POST /api/admin/payments — an admin manually logging a payment collected
// outside Paystack (cash, bank transfer, cheque, etc.) so reconciliation
// stays complete for offline collections.
export interface ManualPaymentInput {
  type: 'dues' | 'event';
  memberId: string;
  amount: number;
  currency?: string;
  // Free text, e.g. "cash", "bank transfer", "cheque" — defaults to "cash".
  channel?: string;
  status?: PaymentStatus;
  // Required when type === 'dues', e.g. "2026-08".
  period?: string;
  // For type === 'event': pass eventId to pull the title from an existing
  // CMS event, or eventTitle directly for a one-off/past event that may no
  // longer be listed.
  eventId?: string;
  eventTitle?: string;
}

// Returned by POST /api/payments/*/initialize — everything the frontend
// needs to open the Paystack Inline checkout. The amount/reference are
// generated server-side so the client can never manipulate what gets
// charged.
export interface PaymentInitResponse {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  publicKey: string;
  // True when the server has no real Paystack keys configured (or
  // PAYSTACK_MOCK=true) and this payment will be simulated end-to-end
  // instead of hitting the real Paystack API.
  mock?: boolean;
}

export interface MemberApplication {
  id: string;
  fullName: string;
  nickname?: string;
  dob: string;
  gender: string;
  occupation: string;
  residence: string;
  phone: string;
  email: string;
  socialHandles?: string;
  referrer?: string;
  priorGroupMember: boolean;
  priorGroupDetail?: string;
  reasonForJoining: string;
  contributionAreas: string[];
  activityLevel: 'Very Active' | 'Moderately Active' | 'Occasionally Active';
  willingToSupportFinancially: boolean;
  agreesToRulesAndDiscipline: boolean;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}



