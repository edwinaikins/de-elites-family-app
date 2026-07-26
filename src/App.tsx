/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { CmsProvider } from './context/CmsContext';
import { MemberAuthProvider } from './context/MemberAuthContext';

function AppContent() {
  const [cmsOpen, setCmsOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="bg-jet-black min-h-screen text-white font-sans antialiased selection:bg-luxury-gold selection:text-black">
      {/* Sticky Premium Navigation Header */}
      <Navbar onOpenJoin={() => setJoinOpen(true)} />

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

