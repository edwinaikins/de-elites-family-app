import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShieldCheck, Users, Flame, Award, Compass, ChevronRight, Quote } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { Pillar } from '../types';

export default function WhoWeAre() {
  const { pillars } = useCms();
  const [activePillarState, setActivePillarState] = useState<Pillar | null>(null);
  const activePillar = activePillarState || pillars[1] || pillars[0];

  const getIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'Heart':
        return <Heart className={`${className} text-luxury-gold`} />;
      case 'ShieldCheck':
        return <ShieldCheck className={`${className} text-luxury-gold`} />;
      case 'Users':
        return <Users className={`${className} text-luxury-gold`} />;
      case 'Flame':
        return <Flame className={`${className} text-luxury-gold`} />;
      case 'Award':
        return <Award className={`${className} text-luxury-gold`} />;
      case 'Compass':
        return <Compass className={`${className} text-luxury-gold`} />;
      default:
        return <Heart className={`${className} text-luxury-gold`} />;
    }
  };

  return (
    <section id="who-we-are" className="py-24 bg-jet-black relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute right-0 top-1/3 w-[400px] h-[400px] rounded-full bg-luxury-gold/2 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 max-w-3xl">
          <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
            Core Foundations
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
            WHO WE ARE
          </h2>
          <div className="h-[2px] w-20 bg-luxury-gold mb-6 md:mx-0 mx-auto" />
          <p className="font-sans text-gray-400 text-sm sm:text-base leading-relaxed">
            De Elites Family is built on foundational principles that shape our collective destiny. Inspired by the resilience and street-smart sovereign royalty of the Shatta Movement legacy, we walk our path with high honor, deep accountability, and absolute brotherhood.
          </p>
        </div>

        {/* Pillars Interactive Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Grid: The Six Pillars */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map((pillar) => {
              const isActive = activePillar.id === pillar.id;
              return (
                <motion.div
                  key={pillar.id}
                  onClick={() => setActivePillarState(pillar)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-lg cursor-pointer transition-all duration-300 border ${
                    isActive
                      ? 'bg-charcoal-card border-luxury-gold gold-glow'
                      : 'bg-charcoal-card/40 border-gray-900/60 hover:border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'bg-luxury-gold/10' : 'bg-jet-black'
                    }`}>
                      {getIcon(pillar.icon)}
                    </div>
                    <h3 className={`font-display text-lg font-extrabold uppercase tracking-wide ${
                      isActive ? 'text-luxury-gold' : 'text-white'
                    }`}>
                      {pillar.name}
                    </h3>
                  </div>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {pillar.description}
                  </p>
                  <div className="flex justify-end mt-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isActive ? 'text-luxury-gold' : 'text-gray-500 hover:text-gray-300'
                    }`}>
                      {isActive ? 'Active Focus' : 'See Manifestation'}
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Featured Pillar Spotlight */}
          <div className="lg:col-span-5 h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePillar.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-charcoal-card border border-luxury-gold/30 p-8 sm:p-10 rounded-lg h-full flex flex-col justify-between relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
              >
                {/* Background watermarked text */}
                <div className="absolute right-[-20px] bottom-[-20px] font-display text-9xl font-black text-gray-900/10 uppercase select-none pointer-events-none">
                  {activePillar.name.slice(0, 4)}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center">
                      {getIcon(activePillar.icon, "w-8 h-8")}
                    </div>
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.25em] text-luxury-gold px-3 py-1 rounded bg-luxury-gold/5 border border-luxury-gold/20">
                      Elite Creed
                    </span>
                  </div>

                  <h3 className="font-display text-3xl font-black text-white uppercase mb-4 tracking-tight">
                    THE PILLAR OF <span className="text-luxury-gold">{activePillar.name}</span>
                  </h3>
                  
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed mb-8">
                    {activePillar.description}
                  </p>
                </div>

                <div className="border-t border-gray-900/60 pt-6 mt-6">
                  <div className="flex gap-3 items-start">
                    <Quote className="w-8 h-8 text-luxury-gold/30 shrink-0 transform -scale-x-100" />
                    <p className="font-display text-sm sm:text-base italic font-extrabold text-white tracking-wide leading-relaxed">
                      "{activePillar.quote}"
                    </p>
                  </div>
                  <div className="text-right mt-4">
                    <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-luxury-gold">
                      — DE ELITES MANIFESTO
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
