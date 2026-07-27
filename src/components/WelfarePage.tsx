import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, ArrowRight, Crown, Users, HeartHandshake, ShieldCheck, Gift,
  PartyPopper, Baby, Heart, Flame, HandCoins, PiggyBank, Cake,
  TrendingUp, Coffee, Scale, FileText, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, Sparkles,
} from 'lucide-react';
import { useMemberAuth } from '../context/MemberAuthContext';

interface WelfarePageProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJoin: () => void;
}

const AIMS = [
  {
    icon: Users,
    title: 'Promote Unity Among Members',
    description: "Through the welfare, members demonstrate that they genuinely care about each other's wellbeing — building strong bonds across the Family.",
  },
  {
    icon: Gift,
    title: 'Support During Life Events',
    description: 'Marriage ceremonies, child naming ceremonies, illness, and the loss of a member or close relative — the welfare provides financial relief exactly when it matters most.',
  },
  {
    icon: ShieldCheck,
    title: 'Reduce Individual Financial Burden',
    description: 'Funerals and medical emergencies can place a heavy burden on one person. The welfare spreads that burden across every member, so no one carries it alone.',
  },
  {
    icon: HeartHandshake,
    title: 'A Culture of Mutual Support',
    description: '"Today it may be one member in need, tomorrow it may be another." Everyone contributes so that everyone is protected.',
  },
];

const BENEFITS = [
  { icon: PartyPopper, title: 'Marriage Celebration', amount: 'GH₵1,000', note: 'Paid once per member' },
  { icon: Baby, title: 'Child Naming Ceremony', amount: 'GH₵800', note: 'Capped at 1 child per member' },
  { icon: HeartHandshake, title: 'Parental Bereavement', amount: 'GH₵1,000', note: 'Claimable once for Mother, once for Father' },
  { icon: Heart, title: 'Spouse / Child Bereavement', amount: 'GH₵1,000', note: 'Per qualifying event' },
  { icon: Flame, title: 'Member Transition (Passing)', amount: 'GH₵2,000', note: "Paid to the member's family" },
];

const PERKS = [
  {
    icon: HandCoins,
    title: 'Emergency Soft-Loan Access',
    description: 'Need quick liquidity for school fees or urgent repairs? Members in good standing can access 0% or ultra-low interest short-term loans from our reserve pool.',
  },
  {
    icon: PiggyBank,
    title: 'Annual Cashback / Dividends',
    description: "If claim volume is low during the year, up to 20% of surplus funds are returned to compliant members as an end-of-year bonus — or credited toward next year's dues.",
  },
  {
    icon: Users,
    title: 'End-of-Year Social & Networking',
    description: "Celebrate the year together — free entry and meals funded by the association's administrative reserve.",
  },
  {
    icon: Cake,
    title: 'Member Birthday Spotlights',
    description: 'Monthly recognition and token gifts for active members celebrating their birthday.',
  },
];

const ALLOCATION = [
  { icon: ShieldCheck, label: 'Core Claims Reserve', pct: 60, description: 'Strictly locked for benefit payouts — weddings, births, funerals.' },
  { icon: TrendingUp, label: 'High-Yield Growth Reserve', pct: 30, description: 'Invested to grow the pool over time.' },
  { icon: Coffee, label: 'Admin & Social Fund', pct: 10, description: 'Meeting refreshments, the end-of-year gathering, and day-to-day admin.' },
];

const KEY_RULES = [
  {
    icon: Clock,
    title: '6-Month Probation',
    description: 'Full benefits kick in after six consistent months of contributions — the same waiting period applies to any newly added beneficiary.',
  },
  {
    icon: AlertTriangle,
    title: '3-Month Arrears Disqualification',
    description: 'Dues unpaid for more than three months disqualify a member from benefits and may lead to suspension.',
  },
  {
    icon: Scale,
    title: 'Anti-Gaming Clause',
    description: 'Settling accumulated arrears only when a claim arises triggers automatic penalty deductions or delayed payouts.',
  },
  {
    icon: FileText,
    title: 'Transparent Monthly Ledger',
    description: 'A simplified financial statement — inflows, outflows, reserve balance — is shared digitally with every member on the 1st of each month.',
  },
];

const CONSTITUTION = [
  'All members must complete registration and remain in good standing to qualify for benefits.',
  'A six (6) month probation period is required before a member becomes eligible for benefits.',
  'Any newly added beneficiary shall only become eligible after six (6) months.',
  'Monthly dues are GH₵50.00 and must be paid consistently.',
  'A member is considered in arrears if dues remain unpaid.',
  'Members owing dues for more than three (3) months shall be disqualified from receiving benefits and subject to suspension.',
  'Members qualify for benefits only if they are in good financial standing.',
  'All benefits are subject to verification and approval by the Welfare Board.',
  'Childbirth benefit is limited to one child per member.',
  'Benefits for mother and father can each be claimed only once per member.',
  'Any unpaid dues, fines, or arrears shall be automatically deducted from benefits payable.',
  'Members who deliberately delay payments and attempt to clear arrears only at the point of claiming benefits may be subject to a benefit reduction (penalty deduction), or delayed eligibility as determined by the Board.',
  'Providing false information may lead to disqualification or disciplinary action.',
  'All members agree to comply with decisions made by the Welfare Board in accordance with the Constitution.',
];

function SectionHeader({ eyebrow, title, center }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : 'text-center sm:text-left'}>
      <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
        {eyebrow}
      </span>
      <h2 className="font-display text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
        {title}
      </h2>
      <div className={`h-[2px] w-16 bg-luxury-gold mt-4 ${center ? 'mx-auto' : 'mx-auto sm:mx-0'}`} />
    </div>
  );
}

export default function WelfarePage({ isOpen, onClose, onOpenJoin }: WelfarePageProps) {
  const { member, openPortal } = useMemberAuth();
  const [showFullConstitution, setShowFullConstitution] = useState(false);

  if (!isOpen) return null;

  const stats = [
    { value: 'GH₵50', label: 'Monthly Contribution' },
    { value: '5', label: 'Life-Event Benefits' },
    { value: '20%', label: 'Potential Annual Cashback' },
    { value: '6 Mo', label: 'Probation Period' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-jet-black overflow-hidden flex flex-col">
      {/* Sticky header */}
      <header className="shrink-0 px-6 py-4 bg-jet-black/95 backdrop-blur-md border-b border-gray-900 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-luxury-gold/15 rounded border border-luxury-gold/30">
            <HeartHandshake className="w-5 h-5 text-luxury-gold" />
          </div>
          <div>
            <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-black bg-luxury-gold px-1.5 py-0.5 rounded">
              Member Benefit
            </span>
            <h2 className="font-display text-sm sm:text-lg font-black text-white uppercase tracking-wider">
              DEF Welfare
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-white bg-jet-black/60 border border-gray-800 rounded hover:border-gray-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* HERO */}
        <section className="relative py-20 sm:py-28 px-6 border-b border-gray-950 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold text-[10px] font-mono tracking-widest uppercase mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Because Together, We Rise</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight text-white mb-6"
            >
              DEF <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-gold-dark">WELFARE</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-sans text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-10"
            >
              A structured mutual-support system built by the Family, for the Family — so that no member ever has to face life's biggest moments alone.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto"
            >
              {stats.map((s) => (
                <div key={s.label} className="bg-charcoal-card border border-gray-900 rounded-lg py-4 px-2">
                  <div className="font-display text-lg sm:text-2xl font-black text-luxury-gold">{s.value}</div>
                  <div className="font-sans text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* AIMS */}
        <section className="py-20 px-6 border-b border-gray-950">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="Our Purpose" title="Why The Welfare Exists" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
              {AIMS.map((a) => (
                <div key={a.title} className="bg-charcoal-card border border-gray-900 rounded-xl p-6 hover:border-luxury-gold/30 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center mb-4">
                    <a.icon className="w-5 h-5 text-luxury-gold" />
                  </div>
                  <h3 className="font-display text-sm font-black text-white uppercase tracking-wide mb-2">{a.title}</h3>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HISTORY */}
        <section className="py-20 px-6 border-b border-gray-950 bg-charcoal-card/30">
          <div className="max-w-3xl mx-auto text-center">
            <SectionHeader eyebrow="Our Story" title="How It Began" center />
            <p className="font-sans text-gray-400 text-sm leading-relaxed mt-6">
              The welfare association was established as a structured support system within the group. The founding members recognized that members often faced financial challenges during major life events, that informal support wasn't always reliable, and that a structured welfare scheme would provide consistent, organized assistance — every time, for every member.
            </p>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="py-20 px-6 border-b border-gray-950">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="Direct Life Event Support" title="Current Welfare Benefits" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {BENEFITS.map((b) => (
                <div key={b.title} className="bg-charcoal-card border border-gray-900 rounded-xl p-6 hover:border-luxury-gold/30 transition-colors flex flex-col">
                  <div className="w-11 h-11 rounded-full bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center mb-4">
                    <b.icon className="w-5 h-5 text-luxury-gold" />
                  </div>
                  <h3 className="font-display text-sm font-black text-white uppercase tracking-wide mb-1">{b.title}</h3>
                  <div className="font-display text-2xl font-black text-luxury-gold mb-2">{b.amount}</div>
                  <p className="font-sans text-xs text-gray-500 leading-relaxed mt-auto">{b.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PERKS */}
        <section className="py-20 px-6 border-b border-gray-950 bg-charcoal-card/30">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="Exclusive Active Perks" title="What You Get Just For Being A Member" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
              {PERKS.map((p) => (
                <div key={p.title} className="bg-jet-black border border-gray-900 rounded-xl p-6 flex gap-4 hover:border-luxury-gold/30 transition-colors">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center">
                    <p.icon className="w-5 h-5 text-luxury-gold" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-black text-white uppercase tracking-wide mb-1.5">{p.title}</h3>
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINANCIAL STRATEGY */}
        <section className="py-20 px-6 border-b border-gray-950">
          <div className="max-w-4xl mx-auto">
            <SectionHeader eyebrow="Financial Strategy" title="Where Every GH₵50 Goes" center />
            <p className="font-sans text-gray-400 text-xs sm:text-sm text-center leading-relaxed mt-4 max-w-xl mx-auto">
              To keep the welfare solvent — and to make sure it's still here for the next generation of members — every monthly contribution is split across three dedicated buckets.
            </p>

            <div className="mt-10 h-4 w-full rounded-full overflow-hidden flex border border-gray-900">
              <div className="bg-luxury-gold h-full" style={{ width: '60%' }} />
              <div className="bg-luxury-gold-dark h-full" style={{ width: '30%' }} />
              <div className="bg-gray-700 h-full" style={{ width: '10%' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
              {ALLOCATION.map((a) => (
                <div key={a.label} className="bg-charcoal-card border border-gray-900 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center shrink-0">
                      <a.icon className="w-4 h-4 text-luxury-gold" />
                    </div>
                    <div className="font-display text-xl font-black text-luxury-gold leading-none">{a.pct}%</div>
                  </div>
                  <h4 className="font-display text-xs font-black text-white uppercase tracking-wide mb-1.5">{a.label}</h4>
                  <p className="font-sans text-[11px] text-gray-500 leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RULES */}
        <section className="py-20 px-6 border-b border-gray-950 bg-charcoal-card/30">
          <div className="max-w-5xl mx-auto">
            <SectionHeader eyebrow="Governing Framework" title="Clear & Fair Rules" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
              {KEY_RULES.map((r) => (
                <div key={r.title} className="bg-jet-black border border-gray-900 rounded-xl p-6 flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center">
                    <r.icon className="w-4 h-4 text-luxury-gold" />
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-black text-white uppercase tracking-wide mb-1.5">{r.title}</h4>
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Full constitution */}
            <div className="mt-10 bg-jet-black border border-gray-900 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFullConstitution((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-900/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-luxury-gold" />
                  <span className="font-sans text-xs font-black uppercase tracking-widest text-white">
                    Full Welfare Constitution
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showFullConstitution ? 'rotate-180' : ''}`} />
              </button>
              {showFullConstitution && (
                <div className="px-6 pb-6 border-t border-gray-900 pt-4">
                  <ol className="space-y-3">
                    {CONSTITUTION.map((rule, i) => (
                      <li key={i} className="flex gap-3 font-sans text-xs text-gray-400 leading-relaxed">
                        <span className="shrink-0 font-mono text-luxury-gold font-bold">{String(i + 1).padStart(2, '0')}</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-6 bg-luxury-gold/5 border border-luxury-gold/20 rounded-lg p-4 space-y-1.5">
                    <p className="font-sans text-[11px] text-gray-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-luxury-gold shrink-0" />
                      I have read and understood the Welfare Constitution.
                    </p>
                    <p className="font-sans text-[11px] text-gray-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-luxury-gold shrink-0" />
                      I agree to abide by all rules and decisions of the Association.
                    </p>
                    <p className="font-sans text-[10px] text-gray-500 pt-1">
                      Every member's registration includes agreeing to this declaration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Crown className="w-8 h-8 text-luxury-gold mx-auto mb-5" />
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-4">
              Protected Today. Present Tomorrow.
            </h2>
            <p className="font-sans text-gray-400 text-sm leading-relaxed mb-8">
              Stay current on your dues and the entire Family stands behind you when it matters most.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {member ? (
                <button
                  onClick={openPortal}
                  className="px-6 py-3 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer flex items-center gap-2"
                >
                  View My Dues
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={onOpenJoin}
                    className="px-6 py-3 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Join the Movement
                  </button>
                  <button
                    onClick={openPortal}
                    className="px-6 py-3 rounded bg-charcoal-card border border-gray-800 hover:border-luxury-gold/50 text-white hover:text-luxury-gold font-sans font-black tracking-widest text-xs uppercase transition-all cursor-pointer"
                  >
                    Member Login
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
