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
  // Freeform — not a fixed set. Admins type any label they want in the
  // Legacy Gallery editor (a datalist just suggests categories already in
  // use); the public filter bar picks up whatever categories actually
  // exist across the gallery, so a brand-new category just needs one item
  // tagged with it to show up as its own filter.
  category: string;
  image: string;
  description: string;
  date: string;
  isVideo?: boolean;
  // Additional photos/videos beyond the single cover `image` above, added
  // via the CMS's "EDIT MILESTONE EVENT" panel. The public Legacy Gallery
  // grid still shows just the cover, but the spotlight modal lets visitors
  // browse every file here alongside it (see MediaItem below).
  media?: MediaItem[];
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

// One photo or video belonging to a larger collection — an event's own
// gallery (EliteEvent.media) or a Legacy Gallery milestone's extra media
// (GalleryItem.media) — distinct from that item's single cover `image`.
// Uploaded in bulk via the CMS, and browsable as a lightbox on the public
// site alongside the cover.
export interface MediaItem {
  id: string;
  url: string;
  isVideo?: boolean;
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
  // Legacy custom CTA fields — no longer editable in the CMS and no longer
  // rendered on free events (replaced by the RSVP Yes/No/Maybe flow below).
  // Left optional/unused rather than removed outright so any pre-existing
  // events in the database that still carry these values don't break.
  buttonText?: string;
  buttonLink?: string;
  // When set (> 0), the event requires payment to register and a payment
  // flow (Paystack) is shown instead of a plain link button. Left unset or
  // 0 for free events.
  price?: number;
  currency?: string;
  // Label for the paid-event CTA button, e.g. "Make Payments" (the
  // default) — admin-editable per event. Followed by " — <currency>
  // <price>" either way. Only relevant when price > 0; has no effect on
  // free events (see buttonText/buttonLink for those).
  payButtonText?: string;
  // This event's own photo/video collection (see MediaItem above).
  media?: MediaItem[];
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
  // What the member actually logs in with (see /api/member/login). Chosen
  // by the admin when the account is created; can be edited later from the
  // Member Accounts tab. Email is kept separately — still required for
  // Paystack checkout and admin reconciliation, just no longer the login
  // credential.
  username: string;
  email: string;
  bio: string;
  image?: string;
  chapter?: string;
  role?: string;
  phone?: string;
  // Profession, business, and skills — collected via the Member Portal's
  // profile editor or the WhatsApp self-service bot, to help the family
  // know each other better and spot collaboration opportunities. Admin-only
  // visibility for now (shown read-only in the CMS's Member Accounts tab) —
  // not surfaced in any member-facing directory. All optional/freeform.
  profession?: string;
  businessName?: string;
  businessDescription?: string;
  // Freeform, comma-separated (e.g. "Accounting, Graphic Design, Event
  // Planning") rather than a structured tag list — same "freeform over
  // fixed taxonomy" choice as GalleryItem.category elsewhere in this file.
  skills?: string;
  // Configurable per member (per admin decision) — the recurring welfare
  // dues amount this member is expected to pay each period, in the
  // platform's configured currency (see DUES_CURRENCY env var).
  duesAmount: number;
  // A SECOND, separate recurring monthly charge billed ON TOP OF duesAmount
  // — only members flagged as executives owe this. 0 (the default) means
  // "not an executive, nothing owed"; any positive value both flags them as
  // one and sets the amount. Tracked with its own period/balance/payment
  // history, entirely independent of regular welfare dues.
  executiveDuesAmount: number;
  currency: string;
  status: 'active' | 'suspended';
  // True right after account creation or an admin password reset — the
  // portal shows a mandatory "set a new password" screen on next login
  // until the member replaces the temporary password themselves.
  mustChangePassword: boolean;
  createdAt: string;
}

// The subset of MemberAccount fields a member can edit about themselves via
// the portal (bio + a few soft profile fields). Dues amount, email, and
// status are admin-controlled only.
export interface MemberProfileUpdate {
  bio?: string;
  image?: string;
  phone?: string;
  profession?: string;
  businessName?: string;
  businessDescription?: string;
  skills?: string;
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

// A one-off, non-recurring charge an admin creates for a member (see
// POST /api/admin/bills) — an anniversary levy, a fine, anything that isn't
// a regular monthly dues cycle. `reference` is unset until the member
// actually starts paying it (see /api/payments/bill/initialize).
export interface MemberBill {
  id: string;
  memberId: string;
  label: string;
  amount: number;
  currency: string;
  reference?: string;
  status: PaymentStatus;
  channel?: string;
  paidAt?: string;
  createdAt: string;
}

export type EventRsvpResponse = 'yes' | 'no' | 'maybe';

// A member's attendance response for one free event (paid events use the
// payment flow itself as the registration signal — see EventPayment — and
// never show an RSVP prompt). Upserted per member+event, so re-submitting
// just updates the same row.
export interface EventRsvp {
  id: string;
  memberId: string;
  eventId: string;
  eventTitle: string;
  response: EventRsvpResponse;
  createdAt: string;
  updatedAt: string;
}

// GET /api/admin/events/:eventId/rsvps — one RSVP row plus the member's
// name/email, for the CMS's attendee list.
export interface AdminEventRsvp extends EventRsvp {
  memberName: string;
  memberEmail: string;
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
  type: 'dues' | 'event' | 'executive-dues' | 'bill';
  memberId: string;
  memberName: string;
  memberEmail: string;
  // Dues period (e.g. "2026-08") for type 'dues'/'executive-dues', event
  // title for type 'event', the bill's own label for type 'bill'.
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
  type: 'dues' | 'event' | 'executive-dues';
  memberId: string;
  amount: number;
  currency?: string;
  // Free text, e.g. "cash", "bank transfer", "cheque" — defaults to "cash".
  channel?: string;
  status?: PaymentStatus;
  // Required when type === 'dues' or 'executive-dues', e.g. "2026-08".
  period?: string;
  // For type === 'event': pass eventId to pull the title from an existing
  // CMS event, or eventTitle directly for a one-off/past event that may no
  // longer be listed.
  eventId?: string;
  eventTitle?: string;
}

// PATCH /api/admin/payments/:type/:id — editing a manually-logged payment
// (amount, currency, status, channel, when it was paid, and its
// period/event-title/bill-label, i.e. whichever thing AdminPaymentRecord.
// label represents for that type). Only ever offered in the CMS for a
// payment that was logged manually in the first place — a real Paystack
// payment rejects this server-side (see isManualPaymentReference in
// server.ts) and stays exactly as the gateway recorded it.
export interface AdminPaymentUpdate {
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  channel?: string;
  // An ISO date/time string, or the literal "now" as shorthand for "today".
  paidAt?: string;
  label?: string;
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

// A request to create a Member Portal login, submitted by a member via the
// WhatsApp self-service bot's "JOIN" flow — distinct from MemberApplication
// above (the full public "Join the Movement" form). Just the essentials
// collected conversationally: full name, email, and a username the member
// chose themselves. Reviewed by an admin in the CMS's Signup Requests tab;
// approving one is what actually creates the real MemberAccount and sends
// login details (see POST /api/admin/signup-requests/:id/approve) — this
// record alone never grants portal access.
export interface MemberSignupRequest {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
}

// Money going OUT — the other half of the financial picture alongside dues/
// event/bill payments (money coming in, tracked elsewhere via
// AdminPaymentRecord). Not tied to any member. `category` is freeform text
// (same "freeform over fixed taxonomy" choice as GalleryItem.category
// elsewhere in this file) — the CMS's expenditure-by-category report just
// groups by whatever categories actually exist.
export interface Expenditure {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  // The date the expense happened (YYYY-MM-DD), not when it was logged.
  date: string;
  createdAt: string;
}

// POST/PATCH /api/admin/expenditures — currency is optional and defaults to
// the platform's configured dues currency (see DUES_CURRENCY) if omitted.
export interface ExpenditureInput {
  description?: string;
  category?: string;
  amount?: number;
  currency?: string;
  date?: string;
}

// --- Reports (CMS "Reports" tab) ---

export interface CurrencyTotal {
  currency: string;
  total: number;
}

// GET /api/admin/reports/defaulters — who hasn't (fully) paid a given
// month's welfare or executive dues. Only members still owing something
// show up here (fully-paid members are summarized in paidCount instead).
export interface DefaulterRow {
  memberId: string;
  fullName: string;
  email?: string;
  phone?: string;
  duesAmount: number;
  paid: number;
  outstanding: number;
  currency: string;
}
export interface DefaultersReport {
  period: string;
  kind: 'welfare' | 'executive';
  rows: DefaulterRow[];
  paidCount: number;
  unpaidCount: number;
  totalOutstandingByCurrency: CurrencyTotal[];
}

// GET /api/admin/reports/financial-summary — income (every successful dues/
// event/bill payment) vs. expenditure for a date range, grouped by
// currency throughout since each row carries its own rather than assuming
// one global currency.
export interface FinancialSummaryReport {
  from: string;
  to: string;
  incomeByType: { type: 'dues' | 'executive-dues' | 'event' | 'bill'; currency: string; total: number }[];
  incomeTotals: CurrencyTotal[];
  expenditureByCategory: { category: string; currency: string; total: number }[];
  expenditureTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
}

// GET /api/admin/reports/member-statement/:memberId — one member's full
// payment history (dues, executive dues, events, bills) in one place.
export interface MemberStatementReport {
  memberId: string;
  memberName: string;
  memberEmail: string;
  rows: AdminPaymentRecord[];
  totalsByCurrency: CurrencyTotal[];
}


