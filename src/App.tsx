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
import MembersList from './components/MembersList';
import ShoutoutWall from './components/ShoutoutWall';
import Events from './components/Events';
import Footer from './components/Footer';
import CmsDashboard from './components/CmsDashboard';
import { CmsProvider } from './context/CmsContext';

function AppContent() {
  const [cmsOpen, setCmsOpen] = useState(false);

  return (
    <div className="bg-jet-black min-h-screen text-white font-sans antialiased selection:bg-luxury-gold selection:text-black">
      {/* Sticky Premium Navigation Header */}
      <Navbar onOpenCms={() => setCmsOpen(true)} />

      {/* Main Container */}
      <main className="relative">
        
        {/* Section 1: Hero Section */}
        <Hero />

        {/* Section 2: Who We Are (Core Pillars) */}
        <WhoWeAre />

        {/* Section 3: Leadership Council */}
        <Leadership />

        {/* Section 4: Legacy Projects Gallery */}
        <Gallery />

        {/* Section 5: Upcoming Events */}
        <Events />

        {/* Section 6: Members Directory */}
        <MembersList />

        {/* Section 6: Member Shoutout Wall */}
        <ShoutoutWall />

      </main>

      {/* Section 7: Responsive Premium Footer */}
      <Footer />

      {/* Slide-Up CMS Admin Panel */}
      <CmsDashboard isOpen={cmsOpen} onClose={() => setCmsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <CmsProvider>
      <AppContent />
    </CmsProvider>
  );
}

