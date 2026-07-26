import React from 'react';
import { motion } from 'motion/react';
import { Crown, ShieldCheck, Flame, Users } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import JoinApplicationModal from './JoinApplicationModal';

export default function Hero() {
  const [isApplicationOpen, setIsApplicationOpen] = React.useState(false);
  const { hero } = useCms();
  const heroItem = hero?.[0] || {
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

  const titleWords = heroItem.title.split(' ');
  const lastWord = titleWords.length > 1 ? titleWords.pop() : '';
  const mainTitlePart = titleWords.join(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center bg-jet-black overflow-hidden pt-20"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0">
        {/* Subtle Luxury Gold Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full bg-luxury-gold/2 blur-[80px] pointer-events-none" />
        
        {/* Abstract Gold Linear Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-6 text-center z-10 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal-card border border-luxury-gold/30 gold-glow mb-6"
          >
            <Crown className="w-4 h-4 text-luxury-gold animate-pulse" />
            <span className="font-sans text-[11px] font-black uppercase tracking-[0.25em] text-luxury-gold">
              The Sovereign Legacy Movement
            </span>
          </motion.div>

          {/* Heading with Elegant Gold Gradient */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl sm:text-6xl md:text-8xl font-black text-white leading-none tracking-tighter mb-4"
          >
            {mainTitlePart} {lastWord && <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold via-yellow-400 to-luxury-gold-dark gold-text-glow">{lastWord}</span>}
          </motion.h1>

          {/* Epic Slogan */}
          <motion.div
            variants={itemVariants}
            className="font-display text-lg sm:text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gray-200 uppercase mb-8"
          >
            {heroItem.slogan}
          </motion.div>

          {/* Intro Description */}
          <motion.p
            variants={itemVariants}
            className="font-sans text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-12"
          >
            {heroItem.description}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full sm:w-auto"
          >
            <button
              onClick={() => setIsApplicationOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.55)] hover:scale-105 cursor-pointer"
            >
              {heroItem.joinButtonText}
            </button>
            <button
              onClick={() => {
                const gallery = document.getElementById('legacy-gallery');
                if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-charcoal-card border border-gray-800 hover:border-luxury-gold text-white font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 hover:bg-jet-black hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:scale-105 cursor-pointer"
            >
              {heroItem.exploreButtonText}
            </button>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-6 sm:gap-12 mt-20 max-w-3xl mx-auto border-t border-gray-900/60 pt-10 w-full"
          >
            <div className="flex flex-col items-center">
              <span className="font-display text-2xl sm:text-4xl font-black text-luxury-gold">{heroItem.stat1Value}</span>
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-bold mt-1">
                {heroItem.stat1Label}
              </span>
            </div>
            <div className="flex flex-col items-center border-x border-gray-900/60 px-4">
              <span className="font-display text-2xl sm:text-4xl font-black text-luxury-gold">{heroItem.stat2Value}</span>
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-bold mt-1">
                {heroItem.stat2Label}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-display text-2xl sm:text-4xl font-black text-luxury-gold">{heroItem.stat3Value}</span>
              <span className="font-sans text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-bold mt-1">
                {heroItem.stat3Label}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <JoinApplicationModal isOpen={isApplicationOpen} onClose={() => setIsApplicationOpen(false)} />

    </section>
  );
}
