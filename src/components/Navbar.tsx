import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Menu, X, Flame, Settings } from 'lucide-react';
import { useCms } from '../context/CmsContext';

interface NavbarProps {
  onOpenCms: () => void;
}

export default function Navbar({ onOpenCms }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hero } = useCms();
  const heroItem = hero?.[0];
  const logoUrl = heroItem?.logo;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-jet-black/95 backdrop-blur-md py-4 border-b border-luxury-gold/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => scrollToSection('hero')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full border border-luxury-gold flex items-center justify-center bg-charcoal-card overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Flame className="w-5 h-5 text-luxury-gold fill-luxury-gold/10 group-hover:fill-luxury-gold/30 transition-all" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-black tracking-widest text-white leading-none">
              DE ELITES
            </span>
            <span className="font-sans text-[10px] uppercase font-bold tracking-[0.25em] text-luxury-gold">
              F A M I L Y
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {['Who We Are', 'Leadership', 'Legacy Gallery', 'Events', 'Members', 'Shoutouts'].map((tab) => {
            const id = tab.toLowerCase().replace(' ', '-');
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(id)}
                className="font-sans text-sm font-semibold text-gray-300 hover:text-luxury-gold tracking-wide transition-colors relative py-1 group cursor-pointer"
              >
                {tab}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-luxury-gold transition-all duration-300 group-hover:w-full" />
              </button>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenCms}
            className="p-2.5 rounded bg-charcoal-card border border-gray-800 text-gray-400 hover:text-luxury-gold hover:border-luxury-gold/50 transition-all cursor-pointer flex items-center justify-center hover:scale-105"
            title="Open CMS Administrator Panel"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => scrollToSection('shoutouts')}
            className="px-5 py-2.5 rounded bg-transparent border border-luxury-gold text-luxury-gold font-sans text-xs font-black tracking-widest uppercase hover:bg-luxury-gold hover:text-black transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 animate-pulse"
          >
            Leave a Shoutout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-gray-300 hover:text-luxury-gold transition-colors p-2 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-full left-0 w-full bg-jet-black/98 border-b border-luxury-gold/20 py-6 px-6 flex flex-col gap-5 md:hidden shadow-[0_10px_30px_rgba(0,0,0,0.95)] animate-fade-in"
        >
          {['Who We Are', 'Leadership', 'Legacy Gallery', 'Events', 'Members', 'Shoutouts'].map((tab) => {
            const id = tab.toLowerCase().replace(' ', '-');
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(id)}
                className="font-sans text-left text-lg font-bold text-gray-200 hover:text-luxury-gold transition-colors py-1 border-b border-gray-900"
              >
                {tab}
              </button>
            );
          })}
          
          <div className="flex flex-col gap-2.5 mt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCms();
              }}
              className="w-full text-center py-3 rounded bg-charcoal-card border border-gray-800 text-white hover:text-luxury-gold font-sans font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Admin CMS Control
            </button>

            <button
              onClick={() => scrollToSection('shoutouts')}
              className="w-full text-center py-3 rounded bg-luxury-gold text-black font-sans font-black tracking-widest uppercase hover:bg-luxury-gold-dark transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              Leave a Shoutout
            </button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
