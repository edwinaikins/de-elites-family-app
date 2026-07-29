import React from 'react';
import { Instagram, Flame, ArrowUp, ShieldCheck } from 'lucide-react';
import { useCms } from '../context/CmsContext';

interface FooterProps {
  onOpenAdmin: () => void;
}

// TikTok and Snapchat aren't in lucide-react's icon set, so these are small
// hand-drawn solid-fill glyphs (same 24x24 viewBox convention as lucide)
// rather than a dependency on a brand-icon package.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 2h-3v13.5a3.5 3.5 0 1 1-3.5-3.5c.35 0 .68.05 1 .14V8.9a6.5 6.5 0 1 0 5.5 6.43V8.5a7.5 7.5 0 0 0 4.5 1.5V6.8a4.5 4.5 0 0 1-4.5-4.5V2Z" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2c-3.04 0-5.5 2.24-5.5 5.5v2.19c0 .3-.16.57-.42.7l-2.1 1.06c-.3.15-.3.58 0 .73.9.46 2.02.9 2.02.9-.06.36-.4 1.02-1.1 1.4-.27.15-.2.55.1.6.46.08.9.24 1.02.58.1.28-.02.7.32.86.5.24 1.1-.02 1.66.24.5.24.86.9 1.72 1.06.9.17 1.66-.44 2.28-.44s1.38.6 2.28.44c.86-.16 1.22-.82 1.72-1.06.56-.26 1.16 0 1.66-.24.34-.16.22-.58.32-.86.12-.34.56-.5 1.02-.58.3-.05.37-.45.1-.6-.7-.38-1.04-1.04-1.1-1.4 0 0 1.12-.44 2.02-.9.3-.15.3-.58 0-.73l-2.1-1.06a.79.79 0 0 1-.42-.7V7.5C17.5 4.24 15.04 2 12 2Z" />
    </svg>
  );
}

export default function Footer({ onOpenAdmin }: FooterProps) {
  const { hero } = useCms();
  const heroItem = hero?.[0];
  const logoUrl = heroItem?.logo;

  const handleScrollToTop = () => {
    const hero = document.getElementById('hero');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#050505] border-t border-gray-900/80 pt-20 pb-10 relative overflow-hidden">
      {/* Subtle glow accent on bottom right */}
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-luxury-gold/2 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16 border-b border-gray-900/50">
          
          {/* Column 1: Core Branding (lg:span-4) */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-6 cursor-pointer group" onClick={handleScrollToTop}>
              <div className="w-9 h-9 rounded-full border border-luxury-gold flex items-center justify-center bg-charcoal-card overflow-hidden transition-all group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Flame className="w-4.5 h-4.5 text-luxury-gold fill-luxury-gold/5 group-hover:fill-luxury-gold/20" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-display text-base font-black tracking-wider text-white">
                  DE ELITES
                </span>
                <span className="font-sans text-[9px] uppercase font-bold tracking-[0.25em] text-luxury-gold">
                  F A M I L Y
                </span>
              </div>
            </div>
            <p className="font-sans text-gray-400 text-xs sm:text-sm leading-relaxed mb-6 max-w-sm">
              The official portal for DE ELITES FAMILY. Born from street-smart royalty, powered by unyielding loyalty, and forged in a legacy of our own making. One Family. One Mission. One Legacy.
            </p>
          </div>

          {/* Column 2: Navigation Links (lg:span-3) */}
          <div className="lg:col-span-3">
            <h4 className="font-display text-sm font-black text-white uppercase tracking-widest mb-6 border-l-2 border-luxury-gold pl-3">
              Quick Links
            </h4>
            <ul className="space-y-3.5">
              {[
                { label: 'Who We Are', id: 'who-we-are' },
                { label: 'Leadership Council', id: 'leadership' },
                { label: 'Upcoming Events', id: 'events' },
                { label: 'Legacy Milestones', id: 'legacy-gallery' }
              ].map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="font-sans text-xs text-gray-400 hover:text-luxury-gold transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider font-semibold"
                  >
                    <span>/</span> {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Social Channels (lg:span-5) */}
          <div className="lg:col-span-5">
            <h4 className="font-display text-sm font-black text-white uppercase tracking-widest mb-6 border-l-2 border-luxury-gold pl-3">
              Socials
            </h4>
            <p className="font-sans text-gray-400 text-xs leading-relaxed mb-6">
              Connect with our global network across all digital channels. Follow our feeds, join the direct crew channels, and stay locked in with the movement.
            </p>
            <div className="flex flex-wrap gap-3.5">
              {[
                { icon: <TikTokIcon className="w-5 h-5" />, label: 'TikTok', href: 'https://www.tiktok.com/@deelitesfamily.gh?_r=1&_t=ZS-98OKrFWwSGr' },
                { icon: <SnapchatIcon className="w-5 h-5" />, label: 'Snapchat', href: 'https://www.snapchat.com/@deelitesfamily?invite_id=3cFCR519&locale=en_GH&share_id=-umI7VnpQtCwtYAcbLkbqg&sid=16865f670d514aadbde527911b436d56' },
                { icon: <Instagram className="w-5 h-5" />, label: 'Instagram', href: 'https://www.instagram.com/deelitesfamily.gh?utm_source=qr' },
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.label}
                  className="w-12 h-12 rounded-full bg-charcoal-card border border-gray-900 hover:border-luxury-gold/50 flex items-center justify-center text-gray-400 hover:text-luxury-gold transition-all duration-300 shadow-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:scale-110 cursor-pointer"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="font-sans text-[10px] text-gray-600 uppercase tracking-widest">
              © 2026 DE ELITES FAMILY. ALL RIGHTS RESERVED.
            </p>
            <p className="font-sans text-[9px] text-gray-700 uppercase tracking-widest mt-1">
              Forged on our own sovereign blueprint. One Family. One Legacy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Staff/CMS admin access — deliberately understated; the main
                nav's login button is for regular members, not admins. */}
            <button
              onClick={onOpenAdmin}
              className="group flex items-center gap-1.5 px-3 py-2 rounded text-[9px] uppercase font-black tracking-widest text-gray-700 hover:text-gray-400 transition-all cursor-pointer"
              title="Staff / CMS Admin Access"
            >
              <ShieldCheck className="w-3 h-3" />
              Staff Login
            </button>

            {/* Scroll Back to Top Button */}
            <button
              onClick={handleScrollToTop}
              className="group flex items-center gap-2 px-4 py-2 border border-gray-900 hover:border-luxury-gold/40 rounded text-[9px] uppercase font-black tracking-widest text-gray-500 hover:text-luxury-gold transition-all bg-charcoal-card/40 cursor-pointer"
            >
              Back to Top
              <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
