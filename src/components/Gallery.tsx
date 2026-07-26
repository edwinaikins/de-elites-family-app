import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Calendar, Award, Crown, MapPin, ExternalLink } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { GalleryItem } from '../types';

export default function Gallery() {
  const { gallery, events } = useCms();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const categories = ['All', 'Legacy', 'Community', 'Philanthropy', 'Movement', 'Events'];

  // Merge event photos into the gallery grid as display-only items, tagged 'Events'
  const eventGalleryItems: GalleryItem[] = (events || []).map((event) => ({
    id: `event-${event.id}`,
    title: event.title,
    category: 'Events',
    image: event.image,
    description: event.description,
    date: event.date,
  }));

  const combinedItems = [...gallery, ...eventGalleryItems];

  const filteredItems = activeFilter === 'All'
    ? combinedItems
    : combinedItems.filter(item => item.category === activeFilter);

  return (
    <section id="legacy-gallery" className="py-24 bg-jet-black relative overflow-hidden border-t border-gray-950">
      {/* Subtle glowing sphere background */}
      <div className="absolute right-10 bottom-10 w-[400px] h-[400px] rounded-full bg-luxury-gold/2 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header & Interactive Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-xl text-center md:text-left">
            <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
              Elite Milestones
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
              LEGACY GALLERY
            </h2>
            <div className="h-[2px] w-20 bg-luxury-gold mb-6 md:mx-0 mx-auto" />
            <p className="font-sans text-gray-400 text-sm leading-relaxed">
              Witnessing our mission in action. Explore the visual history of the philanthropic, communal, and social empowerment projects executed worldwide.
            </p>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 bg-charcoal-card p-1.5 rounded-lg border border-gray-900/80">
            {categories.map((category) => {
              const isActive = activeFilter === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`px-4 py-2 rounded text-xs font-black tracking-widest uppercase transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-black shadow-[0_2px_10px_rgba(212,175,55,0.2)]'
                      : 'text-gray-400 hover:text-white hover:bg-jet-black/50'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Masonry Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                onClick={() => setSelectedItem(item)}
                className="group relative bg-charcoal-card border border-gray-900 rounded-lg overflow-hidden cursor-pointer hover:border-luxury-gold/30 transition-all duration-300 shadow-md hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
              >
                {/* Image Wrap */}
                <div className="relative overflow-hidden aspect-video sm:aspect-square lg:aspect-video">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* Subtle Top Luxury Gold Linear Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-jet-black via-black/35 to-transparent opacity-80 group-hover:via-black/20 transition-all duration-300" />
                  
                  {/* Category Badge */}
                  <span className="absolute top-4 left-4 font-sans text-[9px] font-black uppercase tracking-[0.2em] text-black bg-luxury-gold px-2.5 py-1 rounded">
                    {item.category}
                  </span>
                </div>

                {/* Info Overlay / Footer Card */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-luxury-gold" />
                    <span className="font-mono text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                      {item.date}
                    </span>
                  </div>
                  
                  <h3 className="font-display text-lg font-extrabold text-white group-hover:text-luxury-gold transition-colors uppercase tracking-wide line-clamp-1">
                    {item.title}
                  </h3>
                  
                  <p className="font-sans text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-900/60 flex items-center justify-between">
                    <span className="font-sans text-[10px] font-black uppercase tracking-widest text-luxury-gold group-hover:underline flex items-center gap-1.5">
                      Explore Impact
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Gallery Spotlight Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-charcoal-card border border-luxury-gold/40 max-w-3xl w-full max-h-[92vh] sm:max-h-[90vh] rounded-lg overflow-y-auto overscroll-contain relative shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            {/* Close */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-luxury-gold font-sans font-bold text-lg p-2 transition-colors cursor-pointer z-20 bg-black/60 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
            >
              ✕
            </button>

            {/* Showcase Image */}
            <div className="relative aspect-video w-full">
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 font-sans text-[10px] font-black uppercase tracking-[0.25em] text-black bg-luxury-gold px-3 py-1 rounded">
                {selectedItem.category}
              </span>
            </div>

            {/* Details */}
            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-2.5 text-gray-500 mb-3">
                <Calendar className="w-4 h-4 text-luxury-gold" />
                <span className="font-mono text-xs uppercase tracking-widest text-gray-400 font-bold">
                  {selectedItem.date}
                </span>
                <span className="text-gray-700 hidden sm:inline">•</span>
                <span className="font-sans text-xs uppercase tracking-widest text-luxury-gold font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> {selectedItem.category === 'Events' ? 'Upcoming Event' : 'Approved Project'}
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4">
                {selectedItem.title}
              </h3>

              <div className="h-[1px] w-20 bg-luxury-gold mb-6" />

              <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed">
                {selectedItem.description}
              </p>

              {/* Impact Callout block */}
              <div className="mt-8 bg-jet-black/60 border border-gray-900/80 p-4 sm:p-5 rounded flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-luxury-gold" />
                </div>
                <div>
                  <h4 className="font-display text-xs font-black uppercase tracking-widest text-luxury-gold">
                    {selectedItem.category === 'Events' ? 'Assembly Overview' : 'Movement Impact Summary'}
                  </h4>
                  <p className="font-sans text-xs text-gray-400 mt-1 leading-relaxed">
                    {selectedItem.category === 'Events'
                      ? 'This is one of our upcoming sovereign assemblies. Head to the Upcoming Events section for full date, time, and location details.'
                      : 'This project is a cornerstone of our community empowerment model. Fully supported by collective contributions, De Elites Family ensures direct allocation, transparent auditing, and sustainable execution for all local initiatives.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-jet-black/80 p-4 sm:p-6 border-t border-gray-900 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2.5 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
