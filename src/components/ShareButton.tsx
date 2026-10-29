import React, { useState } from 'react';
import { Share2, MessageCircle, Facebook, Twitter, Copy, Check } from 'lucide-react';
import { canShareNatively, shareNative, absoluteUrl, whatsappShareUrl, facebookShareUrl, twitterShareUrl } from '../lib/share';

interface ShareButtonProps {
  title: string;
  text?: string;
  // Site-relative path to share (e.g. `/events/${id}`, `/gallery/${id}`, or
  // `/` for the whole site) — turned into an absolute URL at share time via
  // window.location.origin, so this works unchanged on localhost, staging,
  // or the real domain.
  path: string;
  // 'icon' — a compact circular button, for overlaying on a card.
  // 'full' — a labeled pill button ("Share"), for standalone placement
  // (e.g. inside the Gallery spotlight modal, or the Footer's site-wide share).
  variant?: 'icon' | 'full';
  className?: string;
}

// On a phone (and some desktop browsers), tapping this opens the normal
// native share sheet — WhatsApp, Messages, Instagram, whatever's installed.
// Where that's not available (most desktop browsers), it opens a small
// fallback menu instead: WhatsApp, Facebook, X, or Copy Link.
export default function ShareButton({ title, text, path, variant = 'icon', className = '' }: ShareButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger a parent card's own onClick (e.g. Gallery's spotlight-open)
    if (canShareNatively()) {
      await shareNative({ title, text, url: absoluteUrl(path) });
      return;
    }
    setMenuOpen(true);
  };

  const closeMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpen(false);
    setCopied(false);
  };

  const url = absoluteUrl(path);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setMenuOpen(false), 1200);
    } catch {
      // Clipboard access can fail (permissions, non-secure context) — the
      // menu just stays open so the person can select the link manually
      // from the address bar instead; nothing to recover from here.
    }
  };

  const openPlatform = (e: React.MouseEvent, platformUrl: string) => {
    e.stopPropagation();
    window.open(platformUrl, '_blank', 'noopener,noreferrer');
    closeMenu();
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleShareClick}
          title="Share"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/70 border border-white/10 text-white hover:text-luxury-gold hover:border-luxury-gold/40 backdrop-blur-sm transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleShareClick}
          className="px-4 py-2 rounded border border-gray-800 hover:border-luxury-gold/50 text-gray-400 hover:text-luxury-gold font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      )}

      {menuOpen && (
        <>
          {/* Click-outside-to-close overlay — same pattern as the RSVP/gallery
              popups elsewhere in this app (a transparent backdrop that closes
              on click, with the menu itself stopping that click from reaching it). */}
          <div className="fixed inset-0 z-[70]" onClick={closeMenu} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-2 z-[71] w-48 bg-charcoal-card border border-gray-800 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <button
              type="button"
              onClick={(e) => openPlatform(e, whatsappShareUrl(title, url))}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs text-gray-300 hover:bg-jet-black hover:text-white transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-luxury-gold" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={(e) => openPlatform(e, facebookShareUrl(url))}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs text-gray-300 hover:bg-jet-black hover:text-white transition-colors cursor-pointer border-t border-gray-900"
            >
              <Facebook className="w-4 h-4 text-luxury-gold" />
              Facebook
            </button>
            <button
              type="button"
              onClick={(e) => openPlatform(e, twitterShareUrl(title, url))}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs text-gray-300 hover:bg-jet-black hover:text-white transition-colors cursor-pointer border-t border-gray-900"
            >
              <Twitter className="w-4 h-4 text-luxury-gold" />
              X (Twitter)
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs text-gray-300 hover:bg-jet-black hover:text-white transition-colors cursor-pointer border-t border-gray-900"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-luxury-gold" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
