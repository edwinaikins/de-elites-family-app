import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Eye, X } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { Leader } from '../types';

export default function Leadership() {
  const { leaders } = useCms();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  return (
    <section id="leadership" className="py-24 bg-jet-black relative overflow-hidden border-t border-gray-950">
      {/* Decorative background element */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-luxury-gold/3 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
            The Council
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
            EXECUTIVE BOARD
          </h2>
          <div className="h-[2px] w-20 bg-luxury-gold mx-auto mb-6" />
          <p className="font-sans text-gray-400 text-sm leading-relaxed">
            Leading the family with absolute integrity, sovereign vision, and unyielding honor. Meet the strategic mindsets steering the De Elites legacy.
          </p>
        </div>

        {/* Leadership Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {leaders.map((leader) => {
            const isHovered = hoveredId === leader.id;
            return (
              <motion.div
                key={leader.id}
                onMouseEnter={() => setHoveredId(leader.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="bg-charcoal-card border border-gray-900 rounded-lg p-6 flex flex-col items-center text-center relative transition-all duration-300 hover:border-luxury-gold/40 gold-glow-hover group"
              >
                {/* Circular Image Container with Luxury Gold Rings */}
                <div className="relative w-36 h-36 mb-6">
                  {/* Outer Pulsing Gold Ring */}
                  <div className={`absolute inset-[-4px] rounded-full border border-luxury-gold/20 transition-all duration-500 scale-105 group-hover:scale-110 group-hover:border-luxury-gold/50 ${
                    isHovered ? 'animate-pulse' : ''
                  }`} />
                  
                  {/* Middle Solid Gold Ring */}
                  <div className="absolute inset-[-1px] rounded-full border-2 border-luxury-gold/60 z-10 transition-all duration-300 group-hover:border-luxury-gold" />

                  {/* Circular Image Frame */}
                  <div 
                    onClick={() => setExpandedImage(leader.image)}
                    className="w-full h-full rounded-full overflow-hidden border-4 border-charcoal-card relative z-20 cursor-zoom-in"
                  >
                    <img
                      src={leader.image}
                      alt={leader.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    
                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-luxury-gold" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <h3 className="font-display text-lg font-black text-white group-hover:text-luxury-gold transition-colors uppercase tracking-wide leading-tight">
                  {leader.name}
                </h3>
                <p className="font-sans text-[11px] font-black uppercase tracking-widest text-luxury-gold mt-1 mb-4">
                  {leader.role}
                </p>

                {/* Brief Quote */}
                <p className="font-sans text-xs text-gray-400 italic line-clamp-3 mb-6 flex-grow leading-relaxed px-2">
                  "{leader.quote}"
                </p>

                {/* Bio / View Bio Trigger Button */}
                <button
                  onClick={() => setSelectedLeader(leader)}
                  className="mb-2 px-4 py-1.5 rounded-full border border-gray-800 group-hover:border-luxury-gold/30 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-luxury-gold bg-jet-black/50 hover:bg-luxury-gold/5 transition-all cursor-pointer"
                >
                  View Profile
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Leadership Profile Modal / Focus View */}
      {selectedLeader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-charcoal-card border-2 border-luxury-gold/50 max-w-2xl w-full rounded-lg overflow-hidden relative shadow-[0_20px_50px_rgba(212,175,55,0.25)]"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedLeader(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-luxury-gold font-sans font-bold text-lg p-2 transition-colors cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 items-center">
              {/* Leader Image */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div 
                  onClick={() => setExpandedImage(selectedLeader.image)}
                  className="w-40 h-40 rounded-full border-4 border-luxury-gold overflow-hidden relative shadow-lg cursor-zoom-in group/modal-img"
                >
                  <img
                    src={selectedLeader.image}
                    alt={selectedLeader.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/modal-img:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/modal-img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-luxury-gold" />
                  </div>
                </div>
              </div>

              {/* Leader Bio / Quote */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <span className="font-sans text-[9px] font-black uppercase tracking-[0.25em] text-luxury-gold bg-luxury-gold/5 border border-luxury-gold/20 px-2.5 py-1 rounded">
                    {selectedLeader.role}
                  </span>
                  <h3 className="font-display text-2xl font-black text-white uppercase mt-3 mb-1">
                    {selectedLeader.name}
                  </h3>
                  <div className="h-[1px] w-12 bg-luxury-gold mb-4" />
                  
                  <p className="font-sans text-sm text-gray-300 leading-relaxed mb-6">
                    {selectedLeader.bio}
                  </p>
                </div>

                <div className="bg-jet-black/60 p-4 rounded border-l-2 border-luxury-gold flex gap-3 items-start">
                  <Quote className="w-5 h-5 text-luxury-gold/40 shrink-0 transform -scale-x-100" />
                  <p className="font-display text-xs italic font-extrabold text-white leading-relaxed">
                    "{selectedLeader.quote}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer button to close */}
            <div className="bg-jet-black py-4 px-8 border-t border-gray-900 flex justify-end">
              <button
                onClick={() => setSelectedLeader(null)}
                className="px-6 py-2 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-wider text-xs uppercase rounded transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* High-Resolution Expanded Image Lightbox Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-zoom-out"
          >
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 transition-colors cursor-pointer z-50 bg-black/50 rounded-full border border-gray-800 hover:border-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-luxury-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={expandedImage}
                alt="Expanded view"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[85vh] object-contain block mx-auto"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
