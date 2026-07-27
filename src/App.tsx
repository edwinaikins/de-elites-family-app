/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhoWeAre from './components/WhoWeAre';
import Leadership from './components/Leadership';
import Gallery from './components/Gallery';
import Events from './components/Events';
import Footer from './components/Footer';
import CmsDashboard from './components/CmsDashboard';
import UpcomingEventBanner from './components/UpcomingEventBanner';
import MemberPortalModal from './components/MemberPortalModal';
import JoinApplicationModal from './components/JoinApplicationModal';
import MockPaystackCheckout from './components/MockPaystackCheckout';
import WelfarePage from './components/WelfarePage';
import { CmsProvider, useCms } from './context/CmsContext';
import { MemberAuthProvider } from './context/MemberAuthContext';

function AppContent() {
  const [cmsOpen, setCmsOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [welfareOpen, setWelfareOpen] = useState(false);

  // CmsContext's state starts out filled with hardcoded placeholder content
  // (src/data.ts — sample pillars, a fake "Marcus the Sovereign" leader,
  // stock photos, etc.) so the very first render has *something* to paint,
  // then swaps in the real Postgres-backed content once refreshData()'s
  // fetch resolves. That swap is exactly the "old data first, then new
  // data" flash — visitors were briefly seeing fabricated demo content.
  // Gating the whole page behind `loading` means the real content is the
  // only thing anyone ever sees; the tradeoff is a brief branded loading
  // screen on every fresh page load instead of an instant (but wrong) paint.
  const { loading: cmsLoading } = useCms();

  if (cmsLoading) {
    return (
      <div className="min-h-screen bg-jet-black flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 rounded-full border border-luxury-gold flex items-center justify-center bg-charcoal-card shadow-[0_0_20px_rgba(212,175,55,0.2)]">
          <Crown className="w-8 h-8 text-luxury-gold animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-sm font-black text-white uppercase tracking-widest">
            De Elites Family
          </span>
          <span className="flex items-center gap-1.5 text-luxury-gold text-[10px] font-black uppercase tracking-[0.2em]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet-black min-h-screen text-white font-sans antialiased selection:bg-luxury-gold selection:text-black">
      {/* Sticky Premium Navigation Header */}
      <Navbar onOpenJoin={() => setJoinOpen(true)} onOpenWelfare={() => setWelfareOpen(true)} />

      {/* Main Container */}
      <main className="relative">

        {/* Section 1: Hero Section */}
        <Hero onOpenJoin={() => setJoinOpen(true)} />

        {/* Section 2: Who We Are (Core Pillars) */}
        <WhoWeAre />

        {/* Section 3: Leadership Council */}
        <Leadership />

        {/* Section 4: Upcoming Events */}
        <Events />

        {/* Section 5: Legacy Projects Gallery */}
        <Gallery />

      </main>

      {/* Shared Prospective Member Application modal — opened from both the
          Navbar's "Join the Movement" button and the Hero's join button. */}
      <JoinApplicationModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />

      {/* Dedicated Welfare & Benefits page — opened from the Navbar's
          "Welfare" link, as a full-screen overlay (this app has no client
          router, so "dedicated page" here means a full-viewport takeover,
          matching how the Member Portal and CMS already work). */}
      <WelfarePage
        isOpen={welfareOpen}
        onClose={() => setWelfareOpen(false)}
        onOpenJoin={() => { setWelfareOpen(false); setJoinOpen(true); }}
      />

      {/* Section 7: Responsive Premium Footer */}
      <Footer onOpenAdmin={() => setCmsOpen(true)} />

      {/* Slide-Up CMS Admin Panel */}
      <CmsDashboard isOpen={cmsOpen} onClose={() => setCmsOpen(false)} />

      {/* Member Portal (login + bio/dues/event payments) */}
      <MemberPortalModal />

      {/* Floating Upcoming Event Banner */}
      <UpcomingEventBanner />

      {/* Simulated Paystack checkout — only ever shown when the backend has
          no real Paystack keys configured (see isMockPaymentsEnabled() in
          server.ts). Otherwise payWithPaystack() opens the real popup. */}
      <MockPaystackCheckout />
    </div>
  );
}

export default function App() {
  return (
    <CmsProvider>
      <MemberAuthProvider>
        <AppContent />
      </MemberAuthProvider>
    </CmsProvider>
  );
}

