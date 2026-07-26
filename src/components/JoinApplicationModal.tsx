import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitMemberApplication } from '../lib/cmsClient';
import { MemberApplication } from '../types';

interface JoinApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTRIBUTION_AREAS = [
  'Welfare & Support',
  'Event Planning',
  'Charity & Volunteering',
  'Sports & Games',
  'Media & Public Relations',
  'Fundraising & Business',
  'Administration',
];

const ACTIVITY_LEVELS: MemberApplication['activityLevel'][] = [
  'Very Active',
  'Moderately Active',
  'Occasionally Active',
];

const initialFormState = {
  fullName: '',
  nickname: '',
  dob: '',
  gender: '',
  occupation: '',
  residence: '',
  phone: '',
  email: '',
  socialHandles: '',
  referrer: '',
  priorGroupMember: false,
  priorGroupDetail: '',
  reasonForJoining: '',
  contributionAreas: [] as string[],
  activityLevel: '' as MemberApplication['activityLevel'] | '',
  willingToSupportFinancially: undefined as boolean | undefined,
  agreesToRulesAndDiscipline: undefined as boolean | undefined,
};

export default function JoinApplicationModal({ isOpen, onClose }: JoinApplicationModalProps) {
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetAndClose = () => {
    setForm(initialFormState);
    setError('');
    setSuccess(false);
    onClose();
  };

  const toggleContributionArea = (area: string) => {
    setForm((prev) => ({
      ...prev,
      contributionAreas: prev.contributionAreas.includes(area)
        ? prev.contributionAreas.filter((a) => a !== area)
        : [...prev.contributionAreas, area],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !form.fullName.trim() ||
      !form.dob.trim() ||
      !form.gender.trim() ||
      !form.occupation.trim() ||
      !form.residence.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {
      setError('Please complete all required fields in Section A.');
      return;
    }

    if (!form.reasonForJoining.trim()) {
      setError('Please tell us why you want to join in Section B.');
      return;
    }

    if (!form.activityLevel) {
      setError('Please select your intended activity level in Section B.');
      return;
    }

    if (form.willingToSupportFinancially === undefined || form.agreesToRulesAndDiscipline === undefined) {
      setError('Please answer both commitment questions in Section C.');
      return;
    }

    setSubmitting(true);
    try {
      await submitMemberApplication({
        fullName: form.fullName.trim(),
        nickname: form.nickname.trim() || undefined,
        dob: form.dob,
        gender: form.gender,
        occupation: form.occupation.trim(),
        residence: form.residence.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        socialHandles: form.socialHandles.trim() || undefined,
        referrer: form.referrer.trim() || undefined,
        priorGroupMember: form.priorGroupMember,
        priorGroupDetail: form.priorGroupMember ? form.priorGroupDetail.trim() || undefined : undefined,
        reasonForJoining: form.reasonForJoining.trim(),
        contributionAreas: form.contributionAreas,
        activityLevel: form.activityLevel as MemberApplication['activityLevel'],
        willingToSupportFinancially: form.willingToSupportFinancially,
        agreesToRulesAndDiscipline: form.agreesToRulesAndDiscipline,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      setError(err.message || 'Something went wrong submitting your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-charcoal-card border border-luxury-gold/40 max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] rounded-lg overflow-y-auto overscroll-contain relative shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            {/* Close */}
            <button
              onClick={resetAndClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-luxury-gold p-2 transition-colors cursor-pointer z-20 bg-black/60 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="p-6 sm:p-8 pb-4 border-b border-gray-900/80 sticky top-0 bg-charcoal-card z-10">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-luxury-gold" />
                <span className="font-sans text-[10px] font-black uppercase tracking-[0.25em] text-luxury-gold">
                  De Elites Family
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Prospective Member Application Form
              </h2>
              <p className="font-sans text-xs text-gray-500 mt-1">(To be completed online)</p>
            </div>

            {success ? (
              <div className="p-8 sm:p-10 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-luxury-gold" />
                </div>
                <h3 className="font-display text-xl font-black text-white uppercase tracking-wide">
                  Application Received
                </h3>
                <p className="font-sans text-sm text-gray-400 max-w-sm leading-relaxed">
                  Thank you for applying to join De Elites Family. Our leadership team will review your submission and reach out via the contact details you provided.
                </p>
                <button
                  onClick={resetAndClose}
                  className="mt-2 px-6 py-2.5 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-6 space-y-10">

                {/* Section A */}
                <div>
                  <h3 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1 border-l-2 border-luxury-gold pl-3">
                    Section A: Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                    <Field label="Full Name" required className="sm:col-span-2">
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Nickname (if any)">
                      <input
                        type="text"
                        value={form.nickname}
                        onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Date of Birth" required>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setForm({ ...form, dob: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Gender" required>
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </Field>

                    <Field label="Occupation / Profession" required>
                      <input
                        type="text"
                        value={form.occupation}
                        onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Place of Residence" required>
                      <input
                        type="text"
                        value={form.residence}
                        onChange={(e) => setForm({ ...form, residence: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Phone Number" required>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Email" required>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Social Media Handles (Optional)" className="sm:col-span-2">
                      <input
                        type="text"
                        value={form.socialHandles}
                        onChange={(e) => setForm({ ...form, socialHandles: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Who referred you to DEF?" className="sm:col-span-2">
                      <input
                        type="text"
                        value={form.referrer}
                        onChange={(e) => setForm({ ...form, referrer: e.target.value })}
                        className={inputClass}
                      />
                    </Field>

                    <div className="sm:col-span-2 flex flex-col gap-2">
                      <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Have you belonged to any social, community, or fan group before?
                      </label>
                      <div className="flex gap-4">
                        <RadioPill
                          label="Yes"
                          checked={form.priorGroupMember === true}
                          onClick={() => setForm({ ...form, priorGroupMember: true })}
                        />
                        <RadioPill
                          label="No"
                          checked={form.priorGroupMember === false}
                          onClick={() => setForm({ ...form, priorGroupMember: false, priorGroupDetail: '' })}
                        />
                      </div>
                      {form.priorGroupMember && (
                        <input
                          type="text"
                          placeholder="Please specify..."
                          value={form.priorGroupDetail}
                          onChange={(e) => setForm({ ...form, priorGroupDetail: e.target.value })}
                          className={`${inputClass} mt-1`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B */}
                <div>
                  <h3 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1 border-l-2 border-luxury-gold pl-3">
                    Section B: Interest & Contribution
                  </h3>
                  <div className="mt-5 space-y-6">
                    <Field label="Why do you want to join De Elites Family (DEF)?" required>
                      <textarea
                        value={form.reasonForJoining}
                        onChange={(e) => setForm({ ...form, reasonForJoining: e.target.value })}
                        rows={4}
                        className={`${inputClass} resize-none`}
                      />
                    </Field>

                    <div className="flex flex-col gap-2">
                      <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Which areas are you willing to contribute to? (Check all that apply)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CONTRIBUTION_AREAS.map((area) => (
                          <label
                            key={area}
                            className="flex items-center gap-2.5 bg-jet-black border border-gray-800 rounded px-3.5 py-2.5 text-xs text-gray-300 cursor-pointer hover:border-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={form.contributionAreas.includes(area)}
                              onChange={() => toggleContributionArea(area)}
                              className="accent-[#D4AF37] w-3.5 h-3.5"
                            />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                        How active do you intend to be?
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {ACTIVITY_LEVELS.map((level) => (
                          <RadioPill
                            key={level}
                            label={level}
                            checked={form.activityLevel === level}
                            onClick={() => setForm({ ...form, activityLevel: level })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C */}
                <div>
                  <h3 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1 border-l-2 border-luxury-gold pl-3">
                    Section C: Basic Commitments & Agreement
                  </h3>
                  <div className="mt-5 space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-sans text-xs text-gray-300 leading-relaxed">
                        <span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-1">Financial Support</span>
                        DEF occasionally requires financial contributions for charity, events, and member welfare. Are you willing to support these initiatives whenever reasonably possible?
                      </label>
                      <div className="flex gap-4">
                        <RadioPill
                          label="Yes"
                          checked={form.willingToSupportFinancially === true}
                          onClick={() => setForm({ ...form, willingToSupportFinancially: true })}
                        />
                        <RadioPill
                          label="No"
                          checked={form.willingToSupportFinancially === false}
                          onClick={() => setForm({ ...form, willingToSupportFinancially: false })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-sans text-xs text-gray-300 leading-relaxed">
                        <span className="font-black uppercase tracking-widest text-[10px] text-gray-400 block mb-1">Rules & Discipline</span>
                        Are you willing to obey the DEF Constitution, respect all members, and avoid spreading false information or unnecessary conflict?
                      </label>
                      <div className="flex gap-4">
                        <RadioPill
                          label="Yes"
                          checked={form.agreesToRulesAndDiscipline === true}
                          onClick={() => setForm({ ...form, agreesToRulesAndDiscipline: true })}
                        />
                        <RadioPill
                          label="No"
                          checked={form.agreesToRulesAndDiscipline === false}
                          onClick={() => setForm({ ...form, agreesToRulesAndDiscipline: false })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const inputClass =
  'bg-jet-black border border-gray-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-700 w-full';

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label} {required && <span className="text-luxury-gold">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioPill({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
        checked
          ? 'border-luxury-gold text-luxury-gold bg-luxury-gold/10'
          : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
