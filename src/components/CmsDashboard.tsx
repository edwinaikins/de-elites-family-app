import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Save, Plus, Trash2, Shield, Crown,
  RefreshCw, Heart, ShieldCheck, Users, Flame,
  Award, Compass, Image, Calendar, Film,
  X, Check, AlertCircle, LogOut,
  UserCheck, Loader2, Mail, Phone, Wallet, Ticket, UserPlus, Download
} from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { ImageUpload } from './ImageUpload';
import { BulkMediaUpload } from './BulkMediaUpload';
import { Pillar, Leader, GalleryItem, EliteEvent, MediaItem, HeroConfig, CmsUser, MemberApplication, MemberAccount, WelfareDuesPayment, EventPayment, MemberBill, AdminEventRsvp, AdminPaymentRecord, ManualPaymentInput } from '../types';
import { fetchMemberApplications, updateMemberApplicationStatus, deleteMemberApplication, UploadedMediaItem } from '../lib/cmsClient';
import {
  fetchAllMemberAccounts, createMemberAccount, updateMemberAccount, deleteMemberAccount,
  fetchMemberDuesHistoryAdmin, fetchMemberEventPaymentsAdmin, fetchAllPaymentsAdmin,
  fetchMemberExecutiveDuesHistoryAdmin, fetchMemberBillsAdmin,
  createManualPayment, deleteAdminPayment,
  createBill, updateBill, deleteBill,
  fetchEventRsvpsAdmin,
} from '../lib/memberClient';

interface CmsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'pillars' | 'leaders' | 'gallery' | 'events' | 'hero' | 'users' | 'applications' | 'memberAccounts' | 'payments';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function statusBadgeClass(status: string) {
  if (status === 'success') return 'bg-green-950/40 text-green-400 border-green-900/40';
  if (status === 'failed') return 'bg-red-950/40 text-red-400 border-red-900/40';
  return 'bg-gray-800/60 text-gray-400 border-gray-700/40';
}

function formatChannel(channel?: string): string {
  if (!channel) return '—';
  if (channel === 'mobile_money') return 'Mobile Money';
  if (channel === 'bank_transfer') return 'Bank Transfer';
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export default function CmsDashboard({ isOpen, onClose }: CmsDashboardProps) {
  const {
    pillars, leaders, gallery, events, hero, users,
    updateSection, saveItem, deleteItem, loading, error
  } = useCms();

  const [activeTab, setActiveTab] = useState<TabType>('pillars');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  // id of whichever single Leader/GalleryItem/EliteEvent card is currently
  // being saved via its own Save button — lets that one card show a spinner
  // without disabling the rest of the tab.
  const [itemActionId, setItemActionId] = useState<string | null>(null);

  // Local editable copies of states
  const [localPillars, setLocalPillars] = useState<Pillar[]>([]);
  const [localLeaders, setLocalLeaders] = useState<Leader[]>([]);
  const [localGallery, setLocalGallery] = useState<GalleryItem[]>([]);
  const [localEvents, setLocalEvents] = useState<EliteEvent[]>([]);
  const [localHero, setLocalHero] = useState<HeroConfig[]>([]);
  const [localUsers, setLocalUsers] = useState<CmsUser[]>([]);

  // Prospective member applications (kept out of the CmsDatabase/useCms mechanism
  // for privacy — fetched from a dedicated, non-public endpoint)
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  // Member portal accounts (logins for real family members) — also kept off
  // the public CmsDatabase mechanism since accounts carry an email/password.
  const [memberAccounts, setMemberAccounts] = useState<MemberAccount[]>([]);
  const [memberAccountsLoading, setMemberAccountsLoading] = useState(false);
  const [memberAccountsError, setMemberAccountsError] = useState<string | null>(null);
  const [selectedMemberDues, setSelectedMemberDues] = useState<WelfareDuesPayment[]>([]);
  const [selectedMemberEventPayments, setSelectedMemberEventPayments] = useState<EventPayment[]>([]);
  const [selectedMemberExecutiveDues, setSelectedMemberExecutiveDues] = useState<WelfareDuesPayment[]>([]);
  const [selectedMemberBills, setSelectedMemberBills] = useState<MemberBill[]>([]);
  const [selectedMemberHistoryLoading, setSelectedMemberHistoryLoading] = useState(false);

  // New member account creation form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberDues, setNewMemberDues] = useState('');
  // Leave blank for a regular member (executiveDuesAmount 0) — set a number
  // to also flag this member as an executive and bill them this extra
  // amount every period, on top of newMemberDues.
  const [newMemberExecutiveDues, setNewMemberExecutiveDues] = useState('');
  const [newMemberChapter, setNewMemberChapter] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  // Draft edits for the currently selected member account (dues amount etc.)
  const [memberEditDues, setMemberEditDues] = useState('');
  const [memberEditExecutiveDues, setMemberEditExecutiveDues] = useState('');
  const [memberEditPhone, setMemberEditPhone] = useState('');
  const [memberEditStatus, setMemberEditStatus] = useState<'active' | 'suspended'>('active');
  // Members log in with this, not their email (see /api/member/login) — pre-
  // migration accounts may have this blank until an admin assigns one here.
  const [memberEditUsername, setMemberEditUsername] = useState('');
  const [memberResetPassword, setMemberResetPassword] = useState('');

  // Reconciliation: every dues + event payment across every member ("who
  // paid what"), fetched once when the tab opens and filtered/sorted
  // client-side since the dataset is small enough not to need server-side
  // pagination.
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState<'all' | 'dues' | 'event' | 'executive-dues' | 'bill'>('all');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');

  // "Log Manual Payment" form — for cash, bank transfer, or any payment
  // collected outside Paystack, so it still shows up in reconciliation.
  const [showManualPaymentForm, setShowManualPaymentForm] = useState(false);
  const [manualType, setManualType] = useState<'dues' | 'event' | 'executive-dues'>('dues');
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualPeriod, setManualPeriod] = useState(currentPeriod());
  const [manualEventId, setManualEventId] = useState('');
  const [manualEventTitle, setManualEventTitle] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCurrency, setManualCurrency] = useState('');
  const [manualChannel, setManualChannel] = useState('cash');
  const [manualChannelOther, setManualChannelOther] = useState('');
  const [manualStatus, setManualStatus] = useState<'pending' | 'success' | 'failed'>('success');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualFormError, setManualFormError] = useState('');

  // "Create One-off Bill" form — a non-recurring charge, unpaid until the
  // member(s) pay it themselves from their portal. Recipients is a set of
  // member ids so one submit can bill a single person or a whole group.
  const [showBillForm, setShowBillForm] = useState(false);
  const [billLabel, setBillLabel] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCurrency, setBillCurrency] = useState('');
  const [billRecipientIds, setBillRecipientIds] = useState<Set<string>>(new Set());
  const [billSubmitting, setBillSubmitting] = useState(false);
  const [billFormError, setBillFormError] = useState('');

  // Track currently active item for editing or "new" state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('cms_authenticated') === 'true');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // New user credentials state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator'>('moderator');

  // Initialize local copies when the modal opens. Deliberately keyed ONLY on
  // `isOpen` (not on pillars/leaders/gallery/events/hero/users too, like this
  // used to be) — once per-item Save buttons landed on the Leadership/Gallery/
  // Events tabs, saving or deleting one card updates the CmsContext arrays
  // immediately, and re-running this on every such change would blow away
  // whatever unsaved edit an admin has mid-typed into a *different* card's
  // form. Local state now only ever gets reseeded when the panel is freshly
  // opened; by then CmsProvider's initial fetch has long since resolved (the
  // whole public site is gated behind it — see App.tsx), so there's no stale
  // data to worry about missing.
  React.useEffect(() => {
    if (isOpen) {
      setLocalPillars([...pillars]);
      setLocalLeaders([...leaders]);
      setLocalGallery([...gallery]);
      setLocalEvents([...events]);
      setLocalHero([...hero]);
      setLocalUsers([...(users || [])]);
      setSelectedItemId(null);
      setIsAddingNew(false);
      setLocalError(null);
      setSuccessMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedItemId(null);
    setIsAddingNew(false);
    setLocalError(null);
  }, [activeTab]);

  // Load prospective member applications when that tab is opened
  React.useEffect(() => {
    if (isOpen && activeTab === 'applications') {
      setApplicationsLoading(true);
      setApplicationsError(null);
      fetchMemberApplications()
        .then(setApplications)
        .catch((err: any) => setApplicationsError(err.message || 'Failed to load applications'))
        .finally(() => setApplicationsLoading(false));
    }
  }, [isOpen, activeTab]);

  // Load member portal accounts when that tab is opened
  const loadMemberAccounts = React.useCallback(() => {
    setMemberAccountsLoading(true);
    setMemberAccountsError(null);
    fetchAllMemberAccounts()
      .then(setMemberAccounts)
      .catch((err: any) => setMemberAccountsError(err.message || 'Failed to load member accounts'))
      .finally(() => setMemberAccountsLoading(false));
  }, []);

  React.useEffect(() => {
    if (isOpen && activeTab === 'memberAccounts') {
      loadMemberAccounts();
    }
  }, [isOpen, activeTab, loadMemberAccounts]);

  // Load the reconciliation payments list when that tab is opened — also
  // make sure member accounts are loaded even if the admin never visited
  // the Member Accounts tab first, since the manual-payment form needs the
  // member picker populated.
  React.useEffect(() => {
    if (isOpen && activeTab === 'payments') {
      setPaymentsLoading(true);
      setPaymentsError(null);
      fetchAllPaymentsAdmin()
        .then(setPayments)
        .catch((err: any) => setPaymentsError(err.message || 'Failed to load payments'))
        .finally(() => setPaymentsLoading(false));
      if (memberAccounts.length === 0) {
        loadMemberAccounts();
      }
    }
  }, [isOpen, activeTab]);

  const filteredPayments = React.useMemo(() => {
    const search = paymentsSearch.trim().toLowerCase();
    return payments.filter((p) => {
      if (paymentsTypeFilter !== 'all' && p.type !== paymentsTypeFilter) return false;
      if (paymentsStatusFilter !== 'all' && p.status !== paymentsStatusFilter) return false;
      if (search) {
        const haystack = `${p.memberName} ${p.memberEmail} ${p.label} ${p.reference}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [payments, paymentsTypeFilter, paymentsStatusFilter, paymentsSearch]);

  const paymentsTotalsByCurrency = React.useMemo(() => {
    const totals: { currency: string; total: number }[] = [];
    for (const p of filteredPayments) {
      if (p.status !== 'success') continue;
      const existing = totals.find((t) => t.currency === p.currency);
      if (existing) {
        existing.total += p.amount;
      } else {
        totals.push({ currency: p.currency, total: p.amount });
      }
    }
    return totals;
  }, [filteredPayments]);

  const handleExportPaymentsCsv = () => {
    const header = ['Date', 'Member Name', 'Member Email', 'Type', 'Details', 'Amount', 'Currency', 'Channel', 'Status', 'Reference'];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredPayments.map((p) => [
      new Date(p.createdAt).toISOString(),
      p.memberName,
      p.memberEmail,
      p.type,
      p.label,
      p.amount.toFixed(2),
      p.currency,
      p.channel || '',
      p.status,
      p.reference,
    ].map((v) => escapeCsv(String(v))).join(','));
    const csv = [header.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `de-elites-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetManualPaymentForm = () => {
    setManualType('dues');
    setManualMemberId('');
    setManualPeriod(currentPeriod());
    setManualEventId('');
    setManualEventTitle('');
    setManualAmount('');
    setManualCurrency('');
    setManualChannel('cash');
    setManualChannelOther('');
    setManualStatus('success');
    setManualFormError('');
  };

  const handleManualMemberChange = (id: string) => {
    setManualMemberId(id);
    const selected = memberAccounts.find((m) => m.id === id);
    if (selected) setManualCurrency(selected.currency);
  };

  const handleManualEventChange = (id: string) => {
    setManualEventId(id);
    const selected = events.find((ev) => ev.id === id);
    if (selected) setManualEventTitle(selected.title);
  };

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError('');
    if (!manualMemberId) {
      setManualFormError('Select a member.');
      return;
    }
    const amountNum = Number(manualAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setManualFormError('Enter a valid amount greater than zero.');
      return;
    }
    if ((manualType === 'dues' || manualType === 'executive-dues') && !manualPeriod) {
      setManualFormError('Enter a dues period.');
      return;
    }
    if (manualType === 'event' && !manualEventId && !manualEventTitle.trim()) {
      setManualFormError('Select an event or enter a title for it.');
      return;
    }
    const channel = manualChannel === 'other' ? manualChannelOther.trim() || 'other' : manualChannel;

    setManualSubmitting(true);
    try {
      await createManualPayment({
        type: manualType,
        memberId: manualMemberId,
        amount: amountNum,
        currency: manualCurrency || undefined,
        channel,
        status: manualStatus,
        period: (manualType === 'dues' || manualType === 'executive-dues') ? manualPeriod : undefined,
        eventId: manualType === 'event' ? manualEventId || undefined : undefined,
        eventTitle: manualType === 'event' ? manualEventTitle.trim() || undefined : undefined,
      });
      const refreshed = await fetchAllPaymentsAdmin();
      setPayments(refreshed);
      resetManualPaymentForm();
      setShowManualPaymentForm(false);
    } catch (err: any) {
      setManualFormError(err.message || 'Failed to log payment.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleDeletePayment = async (p: AdminPaymentRecord) => {
    if (!window.confirm(`Permanently delete this ${p.type} payment record for ${p.memberName} (${p.currency} ${p.amount.toFixed(2)})? This cannot be undone.`)) return;
    try {
      await deleteAdminPayment(p.type, p.id);
      setPayments((prev) => prev.filter((x) => !(x.type === p.type && x.id === p.id)));
    } catch (err: any) {
      setPaymentsError(err.message || 'Failed to delete payment.');
    }
  };

  // Load the selected member's payment history + hydrate the edit form
  React.useEffect(() => {
    if (activeTab !== 'memberAccounts' || !selectedItemId) return;
    const selected = memberAccounts.find((m) => m.id === selectedItemId);
    if (!selected) return;
    setMemberEditDues(String(selected.duesAmount ?? 0));
    setMemberEditExecutiveDues(String(selected.executiveDuesAmount ?? 0));
    setMemberEditPhone(selected.phone || '');
    setMemberEditStatus(selected.status);
    setMemberEditUsername(selected.username || '');
    setMemberResetPassword('');
    setSelectedMemberHistoryLoading(true);
    Promise.all([
      fetchMemberDuesHistoryAdmin(selected.id),
      fetchMemberEventPaymentsAdmin(selected.id),
      fetchMemberExecutiveDuesHistoryAdmin(selected.id),
      fetchMemberBillsAdmin(selected.id),
    ])
      .then(([dues, eventPayments, executiveDues, bills]) => {
        setSelectedMemberDues(dues);
        setSelectedMemberEventPayments(eventPayments);
        setSelectedMemberExecutiveDues(executiveDues);
        setSelectedMemberBills(bills);
      })
      .catch(() => {})
      .finally(() => setSelectedMemberHistoryLoading(false));
  }, [activeTab, selectedItemId, memberAccounts]);

  if (!isOpen) return null;

  const triggerNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Generic Save handler for the whole section
  const handleSaveSection = async (tab: TabType) => {
    setSaveLoading(true);
    setLocalError(null);
    try {
      if (tab === 'pillars') {
        await updateSection('pillars', localPillars);
      } else if (tab === 'leaders') {
        await updateSection('leaders', localLeaders);
      } else if (tab === 'gallery') {
        await updateSection('gallery', localGallery);
      } else if (tab === 'events') {
        await updateSection('events', localEvents);
      } else if (tab === 'hero') {
        await updateSection('hero', localHero);
      } else if (tab === 'users') {
        await updateSection('users', localUsers);
      }
      triggerNotification(`Successfully saved ${tab} changes to server!`);
    } catch (err: any) {
      setLocalError(err.message || `Failed to save ${tab} changes`);
    } finally {
      setSaveLoading(false);
    }
  };

  // --- CRUD HELPERS FOR INDIVIDUAL TABS ---

  // PILLARS CRUD
  const handlePillarChange = (id: string, field: keyof Pillar, value: any) => {
    setLocalPillars(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // LEADERS CRUD
  const handleLeaderChange = (id: string, field: string, value: any) => {
    setLocalLeaders(prev => prev.map(l => {
      if (l.id === id) {
        if (field.startsWith('socials.')) {
          const socialKey = field.split('.')[1];
          return {
            ...l,
            socials: {
              ...(l.socials || {}),
              [socialKey]: value
            }
          };
        }
        return { ...l, [field]: value };
      }
      return l;
    }));
  };

  const handleAddLeader = () => {
    const newLeader: Leader = {
      id: `leader-${Date.now()}`,
      name: "New Leader Name",
      role: "Board Role",
      quote: "Sovereign quote...",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400",
      bio: "A brief bio about the leader's contributions...",
      socials: { twitter: "", instagram: "", facebook: "" }
    };
    setLocalLeaders(prev => [...prev, newLeader]);
    setSelectedItemId(newLeader.id);
    setIsAddingNew(true);
  };

  const handleSaveLeaderItem = async (id: string) => {
    const leader = localLeaders.find(l => l.id === id);
    if (!leader) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await saveItem('leaders', leader);
      triggerNotification(`Saved "${leader.name}".`);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save leader');
    } finally {
      setItemActionId(null);
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this leader profile? This deletes it immediately — there's no separate save step.")) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await deleteItem('leaders', id);
      setLocalLeaders(prev => prev.filter(l => l.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
      triggerNotification('Leader deleted.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete leader');
    } finally {
      setItemActionId(null);
    }
  };

  // GALLERY CRUD
  const handleGalleryChange = (id: string, field: keyof GalleryItem, value: any) => {
    setLocalGallery(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAddGalleryItem = () => {
    const newItem: GalleryItem = {
      id: `g-${Date.now()}`,
      title: "New Project Event Title",
      category: "Legacy",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500",
      description: "Describe this milestone accomplishment here...",
      date: "Current Month 2026"
    };
    setLocalGallery(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setIsAddingNew(true);
  };

  const handleSaveGalleryItem = async (id: string) => {
    const item = localGallery.find(g => g.id === id);
    if (!item) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await saveItem('gallery', item);
      triggerNotification(`Saved "${item.title}".`);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save gallery item');
    } finally {
      setItemActionId(null);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this gallery item? This deletes it immediately — there's no separate save step.")) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await deleteItem('gallery', id);
      setLocalGallery(prev => prev.filter(g => g.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
      triggerNotification('Gallery item deleted.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete gallery item');
    } finally {
      setItemActionId(null);
    }
  };

  // Turns a batch of just-uploaded files (from BulkMediaUpload) into one
  // draft GalleryItem per file, defaulted to the 'Events' category since
  // that's the common case (bulk-uploading photos/videos from an event).
  // Nothing is saved to the server yet — the admin reviews/edits each new
  // entry, then hits that item's own "Save This Milestone" button.
  const handleBulkGalleryUpload = (items: UploadedMediaItem[]) => {
    if (!items.length) return;
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const newItems: GalleryItem[] = items.map((it, i) => {
      const cleanedTitle = it.originalName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
      return {
        id: `g-${Date.now()}-${i}`,
        title: cleanedTitle || (it.isVideo ? 'Event Video' : 'Event Photo'),
        category: 'Events',
        image: it.url,
        description: '',
        date: dateLabel,
        isVideo: it.isVideo,
      };
    });
    setLocalGallery(prev => [...newItems, ...prev]);
    setSelectedItemId(newItems[0].id);
    triggerNotification(
      `${newItems.length} file${newItems.length === 1 ? '' : 's'} uploaded — review the details, then click "Save This Milestone" on each to publish it.`
    );
  };

  // Appends bulk-uploaded photos/videos to a single milestone's extra media
  // collection (on top of its single cover `image`), from the "EDIT
  // MILESTONE EVENT" panel. Shown in the spotlight lightbox on the public
  // Legacy Gallery once saved.
  const handleGalleryMediaUpload = (itemId: string, items: UploadedMediaItem[]) => {
    if (!items.length) return;
    const newMedia: MediaItem[] = items.map((it, i) => ({
      id: `gm-${Date.now()}-${i}`,
      url: it.url,
      isVideo: it.isVideo,
    }));
    setLocalGallery(prev => prev.map(g => g.id === itemId ? { ...g, media: [...(g.media || []), ...newMedia] } : g));
    triggerNotification(
      `${newMedia.length} file${newMedia.length === 1 ? '' : 's'} added to this milestone's gallery — click "Save This Milestone" to publish.`
    );
  };

  const handleDeleteGalleryMedia = (itemId: string, mediaId: string) => {
    setLocalGallery(prev => prev.map(g => g.id === itemId ? { ...g, media: (g.media || []).filter(m => m.id !== mediaId) } : g));
  };

  // APPLICATIONS ACTIONS (server-backed, not part of local CmsDatabase state)
  const handleApplicationStatusChange = async (id: string, status: MemberApplication['status']) => {
    try {
      const updated = await updateMemberApplicationStatus(id, status);
      setApplications(prev => prev.map(a => a.id === id ? updated : a));
      triggerNotification(`Application marked as ${status}.`);
    } catch (err: any) {
      setApplicationsError(err.message || 'Failed to update application status');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application?")) return;
    try {
      await deleteMemberApplication(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    } catch (err: any) {
      setApplicationsError(err.message || 'Failed to delete application');
    }
  };

  // MEMBER ACCOUNTS (portal logins) ACTIONS
  const handleCreateMemberAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberAccountsError(null);
    if (!newMemberName.trim() || !newMemberUsername.trim() || !newMemberEmail.trim() || !newMemberPassword.trim()) {
      setMemberAccountsError('Full name, username, email, and a temporary password are required.');
      return;
    }
    if (newMemberPassword.trim().length < 8) {
      setMemberAccountsError('Temporary password must be at least 8 characters.');
      return;
    }
    try {
      const { member: created, emailSent, mailMock } = await createMemberAccount({
        fullName: newMemberName.trim(),
        username: newMemberUsername.trim(),
        email: newMemberEmail.trim(),
        password: newMemberPassword.trim(),
        phone: newMemberPhone.trim() || undefined,
        duesAmount: newMemberDues ? Number(newMemberDues) : 0,
        executiveDuesAmount: newMemberExecutiveDues ? Number(newMemberExecutiveDues) : 0,
        chapter: newMemberChapter.trim() || undefined,
        role: newMemberRole.trim() || undefined,
      });
      setMemberAccounts(prev => [created, ...prev]);
      setNewMemberName('');
      setNewMemberUsername('');
      setNewMemberEmail('');
      setNewMemberPassword('');
      setNewMemberPhone('');
      setNewMemberDues('');
      setNewMemberExecutiveDues('');
      setNewMemberChapter('');
      setNewMemberRole('');
      if (emailSent && !mailMock) {
        triggerNotification(`Member account created for ${created.fullName}. A welcome email with their username, temporary password, and login instructions was sent to ${created.email}.`);
      } else if (emailSent && mailMock) {
        triggerNotification(`Member account created for ${created.fullName}. Email server isn't configured yet (Test Mode) — the welcome email was only logged, not delivered. Share the username and temporary password with them securely yourself.`);
      } else {
        triggerNotification(`Member account created for ${created.fullName}, but the welcome email could not be sent. Share the username and temporary password with them securely yourself — they'll be prompted to set their own password on first login.`);
      }
    } catch (err: any) {
      setMemberAccountsError(err.message || 'Failed to create member account');
    }
  };

  const handleSaveMemberEdits = async (id: string) => {
    const wasResettingPassword = !!memberResetPassword.trim();
    try {
      const { member: updated, emailSent, mailMock } = await updateMemberAccount(id, {
        duesAmount: memberEditDues ? Number(memberEditDues) : 0,
        executiveDuesAmount: memberEditExecutiveDues ? Number(memberEditExecutiveDues) : 0,
        phone: memberEditPhone.trim(),
        status: memberEditStatus,
        ...(memberEditUsername.trim() ? { username: memberEditUsername.trim() } : {}),
        ...(wasResettingPassword ? { resetPassword: memberResetPassword.trim() } : {}),
      });
      setMemberAccounts(prev => prev.map(m => m.id === id ? updated : m));
      setMemberResetPassword('');
      if (!wasResettingPassword) {
        triggerNotification('Member account updated.');
      } else if (emailSent && !mailMock) {
        triggerNotification(`Member account updated. A new temporary password was emailed to ${updated.email} along with login instructions.`);
      } else if (emailSent && mailMock) {
        triggerNotification('Member account updated. A new temporary password is set (Test Mode: email server isn\'t configured yet, so it was only logged, not delivered) — share it with them directly.');
      } else {
        triggerNotification('Member account updated. A new temporary password is set, but the email could not be sent — share it with them directly.');
      }
    } catch (err: any) {
      setMemberAccountsError(err.message || 'Failed to update member account');
    }
  };

  const handleDeleteMemberAccount = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this member's portal account? They will lose access immediately.")) return;
    try {
      await deleteMemberAccount(id);
      setMemberAccounts(prev => prev.filter(m => m.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    } catch (err: any) {
      setMemberAccountsError(err.message || 'Failed to delete member account');
    }
  };

  // AUTHENTICATION & SECURITY LOGIC
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Both username and password are required.');
      return;
    }
    const found = users?.find(
      u => u.username.toLowerCase() === loginUsername.trim().toLowerCase() && u.password === loginPassword.trim()
    );
    if (found) {
      setIsAuthenticated(true);
      sessionStorage.setItem('cms_authenticated', 'true');
      sessionStorage.setItem('cms_user', JSON.stringify(found));
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cms_authenticated');
    sessionStorage.removeItem('cms_user');
  };

  const handleDeleteUser = (id: string) => {
    const user = localUsers.find(u => u.id === id);
    if (!user) return;
    if (user.username === 'admin') {
      alert('The primary default "admin" user cannot be deleted to prevent accidental locking out.');
      return;
    }
    const loggedUserStr = sessionStorage.getItem('cms_user');
    if (loggedUserStr) {
      const loggedUser = JSON.parse(loggedUserStr);
      if (loggedUser.id === id) {
        alert('You cannot delete your own logged-in user account.');
        return;
      }
    }
    if (window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
      setLocalUsers(prev => prev.filter(u => u.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  // EVENTS CRUD
  const handleEventChange = (id: string, field: keyof EliteEvent, value: any) => {
    setLocalEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddEvent = () => {
    const newEvent: EliteEvent = {
      id: `event-${Date.now()}`,
      title: "New Epic Event Title",
      date: "August 15, 2026",
      time: "6:00 PM GMT",
      location: "Accra, Ghana",
      description: "A summary of the upcoming sovereign family event, mission meetup, or music concert.",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500",
      category: "Summit",
    };
    setLocalEvents(prev => [newEvent, ...prev]);
    setSelectedItemId(newEvent.id);
    setIsAddingNew(true);
  };

  const handleSaveEventItem = async (id: string) => {
    const event = localEvents.find(e => e.id === id);
    if (!event) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await saveItem('events', event);
      triggerNotification(`Saved "${event.title}".`);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save event');
    } finally {
      setItemActionId(null);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This deletes it immediately — there's no separate save step.")) return;
    setItemActionId(id);
    setLocalError(null);
    try {
      await deleteItem('events', id);
      setLocalEvents(prev => prev.filter(e => e.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
      triggerNotification('Event deleted.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete event');
    } finally {
      setItemActionId(null);
    }
  };

  // Appends bulk-uploaded photos/videos to this specific event's own media
  // collection (distinct from the single banner `image`). Shown as a "View
  // Gallery" lightbox on the event's public card, and merged into the
  // Legacy Gallery tagged with this event once saved.
  const handleEventMediaUpload = (eventId: string, items: UploadedMediaItem[]) => {
    if (!items.length) return;
    const newMedia: MediaItem[] = items.map((it, i) => ({
      id: `em-${Date.now()}-${i}`,
      url: it.url,
      isVideo: it.isVideo,
    }));
    setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, media: [...(e.media || []), ...newMedia] } : e));
    triggerNotification(
      `${newMedia.length} file${newMedia.length === 1 ? '' : 's'} added to this event's gallery — click "Save This Event" to publish.`
    );
  };

  const handleDeleteEventMedia = (eventId: string, mediaId: string) => {
    setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, media: (e.media || []).filter(m => m.id !== mediaId) } : e));
  };

  const handleHeroChange = (field: keyof HeroConfig, value: string) => {
    setLocalHero(prev => {
      if (prev.length === 0) {
        return [{
          id: 'hero-config',
          title: 'DE ELITES FAMILY',
          slogan: 'ONE FAMILY. ONE MISSION. ONE LEGACY.',
          description: 'We are a sovereign community of visionaries, creatives, and high-achievers. Born from the streets, refined by struggle, and unified by the spirit of loyalty. We exist to build power, empower the youth, and preserve an empire of absolute excellence.',
          joinButtonText: 'Join the Movement',
          exploreButtonText: 'Explore Our Legacy',
          stat1Value: '10K+',
          stat1Label: 'Global Members',
          stat2Value: '15+',
          stat2Label: 'Legacy Projects',
          stat3Value: '100%',
          stat3Label: 'Uncompromising Loyalty',
          [field]: value
        }];
      }
      return prev.map(h => h.id === 'hero-config' ? { ...h, [field]: value } : h);
    });
  };


  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0d0d0d] border border-luxury-gold rounded-lg p-8 shadow-[0_20px_50px_rgba(0,0,0,0.95)] relative animate-fade-in"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full border border-luxury-gold flex items-center justify-center bg-charcoal-card mx-auto mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Shield className="w-8 h-8 text-luxury-gold animate-pulse" />
            </div>
            <h2 className="font-display text-xl font-black text-white uppercase tracking-wider">
              Elite Access Control
            </h2>
            <p className="font-sans text-[9px] text-luxury-gold uppercase tracking-[0.2em] mt-1 font-bold">
              Secure CMS Administrator Console
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                Username / Alias
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. admin"
                className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold placeholder:text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                Security Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold placeholder:text-gray-700"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                <AlertCircle className="shrink-0 w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Authorize Credentials
            </button>
          </form>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
      
      {/* CMS Dashboard Wrapper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="w-full h-full max-w-7xl mx-auto flex flex-col bg-[#0d0d0d] border border-gray-900 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
      >
        
        {/* Header bar */}
        <header className="px-6 py-4 bg-jet-black border-b border-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-luxury-gold/15 rounded border border-luxury-gold/30">
              <Settings className="w-5 h-5 text-luxury-gold animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-black bg-luxury-gold px-1.5 py-0.5 rounded">
                  Admin System
                </span>
                <span className="text-gray-500 font-mono text-[10px]">v1.2</span>
              </div>
              <h2 className="font-display text-lg font-black text-white uppercase tracking-wider">
                DE ELITES CMS BACKEND
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.8 rounded border border-gray-800 bg-charcoal-card hover:bg-gray-900 text-gray-400 hover:text-white font-sans font-bold tracking-wider text-[10px] uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Logout from CMS"
            >
              <LogOut className="w-3.5 h-3.5 text-luxury-gold" />
              Logout
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white bg-jet-black/60 border border-gray-950 rounded hover:border-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Central Layout Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT Sidebar: Categories list */}
          <aside className="w-64 bg-jet-black border-r border-gray-900 flex flex-col justify-between shrink-0">
            <div className="p-4 space-y-1">
              <span className="font-sans text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 block px-2 mb-3">
                Content Modules
              </span>
              {[
                { type: 'pillars', label: '1. Core Pillars', count: localPillars.length, desc: 'Love, Loyalty, Unity' },
                { type: 'leaders', label: '2. Leadership', count: localLeaders.length, desc: 'Patrons & Council' },
                { type: 'gallery', label: '3. Legacy Gallery', count: localGallery.length, desc: 'Milestone Events' },
                { type: 'events', label: '4. Upcoming Events', count: localEvents.length, desc: 'Concerts & Summits' },
                { type: 'hero', label: '5. Hero & Branding', count: localHero.length, desc: 'Title, Logo & Stats' },
                { type: 'users', label: '6. User Accounts', count: localUsers.length, desc: 'Manage CMS Users' },
                { type: 'applications', label: '7. Applications', count: applications.length, desc: 'Prospective Members' },
                { type: 'memberAccounts', label: '8. Member Accounts', count: memberAccounts.length, desc: 'Portal Logins & Dues' },
                { type: 'payments', label: '9. Payments', count: payments.length, desc: 'Reconciliation & Exports' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setActiveTab(item.type as TabType)}
                  className={`w-full text-left px-3 py-3 rounded transition-all cursor-pointer flex items-center justify-between border ${
                    activeTab === item.type
                      ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                      : 'text-gray-400 hover:text-white bg-transparent border-transparent hover:bg-gray-900/20'
                  }`}
                >
                  <div>
                    <span className="font-sans text-xs font-black uppercase tracking-wider block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5 font-sans truncate max-w-[150px]">
                      {item.desc}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-black/60 text-gray-400 px-2 py-0.5 rounded border border-gray-900 font-bold">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* MAIN Workspace Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
            
            {/* Sub-Header Actions */}
            <div className="px-6 py-3 bg-jet-black/50 border-b border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Editing Module:
                </span>
                <span className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest">
                  {activeTab}
                </span>
              </div>

              {/* Action and Save buttons */}
              <div className="flex items-center gap-3">
                {activeTab !== 'pillars' && activeTab !== 'hero' && activeTab !== 'applications' && activeTab !== 'memberAccounts' && (
                  <button
                    onClick={() => {
                      if (activeTab === 'leaders') handleAddLeader();
                      else if (activeTab === 'gallery') handleAddGalleryItem();
                      else if (activeTab === 'events') handleAddEvent();
                    }}
                    className="px-3.5 py-1.5 rounded bg-jet-black border border-gray-800 hover:border-luxury-gold/50 text-white hover:text-luxury-gold font-sans font-black tracking-widest text-[10px] uppercase transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Entry
                  </button>
                )}

                {activeTab !== 'applications' && activeTab !== 'memberAccounts' &&
                 activeTab !== 'leaders' && activeTab !== 'gallery' && activeTab !== 'events' && (
                  <button
                    onClick={() => handleSaveSection(activeTab)}
                    disabled={saveLoading}
                    className="px-4 py-2 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] hover:shadow-[0_2px_15px_rgba(212,175,55,0.4)] disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    {saveLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save All {activeTab}
                  </button>
                )}
              </div>
            </div>

            {/* Error / Success feedback bar */}
            {localError && (
              <div className="bg-red-950/20 border-b border-red-900/30 px-6 py-2.5 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{localError}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-950/20 border-b border-green-900/30 px-6 py-2.5 text-xs text-green-400 flex items-center gap-2">
                <Crown className="w-4 h-4 text-luxury-gold shrink-0 animate-spin" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tab Inner Contents - Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* PILLARS MODULE VIEW */}
              {activeTab === 'pillars' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="bg-charcoal-card p-4 rounded border border-gray-900 text-xs text-gray-400 leading-relaxed">
                    🌟 <strong>Core Pillars Info:</strong> Core pillars form the foundational backbone of the De Elites Family philosophy. For visual safety, these items are mapped specifically to design icons. You can update the titles, quotes, and descriptive copy of each pillar.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localPillars.map((p, index) => (
                      <div key={p.id} className="bg-charcoal-card p-5 border border-gray-900 rounded-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-900/80 pb-2">
                          <span className="font-mono text-[10px] text-luxury-gold font-bold">
                            PILLAR ID: {p.id.toUpperCase()}
                          </span>
                          <span className="font-sans text-[10px] font-black uppercase text-gray-500">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Pillar Name</label>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => handlePillarChange(p.id, 'name', e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Display Icon</label>
                            <select
                              value={p.icon}
                              onChange={(e) => handlePillarChange(p.id, 'icon', e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                            >
                              <option value="Heart">Heart (Love)</option>
                              <option value="ShieldCheck">Shield (Loyalty)</option>
                              <option value="Users">Users (Unity)</option>
                              <option value="Flame">Flame (Passion)</option>
                              <option value="Award">Award (Respect)</option>
                              <option value="Compass">Compass (Community)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Pillar Creed Quote</label>
                          <input
                            type="text"
                            value={p.quote}
                            onChange={(e) => handlePillarChange(p.id, 'quote', e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold italic"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Full Description</label>
                          <textarea
                            value={p.description}
                            onChange={(e) => handlePillarChange(p.id, 'description', e.target.value)}
                            rows={3}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* LEADERS MODULE VIEW */}
              {activeTab === 'leaders' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Council list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Leadership Profiles
                    </span>
                    {localLeaders.map((leader) => (
                      <div
                        key={leader.id}
                        onClick={() => setSelectedItemId(leader.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === leader.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={leader.image}
                            alt={leader.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-gray-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {leader.name}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500 truncate">
                              {leader.role}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLeader(leader.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Council editor form */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localLeaders.find(l => l.id === selectedItemId) ? (
                      (() => {
                        const leader = localLeaders.find(l => l.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT LEADERSHIP CARD
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gray-500">
                                  ID: {leader.id}
                                </span>
                                <button
                                  onClick={() => handleSaveLeaderItem(leader.id)}
                                  disabled={itemActionId === leader.id}
                                  className="px-3 py-1.5 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {itemActionId === leader.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  Save This Leader
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Leader Name</label>
                                <input
                                  type="text"
                                  value={leader.name}
                                  onChange={(e) => handleLeaderChange(leader.id, 'name', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Administrative Role</label>
                                <input
                                  type="text"
                                  value={leader.role}
                                  onChange={(e) => handleLeaderChange(leader.id, 'role', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <ImageUpload
                              value={leader.image}
                              onChange={(val) => handleLeaderChange(leader.id, 'image', val)}
                              label="Council Leader Photo"
                              description="Drag and drop or click to upload a photo for this leader."
                              aspectRatio="avatar"
                            />

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Sovereign Statement / Quote</label>
                              <input
                                type="text"
                                value={leader.quote}
                                onChange={(e) => handleLeaderChange(leader.id, 'quote', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold italic"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Biography / Credentials</label>
                              <textarea
                                value={leader.bio}
                                onChange={(e) => handleLeaderChange(leader.id, 'bio', e.target.value)}
                                rows={4}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>

                            {/* Social Handles */}
                            <div className="pt-3 border-t border-gray-900">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                                Social Channels (Optional URLs)
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  placeholder="Instagram Link"
                                  value={leader.socials?.instagram || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.instagram', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                                <input
                                  type="text"
                                  placeholder="Twitter Link"
                                  value={leader.socials?.twitter || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.twitter', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                                <input
                                  type="text"
                                  placeholder="Facebook Link"
                                  value={leader.socials?.facebook || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.facebook', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Shield className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select a leadership profile on the left side to edit credentials or add a new council member.
                      </div>
                    )}
                  </div>

                </div>
              )}


              {/* GALLERY MODULE VIEW */}
              {activeTab === 'gallery' && (
                <div className="flex flex-col gap-6 h-full">

                  {/* Powers the Category Tag field's suggestions below — every
                      category currently in use across the gallery, so admins
                      see what already exists before typing a brand-new one. */}
                  <datalist id="gallery-category-options">
                    {Array.from(new Set(localGallery.map((g) => g.category).filter(Boolean))).map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>

                  <BulkMediaUpload onUploaded={handleBulkGalleryUpload} />

                  <div className="grid grid-cols-3 gap-6 flex-1 items-start min-h-0">

                  {/* Milestones list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Legacy Projects & Milestones
                    </span>
                    {localGallery.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === item.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.isVideo ? (
                            <div className="w-10 h-8 rounded border border-gray-800 bg-black flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-luxury-gold" />
                            </div>
                          ) : (
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-10 h-8 rounded object-cover border border-gray-800"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {item.title}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500">
                              {item.category} • {item.date}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGalleryItem(item.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Milestones editor */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localGallery.find(g => g.id === selectedItemId) ? (
                      (() => {
                        const item = localGallery.find(g => g.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT MILESTONE EVENT
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gray-500">
                                  ID: {item.id}
                                </span>
                                <button
                                  onClick={() => handleSaveGalleryItem(item.id)}
                                  disabled={itemActionId === item.id}
                                  className="px-3 py-1.5 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {itemActionId === item.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  Save This Milestone
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Milestone Title</label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleGalleryChange(item.id, 'title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Category Tag
                                </label>
                                {/* Freeform + a datalist of categories already in use — type an
                                    existing one to reuse it, or a brand-new name to create one.
                                    Any category typed here immediately becomes its own filter
                                    button on the public Legacy Gallery once saved. */}
                                <input
                                  type="text"
                                  list="gallery-category-options"
                                  value={item.category}
                                  onChange={(e) => handleGalleryChange(item.id, 'category', e.target.value)}
                                  placeholder="e.g. Legacy, Community, Philanthropy..."
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Date Display</label>
                                <input
                                  type="text"
                                  value={item.date}
                                  placeholder="e.g. March 2026"
                                  onChange={(e) => handleGalleryChange(item.id, 'date', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            {item.isVideo ? (
                              <div className="space-y-2">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Video File</label>
                                <div className="border border-gray-800 rounded-lg bg-jet-black overflow-hidden aspect-video">
                                  <video src={item.image} controls className="w-full h-full object-contain" />
                                </div>
                                <p className="text-[9px] text-gray-500 font-sans">
                                  Uploaded video file. To replace it, delete this entry and upload the new file again via the bulk uploader above.
                                </p>
                              </div>
                            ) : (
                              <ImageUpload
                                value={item.image}
                                onChange={(val) => handleGalleryChange(item.id, 'image', val)}
                                label="Banner Image / Cover Photo"
                                description="Drag and drop or click to upload a banner image for this milestone."
                                aspectRatio="banner"
                              />
                            )}

                            <div className="space-y-3">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Additional Photos & Videos {item.media && item.media.length > 0 ? `(${item.media.length})` : ''}
                              </label>
                              <BulkMediaUpload onUploaded={(uploaded) => handleGalleryMediaUpload(item.id, uploaded)} />
                              {item.media && item.media.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                  {item.media.map((m) => (
                                    <div
                                      key={m.id}
                                      className="relative group aspect-square rounded overflow-hidden border border-gray-800 bg-black"
                                    >
                                      {m.isVideo ? (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Film className="w-4 h-4 text-luxury-gold" />
                                        </div>
                                      ) : (
                                        <img src={m.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGalleryMedia(item.id, m.id)}
                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                        title="Remove from this milestone's gallery"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-[9px] text-gray-500 font-sans">
                                On top of the cover above, browsable in the spotlight lightbox on the public Legacy Gallery.
                              </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Milestone Summary Description</label>
                              <textarea
                                value={item.description}
                                onChange={(e) => handleGalleryChange(item.id, 'description', e.target.value)}
                                rows={5}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Image className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select a milestone event on the left side to edit details, or upload event photos/videos in bulk above.
                      </div>
                    )}
                  </div>

                  </div>
                </div>
              )}


              {/* EVENTS MODULE VIEW */}
              {activeTab === 'events' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Events list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Upcoming Events
                    </span>
                    {localEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedItemId(event.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === event.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded bg-luxury-gold/15 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold text-[10px] font-black shrink-0">
                            EV
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {event.title}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500 truncate">
                              {event.date} • {event.location}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Events editor */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localEvents.find(e => e.id === selectedItemId) ? (
                      (() => {
                        const event = localEvents.find(e => e.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT UPCOMING EVENT
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gray-500">
                                  ID: {event.id}
                                </span>
                                <button
                                  onClick={() => handleSaveEventItem(event.id)}
                                  disabled={itemActionId === event.id}
                                  className="px-3 py-1.5 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {itemActionId === event.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  Save This Event
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Title</label>
                              <input
                                type="text"
                                value={event.title}
                                onChange={(e) => handleEventChange(event.id, 'title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Date</label>
                                <input
                                  type="text"
                                  value={event.date}
                                  onChange={(e) => handleEventChange(event.id, 'date', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Time</label>
                                <input
                                  type="text"
                                  value={event.time}
                                  onChange={(e) => handleEventChange(event.id, 'time', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Location</label>
                                <input
                                  type="text"
                                  value={event.location}
                                  onChange={(e) => handleEventChange(event.id, 'location', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
                                <select
                                  value={event.category}
                                  onChange={(e) => handleEventChange(event.id, 'category', e.target.value as any)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                                >
                                  <option value="Meeting">Meeting</option>
                                  <option value="Summit">Summit</option>
                                  <option value="Concert">Concert</option>
                                  <option value="Community">Community</option>
                                  <option value="Launch">Launch</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-jet-black/60 border border-gray-900 rounded p-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Ticket Price (leave 0 for free)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={event.price ?? 0}
                                  onChange={(e) => handleEventChange(event.id, 'price', Number(e.target.value))}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Currency</label>
                                <input
                                  type="text"
                                  placeholder="GHS"
                                  value={event.currency || ''}
                                  onChange={(e) => handleEventChange(event.id, 'currency', e.target.value.toUpperCase())}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="col-span-2 flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Payment Button Label
                                </label>
                                <input
                                  type="text"
                                  placeholder="Make Payments"
                                  value={event.payButtonText || ''}
                                  onChange={(e) => handleEventChange(event.id, 'payButtonText', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <p className="col-span-2 text-[9px] text-gray-500 leading-relaxed">
                                When a price is set, the public site and Member Portal show this button (default "Make Payments") followed by the price, opening Paystack checkout. Leave price at 0 for a free event — those automatically show a "Confirm Attendance" (Yes / No / Maybe) prompt instead, with responses tracked below.
                              </p>
                            </div>

                            {(!event.price || event.price <= 0) && (
                              <EventRsvpPanel eventId={event.id} />
                            )}

                            <ImageUpload
                              value={event.image}
                              onChange={(val) => handleEventChange(event.id, 'image', val)}
                              label="Event Banner / Cover Image"
                              description="Drag and drop or click to upload a banner image for this event."
                              aspectRatio="banner"
                            />

                            <div className="space-y-3">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Event Photos & Videos {event.media && event.media.length > 0 ? `(${event.media.length})` : ''}
                              </label>
                              <BulkMediaUpload onUploaded={(items) => handleEventMediaUpload(event.id, items)} />
                              {event.media && event.media.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                  {event.media.map((m) => (
                                    <div
                                      key={m.id}
                                      className="relative group aspect-square rounded overflow-hidden border border-gray-800 bg-black"
                                    >
                                      {m.isVideo ? (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Film className="w-4 h-4 text-luxury-gold" />
                                        </div>
                                      ) : (
                                        <img src={m.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEventMedia(event.id, m.id)}
                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                        title="Remove from this event's gallery"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-[9px] text-gray-500 font-sans">
                                Shown as a "View Gallery" lightbox on this event's public card, and merged into the Legacy Gallery tagged with this event.
                              </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                              <textarea
                                value={event.description}
                                onChange={(e) => handleEventChange(event.id, 'description', e.target.value)}
                                rows={4}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Calendar className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select an event card on the left side to edit details or log a new official upcoming event.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'hero' && (
                <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto">
                  <div className="bg-charcoal-card border border-gray-900 rounded-lg p-6 space-y-6">
                    <div>
                      <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1">
                        Hero Branding & Copy
                      </h4>
                      <p className="text-[10px] text-gray-500 font-sans">
                        Customize the main identity text, slogan, and mission statement displayed at the top of the portal.
                      </p>
                    </div>

                    {(() => {
                      const heroItem = localHero[0] || {
                        id: 'hero-config',
                        title: 'DE ELITES FAMILY',
                        slogan: 'ONE FAMILY. ONE MISSION. ONE LEGACY.',
                        description: 'We are a sovereign community of visionaries, creatives, and high-achievers. Born from the streets, refined by struggle, and unified by the spirit of loyalty. We exist to build power, empower the youth, and preserve an empire of absolute excellence.',
                        joinButtonText: 'Join the Movement',
                        exploreButtonText: 'Explore Our Legacy',
                        stat1Value: '10K+',
                        stat1Label: 'Global Members',
                        stat2Value: '15+',
                        stat2Label: 'Legacy Projects',
                        stat3Value: '100%',
                        stat3Label: 'Uncompromising Loyalty',
                      };

                      return (
                        <div className="space-y-4 text-xs">
                          {/* Logo Upload Field */}
                          <div className="bg-jet-black border border-gray-900 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full border border-luxury-gold bg-charcoal-card overflow-hidden flex items-center justify-center shrink-0">
                                {heroItem.logo ? (
                                  <img src={heroItem.logo} alt="Portal Logo" className="w-full h-full object-cover" />
                                ) : (
                                  <Flame className="w-8 h-8 text-luxury-gold" />
                                )}
                              </div>
                              <div>
                                <h5 className="font-display text-xs font-black text-white uppercase tracking-wider">
                                  PORTAL MAIN LOGO
                                </h5>
                                <p className="text-[10px] text-gray-500 max-w-sm">
                                  Upload a PNG or JPG file. It will replace the default flame icon in both the Navbar and Footer immediately.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <label className="px-3.5 py-2 bg-charcoal-card border border-gray-800 hover:border-luxury-gold rounded text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-white cursor-pointer transition-colors whitespace-nowrap">
                                Choose File
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        handleHeroChange('logo', reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {heroItem.logo && (
                                <button
                                  type="button"
                                  onClick={() => handleHeroChange('logo', '')}
                                  className="px-3 py-2 border border-red-900/30 bg-red-950/10 hover:bg-red-950/40 text-red-400 text-[10px] uppercase font-black tracking-widest rounded transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Remove Logo
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Main Title</label>
                              <input
                                type="text"
                                value={heroItem.title}
                                onChange={(e) => handleHeroChange('title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Slogan</label>
                              <input
                                type="text"
                                value={heroItem.slogan}
                                onChange={(e) => handleHeroChange('slogan', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Mission Description</label>
                            <textarea
                              value={heroItem.description}
                              onChange={(e) => handleHeroChange('description', e.target.value)}
                              rows={4}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-900">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Join CTA Button Text</label>
                              <input
                                type="text"
                                value={heroItem.joinButtonText}
                                onChange={(e) => handleHeroChange('joinButtonText', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Explore CTA Button Text</label>
                              <input
                                type="text"
                                value={heroItem.exploreButtonText}
                                onChange={(e) => handleHeroChange('exploreButtonText', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-gray-900">
                            <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-3">
                              Statistics Counters
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 1 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat1Value}
                                    onChange={(e) => handleHeroChange('stat1Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 1 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat1Label}
                                    onChange={(e) => handleHeroChange('stat1Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 2 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat2Value}
                                    onChange={(e) => handleHeroChange('stat2Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 2 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat2Label}
                                    onChange={(e) => handleHeroChange('stat2Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 3 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat3Value}
                                    onChange={(e) => handleHeroChange('stat3Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 3 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat3Label}
                                    onChange={(e) => handleHeroChange('stat3Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Registered users list card */}
                    <div className="col-span-1 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                      <div>
                        <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                          CMS Registered Users ({localUsers.length})
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          A listing of administrative staff currently authorized with secure workspace control.
                        </p>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {localUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 rounded bg-jet-black border border-gray-850 flex items-center justify-between gap-3 group hover:border-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded bg-luxury-gold/15 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold text-xs font-black shrink-0">
                                {user.role === 'admin' ? 'AD' : 'MD'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-display text-xs font-black uppercase text-white truncate">
                                  {user.username}
                                </h4>
                                <p className="font-sans text-[9px] text-gray-500 truncate capitalize">
                                  {user.role}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Provisioning form card */}
                    <div className="col-span-1 lg:col-span-2 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-6">
                      <div>
                        <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1">
                          PROVISION SECURE USER ACCOUNT
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          Grant editing clearance to moderators, chapters leads, or other elite administration.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Username / Alias</label>
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="e.g. moderator_accra"
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Access Password</label>
                            <input
                              type="text"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Choose secure password..."
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Authorization Clearance</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="moderator">Moderator (Full Content Editing Permissions)</option>
                            <option value="admin">Administrator (Full Content Editing + User Management)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newUsername.trim() || !newPassword.trim()) {
                              alert('Please provide both username and password.');
                              return;
                            }
                            if (localUsers.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
                              alert('This username is already taken.');
                              return;
                            }
                            const newUser: CmsUser = {
                              id: `user-${Date.now()}`,
                              username: newUsername.trim(),
                              password: newPassword.trim(),
                              role: newUserRole
                            };
                            setLocalUsers(prev => [...prev, newUser]);
                            setNewUsername('');
                            setNewPassword('');
                            setNewUserRole('moderator');
                            triggerNotification('User account created locally. Remember to click "Save User Section" below to persist changes to the server database.');
                          }}
                          className="px-5 py-3 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-colors cursor-pointer"
                        >
                          Add User Account
                        </button>
                      </div>

                      <div className="pt-6 border-t border-gray-900 flex items-center justify-between">
                        <p className="text-[9px] text-gray-500 font-sans max-w-sm">
                          * Changes made to registered accounts must be saved to the backend database to become live.
                        </p>
                        <button
                          type="button"
                          disabled={saveLoading}
                          onClick={() => handleSaveSection('users')}
                          className="px-5 py-3 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          {saveLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          Save User Section
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* APPLICATIONS MODULE VIEW */}
              {activeTab === 'applications' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Applications list card */}
                    <div className="col-span-1 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                      <div>
                        <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                          Prospective Members ({applications.length})
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          Submissions from the "Join the Movement" application form on the public site.
                        </p>
                      </div>

                      {applicationsLoading ? (
                        <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-luxury-gold/50" />
                          Loading applications...
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 text-xs">
                          <UserCheck className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                          No applications submitted yet.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {applications.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedItemId(app.id)}
                              className={`p-3 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                                selectedItemId === app.id
                                  ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                                  : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                                  {app.fullName}
                                </h4>
                                <p className="font-sans text-[9px] text-gray-500 truncate">
                                  {app.occupation} • {app.residence}
                                </p>
                                <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                  app.status === 'approved' ? 'bg-green-950/40 text-green-400' :
                                  app.status === 'rejected' ? 'bg-red-950/40 text-red-400' :
                                  'bg-gray-800 text-gray-400'
                                }`}>
                                  {app.status}
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteApplication(app.id);
                                }}
                                className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Application detail card */}
                    <div className="col-span-1 lg:col-span-2 bg-charcoal-card rounded-lg border border-gray-900 p-6">
                      {applicationsError && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mb-4">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{applicationsError}</span>
                        </div>
                      )}

                      {selectedItemId && applications.find(a => a.id === selectedItemId) ? (
                        (() => {
                          const app = applications.find(a => a.id === selectedItemId)!;
                          return (
                            <div className="space-y-5">
                              <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-2">
                                <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                  {app.fullName} {app.nickname && <span className="text-luxury-gold">"{app.nickname}"</span>}
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500">
                                  Submitted {new Date(app.submittedAt).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <DetailRow label="Date of Birth" value={app.dob} />
                                <DetailRow label="Gender" value={app.gender} />
                                <DetailRow label="Occupation" value={app.occupation} />
                                <DetailRow label="Residence" value={app.residence} />
                                <DetailRow label="Phone" value={app.phone} icon={<Phone className="w-3 h-3" />} />
                                <DetailRow label="Email" value={app.email} icon={<Mail className="w-3 h-3" />} />
                                {app.socialHandles && <DetailRow label="Socials" value={app.socialHandles} />}
                                {app.referrer && <DetailRow label="Referred By" value={app.referrer} />}
                                <DetailRow label="Prior Group Member" value={app.priorGroupMember ? (app.priorGroupDetail || 'Yes') : 'No'} />
                                <DetailRow label="Activity Level" value={app.activityLevel} />
                                <DetailRow label="Financial Support" value={app.willingToSupportFinancially ? 'Yes' : 'No'} />
                                <DetailRow label="Agrees to Rules" value={app.agreesToRulesAndDiscipline ? 'Yes' : 'No'} />
                              </div>

                              <div>
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                  Reason for Joining
                                </label>
                                <p className="text-xs text-gray-300 leading-relaxed bg-jet-black border border-gray-900 rounded p-3">
                                  {app.reasonForJoining}
                                </p>
                              </div>

                              {app.contributionAreas.length > 0 && (
                                <div>
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                    Contribution Areas
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {app.contributionAreas.map((area) => (
                                      <span key={area} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20">
                                        {area}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-4 border-t border-gray-900 flex flex-wrap items-center gap-2.5">
                                <button
                                  onClick={() => handleApplicationStatusChange(app.id, 'approved')}
                                  disabled={app.status === 'approved'}
                                  className="px-4 py-2 rounded bg-green-950/30 border border-green-900/40 text-green-400 hover:bg-green-950/50 font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApplicationStatusChange(app.id, 'rejected')}
                                  disabled={app.status === 'rejected'}
                                  className="px-4 py-2 rounded bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/50 font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                                {app.status !== 'pending' && (
                                  <button
                                    onClick={() => handleApplicationStatusChange(app.id, 'pending')}
                                    className="px-4 py-2 rounded bg-jet-black border border-gray-800 text-gray-400 hover:text-white font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer"
                                  >
                                    Reset to Pending
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-24 text-center text-gray-500 text-xs">
                          <UserCheck className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                          Select an application on the left side to review its details.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* MEMBER ACCOUNTS MODULE VIEW */}
              {activeTab === 'memberAccounts' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6">
                  {memberAccountsError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{memberAccountsError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Accounts list + creation form */}
                    <div className="col-span-1 space-y-6">
                      <div className="bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                        <div>
                          <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                            Member Accounts ({memberAccounts.length})
                          </h4>
                          <p className="text-[10px] text-gray-500 font-sans">
                            Portal logins for real family members — bio editing, welfare dues, and event payments.
                          </p>
                        </div>

                        {memberAccountsLoading ? (
                          <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-luxury-gold/50" />
                            Loading...
                          </div>
                        ) : memberAccounts.length === 0 ? (
                          <div className="py-12 text-center text-gray-500 text-xs">No member accounts yet.</div>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {memberAccounts.map((m) => (
                              <div
                                key={m.id}
                                onClick={() => setSelectedItemId(m.id)}
                                className={`p-3 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                                  selectedItemId === m.id
                                    ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                                    : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                                }`}
                              >
                                <div className="min-w-0">
                                  <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                                    {m.fullName}
                                  </h4>
                                  <p className="font-sans text-[9px] text-gray-500 truncate">{m.email}</p>
                                  {m.username ? (
                                    <p className="font-mono text-[9px] text-luxury-gold/70 truncate">@{m.username}</p>
                                  ) : (
                                    <p className="font-sans text-[9px] text-red-400/80 font-bold uppercase tracking-wide">No username — can't log in</p>
                                  )}
                                  <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                    m.status === 'active' ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
                                  }`}>
                                    {m.status}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMemberAccount(m.id);
                                  }}
                                  className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                        <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1 flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          New Member Account
                        </h4>
                        <form onSubmit={handleCreateMemberAccount} className="space-y-3">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <input
                            type="text"
                            autoCapitalize="none"
                            autoCorrect="off"
                            placeholder="Username (what they'll log in with)"
                            value={newMemberUsername}
                            onChange={(e) => setNewMemberUsername(e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <input
                            type="text"
                            placeholder="Temporary Password (min 8 chars)"
                            value={newMemberPassword}
                            onChange={(e) => setNewMemberPassword(e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <input
                            type="tel"
                            placeholder="Contact / Phone (optional)"
                            value={newMemberPhone}
                            onChange={(e) => setNewMemberPhone(e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Chapter (optional)"
                              value={newMemberChapter}
                              onChange={(e) => setNewMemberChapter(e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                            <input
                              type="text"
                              placeholder="Role (optional)"
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Monthly Welfare Dues (0 = none)"
                              value={newMemberDues}
                              onChange={(e) => setNewMemberDues(e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Executive Dues (blank = not exec)"
                              value={newMemberExecutiveDues}
                              onChange={(e) => setNewMemberExecutiveDues(e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                          <p className="text-[9px] text-gray-600 -mt-1">
                            Executive Dues is an extra recurring charge on top of Welfare Dues — only set it for members flagged as executives.
                          </p>
                          <button
                            type="submit"
                            className="w-full px-5 py-2.5 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-colors cursor-pointer"
                          >
                            Create Account
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Selected member detail: dues amount / status / password reset + history */}
                    <div className="col-span-1 lg:col-span-2 bg-charcoal-card rounded-lg border border-gray-900 p-6">
                      {selectedItemId && memberAccounts.find((m) => m.id === selectedItemId) ? (
                        (() => {
                          const m = memberAccounts.find((mm) => mm.id === selectedItemId)!;
                          return (
                            <div className="space-y-6">
                              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                                <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                  {m.fullName}
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500">{m.email}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Username (login)
                                  </label>
                                  <input
                                    type="text"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    placeholder={m.username ? '' : 'Not set — member cannot log in yet'}
                                    value={memberEditUsername}
                                    onChange={(e) => setMemberEditUsername(e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-luxury-gold" />
                                    Contact (Phone)
                                  </label>
                                  <input
                                    type="tel"
                                    placeholder="Not set"
                                    value={memberEditPhone}
                                    onChange={(e) => setMemberEditPhone(e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Monthly Welfare Dues ({m.currency})
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={memberEditDues}
                                    onChange={(e) => setMemberEditDues(e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                    <Crown className="w-3 h-3 text-luxury-gold" />
                                    Executive Dues ({m.currency})
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0 = not an executive"
                                    value={memberEditExecutiveDues}
                                    onChange={(e) => setMemberEditExecutiveDues(e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Status</label>
                                <select
                                  value={memberEditStatus}
                                  onChange={(e) => setMemberEditStatus(e.target.value as 'active' | 'suspended')}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer w-fit"
                                >
                                  <option value="active">Active</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Reset Password (leave blank to keep current)
                                </label>
                                <input
                                  type="text"
                                  placeholder="New temporary password"
                                  value={memberResetPassword}
                                  onChange={(e) => setMemberResetPassword(e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>

                              <button
                                onClick={() => handleSaveMemberEdits(m.id)}
                                className="px-5 py-2.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] hover:shadow-[0_2px_15px_rgba(212,175,55,0.4)] flex items-center gap-2 cursor-pointer w-fit"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Save Changes
                              </button>

                              {m.bio && (
                                <div className="pt-4 border-t border-gray-900">
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                    Member's Bio (self-edited)
                                  </label>
                                  <p className="text-xs text-gray-300 leading-relaxed bg-jet-black border border-gray-900 rounded p-3">{m.bio}</p>
                                </div>
                              )}

                              <div className="pt-4 border-t border-gray-900 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-luxury-gold" />
                                    Welfare Dues History
                                  </h4>
                                  {selectedMemberHistoryLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-luxury-gold/50" />
                                  ) : selectedMemberDues.length === 0 ? (
                                    <p className="text-[10px] text-gray-600">No dues payments yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                      {selectedMemberDues.map((d) => (
                                        <div key={d.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded px-2.5 py-2 text-[10px]">
                                          <span className="text-gray-300">{d.period}</span>
                                          <span className={`font-black uppercase tracking-wider ${
                                            d.status === 'success' ? 'text-green-400' : d.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                                          }`}>
                                            {d.currency} {d.amount.toFixed(2)} · {d.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                                    <Ticket className="w-3.5 h-3.5 text-luxury-gold" />
                                    Event Payment History
                                  </h4>
                                  {selectedMemberHistoryLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-luxury-gold/50" />
                                  ) : selectedMemberEventPayments.length === 0 ? (
                                    <p className="text-[10px] text-gray-600">No event payments yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                      {selectedMemberEventPayments.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded px-2.5 py-2 text-[10px] gap-2">
                                          <span className="text-gray-300 truncate">{p.eventTitle}</span>
                                          <span className={`font-black uppercase tracking-wider shrink-0 ${
                                            p.status === 'success' ? 'text-green-400' : p.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                                          }`}>
                                            {p.currency} {p.amount.toFixed(2)} · {p.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-gray-900 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                                    <Crown className="w-3.5 h-3.5 text-luxury-gold" />
                                    Executive Dues History
                                  </h4>
                                  {selectedMemberHistoryLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-luxury-gold/50" />
                                  ) : Number(m.executiveDuesAmount) <= 0 ? (
                                    <p className="text-[10px] text-gray-600">Not flagged as an executive.</p>
                                  ) : selectedMemberExecutiveDues.length === 0 ? (
                                    <p className="text-[10px] text-gray-600">No executive dues payments yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                      {selectedMemberExecutiveDues.map((d) => (
                                        <div key={d.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded px-2.5 py-2 text-[10px]">
                                          <span className="text-gray-300">{d.period}</span>
                                          <span className={`font-black uppercase tracking-wider ${
                                            d.status === 'success' ? 'text-green-400' : d.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                                          }`}>
                                            {d.currency} {d.amount.toFixed(2)} · {d.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-luxury-gold" />
                                    One-off Bills
                                  </h4>
                                  {selectedMemberHistoryLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-luxury-gold/50" />
                                  ) : selectedMemberBills.length === 0 ? (
                                    <p className="text-[10px] text-gray-600">No bills issued yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                      {selectedMemberBills.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded px-2.5 py-2 text-[10px] gap-2">
                                          <span className="text-gray-300 truncate">{b.label}</span>
                                          <span className="flex items-center gap-1.5 shrink-0">
                                            <span className={`font-black uppercase tracking-wider ${
                                              b.status === 'success' ? 'text-green-400' : b.status === 'failed' ? 'text-red-400' : 'text-gray-500'
                                            }`}>
                                              {b.currency} {b.amount.toFixed(2)} · {b.status}
                                            </span>
                                            {b.status !== 'success' && (
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    const updated = await updateBill(b.id, { markPaidChannel: 'cash' });
                                                    setSelectedMemberBills((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                                                    triggerNotification('Bill marked as paid.');
                                                  } catch (err: any) {
                                                    setMemberAccountsError(err.message || 'Failed to update bill');
                                                  }
                                                }}
                                                className="text-luxury-gold hover:text-white transition-colors cursor-pointer"
                                                title="Mark paid manually (cash)"
                                              >
                                                <Check className="w-3 h-3" />
                                              </button>
                                            )}
                                            <button
                                              onClick={async () => {
                                                if (!window.confirm(`Delete this bill (${b.label})? This cannot be undone.`)) return;
                                                try {
                                                  await deleteBill(b.id);
                                                  setSelectedMemberBills((prev) => prev.filter((x) => x.id !== b.id));
                                                } catch (err: any) {
                                                  setMemberAccountsError(err.message || 'Failed to delete bill');
                                                }
                                              }}
                                              className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-24 text-center text-gray-500 text-xs">
                          <UserCheck className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                          Select a member account on the left to view or edit details, or create a new one.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* PAYMENTS RECONCILIATION MODULE VIEW */}
              {activeTab === 'payments' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6">
                  {paymentsError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{paymentsError}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                        Payments ({filteredPayments.length}{filteredPayments.length !== payments.length ? ` of ${payments.length}` : ''})
                      </h4>
                      <p className="text-[10px] text-gray-500 font-sans">
                        Every welfare dues, executive dues, event, and one-off bill payment across every member, newest first — for reconciling who paid what (including partial dues payments).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (showBillForm) {
                            setShowBillForm(false);
                          } else {
                            setBillLabel(''); setBillAmount(''); setBillCurrency(''); setBillRecipientIds(new Set()); setBillFormError('');
                            setShowBillForm(true);
                          }
                        }}
                        className="px-4 py-2 rounded border border-luxury-gold/40 text-luxury-gold hover:bg-luxury-gold/10 font-sans font-black tracking-widest text-[10px] uppercase transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {showBillForm ? 'Cancel' : 'Create One-off Bill'}
                      </button>
                      <button
                        onClick={() => {
                          if (showManualPaymentForm) {
                            setShowManualPaymentForm(false);
                          } else {
                            resetManualPaymentForm();
                            setShowManualPaymentForm(true);
                          }
                        }}
                        className="px-4 py-2 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {showManualPaymentForm ? 'Cancel' : 'Log Manual Payment'}
                      </button>
                    </div>
                  </div>

                  {/* Create one-off bill — a non-recurring charge for a single
                      member or a bulk group; stays unpaid until they pay it
                      themselves from the portal (or it's marked paid manually
                      from their detail panel in Member Accounts). */}
                  {showBillForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBillFormError('');
                        if (!billLabel.trim()) { setBillFormError('Enter a label for this bill.'); return; }
                        const amountNum = Number(billAmount);
                        if (!Number.isFinite(amountNum) || amountNum <= 0) { setBillFormError('Enter a valid amount greater than zero.'); return; }
                        if (billRecipientIds.size === 0) { setBillFormError('Select at least one member.'); return; }
                        setBillSubmitting(true);
                        try {
                          await createBill({
                            memberIds: Array.from(billRecipientIds),
                            label: billLabel.trim(),
                            amount: amountNum,
                            currency: billCurrency || undefined,
                          });
                          const refreshed = await fetchAllPaymentsAdmin();
                          setPayments(refreshed);
                          triggerNotification(`Bill "${billLabel.trim()}" created for ${billRecipientIds.size} member${billRecipientIds.size === 1 ? '' : 's'}.`);
                          setBillLabel(''); setBillAmount(''); setBillCurrency(''); setBillRecipientIds(new Set());
                          setShowBillForm(false);
                        } catch (err: any) {
                          setBillFormError(err.message || 'Failed to create bill.');
                        } finally {
                          setBillSubmitting(false);
                        }
                      }}
                      className="bg-charcoal-card rounded-lg border border-luxury-gold/20 p-5 space-y-4"
                    >
                      <h5 className="font-display text-xs font-black text-white uppercase tracking-widest">
                        Create One-off Bill
                      </h5>
                      <p className="text-[10px] text-gray-500 -mt-2">
                        A non-recurring charge — e.g. an anniversary levy or a fine. It stays unpaid until the member(s) pay it from their own portal.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Label</label>
                          <input
                            type="text"
                            placeholder="e.g. 10th Anniversary Levy"
                            value={billLabel}
                            onChange={(e) => setBillLabel(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                          />
                        </div>
                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Amount</label>
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            placeholder="0.00"
                            value={billAmount}
                            onChange={(e) => setBillAmount(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                          />
                        </div>
                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Currency</label>
                          <input
                            type="text"
                            placeholder="GHS"
                            value={billCurrency}
                            onChange={(e) => setBillCurrency(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500">
                            Bill Recipients ({billRecipientIds.size} selected)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (billRecipientIds.size === memberAccounts.length) {
                                setBillRecipientIds(new Set());
                              } else {
                                setBillRecipientIds(new Set(memberAccounts.map((m) => m.id)));
                              }
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-luxury-gold hover:text-white transition-colors cursor-pointer"
                          >
                            {billRecipientIds.size === memberAccounts.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto bg-jet-black border border-gray-800 rounded p-2 space-y-1">
                          {memberAccounts.length === 0 ? (
                            <p className="text-[10px] text-gray-600 px-1 py-1">No member accounts yet.</p>
                          ) : (
                            memberAccounts.map((m) => (
                              <label
                                key={m.id}
                                className="flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-charcoal-card cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={billRecipientIds.has(m.id)}
                                  onChange={() => {
                                    setBillRecipientIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                                      return next;
                                    });
                                  }}
                                  className="accent-luxury-gold cursor-pointer"
                                />
                                <span className="text-gray-300">{m.fullName}</span>
                                <span className="text-gray-600 text-[10px]">({m.email})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      {billFormError && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{billFormError}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={billSubmitting}
                          className="px-5 py-2.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                          {billSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Create Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBillForm(false)}
                          className="px-4 py-2.5 rounded border border-gray-800 text-gray-400 hover:text-white font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Manual payment entry — for cash, bank transfer, or any
                      payment collected outside Paystack */}
                  {showManualPaymentForm && (
                    <form onSubmit={handleCreateManualPayment} className="bg-charcoal-card rounded-lg border border-luxury-gold/20 p-5 space-y-4">
                      <h5 className="font-display text-xs font-black text-white uppercase tracking-widest">
                        Log Manual Payment
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Member</label>
                          <select
                            value={manualMemberId}
                            onChange={(e) => handleManualMemberChange(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="">Select a member...</option>
                            {memberAccounts.map((m) => (
                              <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Type</label>
                          <select
                            value={manualType}
                            onChange={(e) => setManualType(e.target.value as 'dues' | 'event' | 'executive-dues')}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="dues">Welfare Dues</option>
                            <option value="executive-dues">Executive Dues</option>
                            <option value="event">Event Registration</option>
                          </select>
                        </div>

                        {(manualType === 'dues' || manualType === 'executive-dues') ? (
                          <div>
                            <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Period</label>
                            <input
                              type="month"
                              value={manualPeriod}
                              onChange={(e) => setManualPeriod(e.target.value)}
                              className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                        ) : (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Event</label>
                              <select
                                value={manualEventId}
                                onChange={(e) => handleManualEventChange(e.target.value)}
                                className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                              >
                                <option value="">— Custom / past event (type title) —</option>
                                {events.map((ev) => (
                                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                                ))}
                              </select>
                            </div>
                            {!manualEventId && (
                              <div>
                                <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Event Title</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Founders Gala 2025"
                                  value={manualEventTitle}
                                  onChange={(e) => setManualEventTitle(e.target.value)}
                                  className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Amount</label>
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            placeholder="0.00"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                          />
                        </div>

                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Currency</label>
                          <input
                            type="text"
                            placeholder="GHS"
                            value={manualCurrency}
                            onChange={(e) => setManualCurrency(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                          />
                        </div>

                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Channel</label>
                          <select
                            value={manualChannel}
                            onChange={(e) => setManualChannel(e.target.value)}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="card">Card</option>
                            <option value="other">Other...</option>
                          </select>
                        </div>

                        {manualChannel === 'other' && (
                          <div>
                            <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Specify Channel</label>
                            <input
                              type="text"
                              placeholder="e.g. money order"
                              value={manualChannelOther}
                              onChange={(e) => setManualChannelOther(e.target.value)}
                              className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                        )}

                        <div>
                          <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Status</label>
                          <select
                            value={manualStatus}
                            onChange={(e) => setManualStatus(e.target.value as 'pending' | 'success' | 'failed')}
                            className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="success">Success (already collected)</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
                      </div>

                      {manualFormError && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{manualFormError}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={manualSubmitting}
                          className="px-5 py-2.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                          {manualSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualPaymentForm(false)}
                          className="px-4 py-2.5 rounded border border-gray-800 text-gray-400 hover:text-white font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filters + export */}
                  <div className="bg-charcoal-card rounded-lg border border-gray-900 p-4 flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Search</label>
                      <input
                        type="text"
                        placeholder="Member name, email, period, event..."
                        value={paymentsSearch}
                        onChange={(e) => setPaymentsSearch(e.target.value)}
                        className="w-full bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Type</label>
                      <select
                        value={paymentsTypeFilter}
                        onChange={(e) => setPaymentsTypeFilter(e.target.value as 'all' | 'dues' | 'event' | 'executive-dues' | 'bill')}
                        className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                      >
                        <option value="all">All</option>
                        <option value="dues">Welfare Dues</option>
                        <option value="executive-dues">Executive Dues</option>
                        <option value="event">Events</option>
                        <option value="bill">One-off Bills</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Status</label>
                      <select
                        value={paymentsStatusFilter}
                        onChange={(e) => setPaymentsStatusFilter(e.target.value as 'all' | 'success' | 'pending' | 'failed')}
                        className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                      >
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <button
                      onClick={handleExportPaymentsCsv}
                      disabled={filteredPayments.length === 0}
                      className="px-4 py-2 rounded bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV
                    </button>
                  </div>

                  {/* Totals */}
                  {paymentsTotalsByCurrency.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {paymentsTotalsByCurrency.map((entry) => (
                        <span
                          key={entry.currency}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-950/20 border border-green-900/40 text-green-400 text-[10px] font-mono font-bold"
                        >
                          Collected: {entry.currency} {entry.total.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Table */}
                  {paymentsLoading ? (
                    <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-luxury-gold/50" />
                      Loading payments...
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 text-xs">
                      {payments.length === 0 ? 'No payments recorded yet.' : 'No payments match the current filters.'}
                    </div>
                  ) : (
                    <div className="bg-charcoal-card rounded-lg border border-gray-900 overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[820px]">
                        <thead>
                          <tr className="border-b border-gray-900 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Member</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">Channel</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((p) => (
                            <tr key={`${p.type}-${p.id}`} className="border-b border-gray-900/60 hover:bg-jet-black/60 transition-colors">
                              <td className="px-4 py-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 min-w-0">
                                <span className="font-sans font-bold text-white block truncate max-w-[160px]">{p.memberName}</span>
                                <span className="font-sans text-[10px] text-gray-500 block truncate max-w-[160px]">{p.memberEmail}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                                  p.type === 'dues' ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/20'
                                  : p.type === 'executive-dues' ? 'bg-purple-950/30 text-purple-400 border-purple-900/40'
                                  : p.type === 'bill' ? 'bg-orange-950/30 text-orange-400 border-orange-900/40'
                                  : 'bg-blue-950/30 text-blue-400 border-blue-900/40'
                                }`}>
                                  {p.type === 'executive-dues' ? 'exec dues' : p.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-300 max-w-[180px] truncate">
                                {(p.type === 'dues' || p.type === 'executive-dues') ? formatPeriodLabel(p.label) : p.label}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-[10px]">{formatChannel(p.channel)}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-200 whitespace-nowrap">
                                {p.currency} {p.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${statusBadgeClass(p.status)}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p)}
                                  className="inline-flex items-center justify-center p-1.5 rounded border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/20 transition-colors"
                                  title="Delete payment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>

        </div>

      </motion.div>

    </div>
  );
}

// Read-only attendee list for a free event's RSVPs (Yes/No/Maybe), fetched
// fresh whenever the admin has this event's edit panel open. Kept as its
// own component (rather than inline state on CmsDashboard) so it can fetch
// per-event without complicating the shared events editor state.
function EventRsvpPanel({ eventId }: { eventId: string }) {
  const [rsvps, setRsvps] = useState<AdminEventRsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEventRsvpsAdmin(eventId)
      .then((data) => { if (!cancelled) setRsvps(data); })
      .catch((err: any) => { if (!cancelled) setError(err.message || 'Failed to load RSVPs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  const counts = { yes: 0, maybe: 0, no: 0 };
  rsvps.forEach((r) => { counts[r.response as 'yes' | 'maybe' | 'no']++; });

  return (
    <div className="bg-jet-black/60 border border-gray-900 rounded p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
          RSVP Responses ({rsvps.length})
        </label>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-green-400">{counts.yes} yes</span>
          <span className="text-yellow-400">{counts.maybe} maybe</span>
          <span className="text-red-400">{counts.no} no</span>
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-luxury-gold/50" />
      ) : error ? (
        <p className="text-[10px] text-red-400">{error}</p>
      ) : rsvps.length === 0 ? (
        <p className="text-[10px] text-gray-600">No RSVPs yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {rsvps.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-charcoal-card border border-gray-900 rounded px-2.5 py-2 text-[10px]">
              <span className="text-gray-300 truncate">{r.memberName}</span>
              <span className={`font-black uppercase tracking-wider shrink-0 ${
                r.response === 'yes' ? 'text-green-400' : r.response === 'no' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {r.response}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <span className="text-gray-300 flex items-center gap-1.5 break-words">
        {icon && <span className="text-luxury-gold shrink-0">{icon}</span>}
        {value}
      </span>
    </div>
  );
}
