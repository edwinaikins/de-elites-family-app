import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, X, Eye, ShieldAlert } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { Member } from '../types';

export default function MembersList() {
  const { members } = useCms();
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Filtered members list
  const filteredMembers = members.filter(member => {
    return member.name.toLowerCase().includes(search.toLowerCase()) ||
           member.role.toLowerCase().includes(search.toLowerCase()) ||
           member.bio.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <section id="members" className="py-24 bg-[#0a0a0a] relative overflow-hidden border-t border-gray-950">
      {/* Decorative luxury gradient sphere */}
      <div className="absolute left-10 bottom-10 w-[500px] h-[500px] rounded-full bg-luxury-gold/2 blur-[130px] pointer-events-none" />
      <div className="absolute right-10 top-1/4 w-[300px] h-[300px] rounded-full bg-luxury-gold/3 blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Title & Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
              The Sovereign Crew
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
              MEMBER DIRECTORY
            </h2>
            <div className="h-[2px] w-20 bg-luxury-gold mb-6 md:mx-0 mx-auto" />
            <p className="font-sans text-gray-400 text-sm leading-relaxed">
              Meet the global citizens, sound architects, digital innovators, and creators building the empire.
            </p>
          </div>
        </div>

        {/* Dynamic Toolbar: Search */}
        <div className="bg-charcoal-card p-4 rounded-lg border border-gray-900 mb-10 max-w-xl mx-auto shadow-md">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, craft, or biography..."
              className="w-full bg-jet-black border border-gray-800 rounded pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Members Dynamic Grid */}
        {filteredMembers.length === 0 ? (
          <div className="bg-charcoal-card border border-gray-900 rounded-lg py-16 px-6 text-center max-w-xl mx-auto">
            <ShieldAlert className="w-12 h-12 text-luxury-gold/40 mx-auto mb-4 animate-bounce" />
            <h3 className="font-display text-lg font-black text-white uppercase tracking-wider mb-2">
              No Member Found
            </h3>
            <p className="font-sans text-xs text-gray-500 leading-relaxed">
              No elite members match "{search}". Try adjusting your filters or be the first to register in this category!
            </p>
          </div>
        ) : (
          <div className="border border-gray-900/60 bg-charcoal-card/10 rounded-xl p-6 md:p-8 shadow-inner max-h-[680px] overflow-y-auto pr-4">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.4 }}
                    className="group flex flex-col items-center text-center p-6 bg-charcoal-card/30 border border-gray-900/60 hover:border-luxury-gold/20 rounded-xl relative overflow-hidden transition-all duration-500 shadow-md hover:shadow-[0_15px_40px_rgba(0,0,0,0.85)] w-full cursor-pointer"
                  >
                    {/* Circular Profile Frame */}
                    <div className="w-36 h-36 relative mb-6 shrink-0">
                      {/* Outer Golden Border Effect */}
                      <div className="absolute inset-[-1px] rounded-full border-2 border-luxury-gold/60 z-10 transition-all duration-300 group-hover:border-luxury-gold" />

                      {/* Circular Image Frame */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImage(member.image);
                        }}
                        className="w-full h-full rounded-full overflow-hidden border-4 border-charcoal-card relative z-20 cursor-zoom-in"
                      >
                        <img
                          src={member.image}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-display text-base font-black text-white uppercase tracking-wider group-hover:text-luxury-gold transition-colors mb-1 leading-tight line-clamp-1">
                      {member.name}
                    </h3>

                    {/* Role Title */}
                    <p className="font-sans text-[10px] font-black uppercase tracking-[0.2em] text-luxury-gold mb-4 line-clamp-1">
                      {member.role}
                    </p>

                    {/* View Profile Trigger Button */}
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="mt-auto px-4 py-1.5 rounded-full border border-gray-800 group-hover:border-luxury-gold/30 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-luxury-gold bg-jet-black/50 hover:bg-luxury-gold/5 transition-all cursor-pointer"
                    >
                      View Profile
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* Directory Count Indicator */}
        <div className="mt-12 border-t border-gray-900/50 pt-6 flex justify-between items-center text-[11px] text-gray-600">
          <span className="uppercase tracking-wider">
            Total Members: <span className="text-luxury-gold font-bold">{members.length}</span> Sovereign Elites
          </span>
        </div>

      </div>

      {/* Member Profile Dossier Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-charcoal-card border-2 border-luxury-gold/50 max-w-lg w-full rounded-lg overflow-hidden relative shadow-[0_20px_50px_rgba(212,175,55,0.2)]"
          >
            {/* Close */}
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-luxury-gold font-sans font-bold text-lg p-2 transition-colors cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                {/* Large Photo */}
                <div 
                  onClick={() => setExpandedImage(selectedMember.image)}
                  className="w-28 h-28 rounded-full overflow-hidden border-4 border-luxury-gold shrink-0 shadow-lg cursor-zoom-in group/modal-img relative"
                >
                  <img
                    src={selectedMember.image}
                    alt={selectedMember.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/modal-img:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/modal-img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-luxury-gold" />
                  </div>
                </div>

                {/* Main dossier title */}
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-black bg-luxury-gold px-2.5 py-0.5 rounded">
                      Member
                    </span>
                  </div>

                  <h3 className="font-display text-2xl font-black text-white uppercase mt-2 mb-1">
                    {selectedMember.name}
                  </h3>
                  
                  <p className="font-sans text-xs font-black uppercase tracking-widest text-luxury-gold">
                    {selectedMember.role}
                  </p>
                </div>
              </div>

              <div className="h-[1px] w-full bg-gray-900/60 mb-6" />

              {/* Detailed Bio */}
              <h4 className="font-display text-[10px] font-black uppercase tracking-widest text-luxury-gold mb-2">
                PERSONAL CREED & BIOGRAPHY
              </h4>
              <p className="font-sans text-sm text-gray-300 leading-relaxed bg-jet-black/40 p-4 rounded border-l border-luxury-gold/40 italic">
                "{selectedMember.bio}"
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-jet-black py-4 px-8 border-t border-gray-900 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-6 py-2 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-wider text-xs uppercase rounded transition-colors cursor-pointer"
              >
                Close Dossier
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
