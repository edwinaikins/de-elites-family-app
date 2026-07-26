import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, LogIn, LogOut, Crown, User, Wallet, Ticket, AlertCircle,
  CheckCircle2, Loader2, Save, KeyRound, Calendar, MapPin, Clock,
  CreditCard, ArrowUpRight,
} from 'lucide-react';
import { useMemberAuth } from '../context/MemberAuthContext';
import { useCms } from '../context/CmsContext';
import { useEventPayments } from '../hooks/useEventPayments';
import { usePaymentsConfig } from '../hooks/usePaymentsConfig';
import {
  fetchMyDuesHistory, fetchMyEventPayments, initializeDuesPayment,
  verifyPayment, changeMyPassword,
} from '../lib/memberClient';
import { payWithPaystack } from '../lib/paystack';
import { WelfareDuesPayment, EventPayment } from '../types';
import { ImageUpload } from './ImageUpload';

type PortalTab = 'profile' | 'dues' | 'events';

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

export default function MemberPortalModal() {
  const { member, token, loading, isPortalOpen, closePortal, login, logout, updateBio } = useMemberAuth();
  const { events } = useCms();
  const { paidEventIds, payingId, errorById, payForEvent } = useEventPayments();
  const { mock: mockPayments } = usePaymentsConfig();

  const [activeTab, setActiveTab] = useState<PortalTab>('profile');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Profile/bio editor state
  const [bioDraft, setBioDraft] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  // Profile picture upload state
  const [imageSaving, setImageSaving] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const [imageError, setImageError] = useState('');

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Dues state
  const [duesHistory, setDuesHistory] = useState<WelfareDuesPayment[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesPaying, setDuesPaying] = useState(false);
  const [duesError, setDuesError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod());

  // Event payments state
  const [eventPayments, setEventPayments] = useState<EventPayment[]>([]);
  const [eventPaymentsLoading, setEventPaymentsLoading] = useState(false);

  useEffect(() => {
    if (member) setBioDraft(member.bio || '');
  }, [member?.id]);

  useEffect(() => {
    if (!isPortalOpen || !member || !token) return;
    if (activeTab === 'dues') {
      setDuesLoading(true);
      fetchMyDuesHistory(token)
        .then(setDuesHistory)
        .catch((err) => setDuesError(err.message || 'Failed to load dues history'))
        .finally(() => setDuesLoading(false));
    } else if (activeTab === 'events') {
      setEventPaymentsLoading(true);
      fetchMyEventPayments(token)
        .then(setEventPayments)
        .catch(() => {})
        .finally(() => setEventPaymentsLoading(false));
    }
  }, [isPortalOpen, activeTab, member, token]);

  if (!isPortalOpen) return null;

  const handleClose = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
    setImageError('');
    setActiveTab('profile');
    closePortal();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both your email and password.');
      return;
    }
    setLoginSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleSaveBio = async () => {
    setBioSaving(true);
    setBioSaved(false);
    try {
      await updateBio({ bio: bioDraft });
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 3000);
    } catch (err) {
      // swallow — updateBio already leaves prior state intact on failure
    } finally {
      setBioSaving(false);
    }
  };

  const handleImageChange = async (base64: string) => {
    setImageError('');
    setImageSaving(true);
    setImageSaved(false);
    try {
      await updateBio({ image: base64 });
      setImageSaved(true);
      setTimeout(() => setImageSaved(false), 3000);
    } catch (err: any) {
      setImageError(err.message || 'Failed to update your photo.');
    } finally {
      setImageSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (!token) return;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      setPasswordError('Please enter your current password and a new password of at least 8 characters.');
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changeMyPassword(token, currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handlePayDues = async () => {
    if (!token) return;
    setDuesError('');
    setDuesPaying(true);
    try {
      const init = await initializeDuesPayment(token, selectedPeriod);
      const { reference } = await payWithPaystack({
        publicKey: init.publicKey,
        email: init.email,
        amount: init.amount,
        currency: init.currency,
        reference: init.reference,
        metadata: { type: 'dues', period: selectedPeriod },
      });
      await verifyPayment(token, reference);
      const refreshed = await fetchMyDuesHistory(token);
      setDuesHistory(refreshed);
    } catch (err: any) {
      setDuesError(err.message || 'Payment could not be completed.');
    } finally {
      setDuesPaying(false);
    }
  };

  const alreadyPaidForSelectedPeriod = duesHistory.some((d) => d.period === selectedPeriod && d.status === 'success');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-charcoal-card border border-luxury-gold/40 max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] rounded-lg overflow-y-auto overscroll-contain relative shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-luxury-gold p-2 transition-colors cursor-pointer z-20 bg-black/60 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          {loading ? (
            <div className="py-24 flex flex-col items-center gap-3 text-gray-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-luxury-gold/60" />
              Loading your portal...
            </div>
          ) : !member ? (
            // --- LOGIN VIEW ---
            <div className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full border border-luxury-gold flex items-center justify-center bg-jet-black mx-auto mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                  <Crown className="w-8 h-8 text-luxury-gold animate-pulse" />
                </div>
                <h2 className="font-display text-xl font-black text-white uppercase tracking-wider">
                  Member Portal
                </h2>
                <p className="font-sans text-[9px] text-luxury-gold uppercase tracking-[0.2em] mt-1 font-bold">
                  De Elites Family
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold placeholder:text-gray-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
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
                  disabled={loginSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loginSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Sign In
                </button>
              </form>

              <p className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-wider font-semibold leading-relaxed">
                Don't have portal access yet? Ask a family administrator to set up your account.
              </p>
            </div>
          ) : (
            // --- DASHBOARD VIEW ---
            <div>
              <div className="p-6 sm:p-8 pb-4 border-b border-gray-900/80 sticky top-0 bg-charcoal-card z-10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {member.image ? (
                        <img src={member.image} alt={member.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-luxury-gold" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-black text-white uppercase tracking-wide truncate">
                        {member.fullName}
                      </h2>
                      <p className="font-sans text-[10px] text-gray-500 truncate">
                        {member.role || 'Member'} {member.chapter ? `• ${member.chapter}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="shrink-0 px-3 py-1.8 rounded border border-gray-800 bg-jet-black hover:bg-gray-900 text-gray-400 hover:text-white font-sans font-bold tracking-wider text-[10px] uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-luxury-gold" />
                    Logout
                  </button>
                </div>

                {mockPayments && (
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                      Test Mode — payments are simulated
                    </span>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mt-5">
                  {[
                    { key: 'profile' as const, label: 'Profile', icon: User },
                    { key: 'dues' as const, label: 'Welfare Dues', icon: Wallet },
                    { key: 'events' as const, label: 'Events', icon: Ticket },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                        activeTab === tab.key
                          ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                          : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-900/40'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1.5">
                      <ImageUpload
                        value={member.image || ''}
                        onChange={handleImageChange}
                        label="Profile Picture"
                        description="PNG, JPG or WEBP up to 5MB. Visible to the whole family."
                        aspectRatio="avatar"
                      />
                      <div className="flex items-center justify-end min-h-[14px]">
                        {imageSaving && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 font-bold uppercase tracking-wider">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving
                          </span>
                        )}
                        {imageSaved && (
                          <span className="text-[10px] text-green-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </div>
                      {imageError && (
                        <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{imageError}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Your Bio
                      </label>
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        rows={5}
                        maxLength={500}
                        placeholder="Tell the family a bit about yourself..."
                        className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-700 resize-none"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-[9px] text-gray-600">{bioDraft.length}/500</span>
                        {bioSaved && (
                          <span className="text-[10px] text-green-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveBio}
                      disabled={bioSaving}
                      className="px-5 py-2.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] hover:shadow-[0_2px_15px_rgba(212,175,55,0.4)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {bioSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Bio
                    </button>

                    <div className="pt-6 border-t border-gray-900">
                      <button
                        onClick={() => setShowPasswordForm((v) => !v)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-luxury-gold transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {showPasswordForm ? 'Hide password form' : 'Change password'}
                      </button>

                      {showPasswordForm && (
                        <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-sm">
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Current password"
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min 8 characters)"
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold w-full"
                          />
                          {passwordError && (
                            <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{passwordError}</span>
                            </div>
                          )}
                          {passwordSuccess && (
                            <div className="flex items-center gap-2 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 p-2.5 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Password updated.</span>
                            </div>
                          )}
                          <button
                            type="submit"
                            disabled={passwordSubmitting}
                            className="px-4 py-2 rounded bg-jet-black border border-gray-800 hover:border-luxury-gold/50 text-white hover:text-luxury-gold font-sans font-black tracking-widest text-[10px] uppercase transition-all cursor-pointer disabled:opacity-50"
                          >
                            {passwordSubmitting ? 'Updating...' : 'Update Password'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'dues' && (
                  <div className="space-y-6">
                    <div className="bg-jet-black border border-gray-900 rounded-lg p-5">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <span className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">
                            Monthly Welfare Dues
                          </span>
                          <span className="font-display text-2xl font-black text-luxury-gold">
                            {member.duesAmount > 0 ? `${member.currency} ${member.duesAmount.toFixed(2)}` : 'Not configured'}
                          </span>
                        </div>
                        {member.duesAmount > 0 && (
                          <div className="flex items-center gap-2">
                            <input
                              type="month"
                              value={selectedPeriod}
                              onChange={(e) => setSelectedPeriod(e.target.value)}
                              className="bg-charcoal-card border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                            <button
                              onClick={handlePayDues}
                              disabled={duesPaying || alreadyPaidForSelectedPeriod}
                              className="px-4 py-2 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              {duesPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                              {alreadyPaidForSelectedPeriod ? 'Paid' : `Pay for ${formatPeriodLabel(selectedPeriod)}`}
                            </button>
                          </div>
                        )}
                      </div>
                      {duesError && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mt-4">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{duesError}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        Payment History
                      </h4>
                      {duesLoading ? (
                        <div className="py-10 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-luxury-gold/50" />
                          Loading...
                        </div>
                      ) : duesHistory.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 text-xs">No dues payments yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {duesHistory.map((d) => (
                            <div key={d.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded p-3">
                              <div>
                                <span className="font-sans text-xs font-bold text-white block">{formatPeriodLabel(d.period)}</span>
                                <span className="font-mono text-[10px] text-gray-500">{d.currency} {d.amount.toFixed(2)}</span>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${statusBadgeClass(d.status)}`}>
                                {d.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'events' && (
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        Upcoming Events
                      </h4>
                      {events && events.length > 0 ? (
                        <div className="space-y-3">
                          {events.map((event) => (
                            <div key={event.id} className="bg-jet-black border border-gray-900 rounded-lg p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h5 className="font-sans text-sm font-black text-white truncate">{event.title}</h5>
                                  <div className="mt-1.5 space-y-1 text-[10px] text-gray-500 font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3 text-luxury-gold/70 shrink-0" />
                                      <span>{event.date}</span>
                                      {event.time && (
                                        <>
                                          <Clock className="w-3 h-3 text-luxury-gold/70 shrink-0 ml-2" />
                                          <span>{event.time}</span>
                                        </>
                                      )}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-luxury-gold/70 shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {errorById[event.id] && (
                                <div className="flex items-center gap-1.5 text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded mt-3">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{errorById[event.id]}</span>
                                </div>
                              )}

                              <div className="mt-3">
                                {event.price && event.price > 0 ? (
                                  paidEventIds.has(event.id) ? (
                                    <div className="w-full py-2.5 rounded bg-green-950/20 border border-green-900/40 text-green-400 font-sans font-black tracking-widest text-[10px] uppercase flex items-center justify-center gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Registered
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => payForEvent(event.id)}
                                      disabled={payingId === event.id}
                                      className="w-full py-2.5 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                      {payingId === event.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                      Pay &amp; Register — {event.currency || 'GHS'} {event.price.toFixed(2)}
                                    </button>
                                  )
                                ) : event.buttonLink ? (
                                  <a
                                    href={event.buttonLink}
                                    target={event.buttonLink.startsWith('#') ? undefined : '_blank'}
                                    rel={event.buttonLink.startsWith('#') ? undefined : 'noopener noreferrer'}
                                    className="w-full py-2.5 rounded bg-charcoal-card border border-gray-800 hover:border-luxury-gold text-white hover:text-luxury-gold font-sans font-black tracking-widest text-[10px] uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                                  >
                                    {event.buttonText || 'Register'}
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center text-gray-500 text-xs flex flex-col items-center gap-2 bg-jet-black border border-gray-900 rounded-lg">
                          <Calendar className="w-8 h-8 text-luxury-gold/25" />
                          No upcoming events scheduled right now.
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        Your Paid Event Registrations
                      </h4>
                      {eventPaymentsLoading ? (
                        <div className="py-10 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-luxury-gold/50" />
                          Loading...
                        </div>
                      ) : eventPayments.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                          <Calendar className="w-8 h-8 text-luxury-gold/25" />
                          No paid event registrations yet. Pay for a paid event above to see it here.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {eventPayments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between bg-jet-black border border-gray-900 rounded p-3">
                              <div className="min-w-0">
                                <span className="font-sans text-xs font-bold text-white block truncate">{p.eventTitle}</span>
                                <span className="font-mono text-[10px] text-gray-500">{p.currency} {p.amount.toFixed(2)}</span>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ml-3 ${statusBadgeClass(p.status)}`}>
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
