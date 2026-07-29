import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, MapPin, Clock, Crown, Tag, CreditCard, CheckCircle2, AlertCircle, Loader2,
  Images, ChevronLeft, ChevronRight, PlayCircle, X,
} from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { useEventPayments } from '../hooks/useEventPayments';
import { useEventRsvp } from '../hooks/useEventRsvp';
import { usePaymentsConfig } from '../hooks/usePaymentsConfig';
import { EliteEvent, EventRsvpResponse } from '../types';

const RSVP_LABEL: Record<EventRsvpResponse, string> = { yes: 'Yes, Attending', no: 'Not Attending', maybe: 'Maybe' };

export default function Events() {
  const { events } = useCms();
  const { paidEventIds, payingId, errorById, payForEvent } = useEventPayments();
  const { rsvpByEventId, submittingId: rsvpSubmittingId, errorById: rsvpErrorById, rsvpForEvent } = useEventRsvp();
  const { mock: mockPayments } = usePaymentsConfig();
  const [galleryEvent, setGalleryEvent] = useState<EliteEvent | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [rsvpPopupEvent, setRsvpPopupEvent] = useState<EliteEvent | null>(null);

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section id="events" className="py-24 relative overflow-hidden bg-gradient-to-b from-[#050505] to-[#0b0b0b] border-y border-gray-900">
      {/* Background ambient lighting accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold text-[10px] font-mono tracking-widest uppercase mb-4"
          >
            <Crown className="w-3.5 h-3.5 animate-pulse" />
            <span>Sovereign Assemblies</span>
          </motion.div>

          {mockPayments && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                Test Mode — payments are simulated
              </span>
            </div>
          )}

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4"
          >
            UPCOMING <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-luxury-gold-dark">EVENTS</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans text-gray-400 text-sm md:text-base leading-relaxed"
          >
            Join the De Elites Family across our premium activations, global leadership summits, high-energy music festivals, and community-building blueprints.
          </motion.p>
        </div>

        {/* Dynamic Grid */}
        {events && events.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {events.map((event) => (
              <motion.div
                key={event.id}
                variants={cardVariants}
                className="group bg-charcoal-card border border-gray-900 rounded-xl overflow-hidden hover:border-luxury-gold/30 transition-all duration-300 flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.08)]"
              >
                <div>
                  {/* Event Banner Image with Category Badge */}
                  <div className="h-52 relative overflow-hidden bg-black/60">
                    <img
                      src={event.image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500'}
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
                    
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/90 border border-luxury-gold/30 text-luxury-gold text-[9px] font-mono font-bold uppercase tracking-wider backdrop-blur-sm">
                        <Tag className="w-3 h-3" />
                        {event.category}
                      </span>
                    </div>
                  </div>

                  {/* Info details */}
                  <div className="p-6 space-y-4">
                    <h3 className="font-display text-xl font-black text-white uppercase tracking-wide group-hover:text-luxury-gold transition-colors leading-tight line-clamp-2">
                      {event.title}
                    </h3>

                    <p className="font-sans text-gray-400 text-xs leading-relaxed line-clamp-3">
                      {event.description}
                    </p>

                    {/* Metadata indicators */}
                    <div className="pt-4 border-t border-gray-900/60 space-y-2.5 text-xs text-gray-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-luxury-gold/80 shrink-0" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-luxury-gold/80 shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-luxury-gold/80 shrink-0" />
                        <span className="truncate" title={event.location}>{event.location}</span>
                      </div>
                    </div>

                    {event.media && event.media.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setGalleryEvent(event); setActiveMediaIndex(0); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded border border-gray-800 hover:border-luxury-gold/50 text-gray-400 hover:text-luxury-gold text-[10px] font-sans font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <Images className="w-3.5 h-3.5" />
                        View Gallery ({event.media.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Registration / Payment */}
                <div className="px-6 pb-6 space-y-2">
                  {errorById[event.id] && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorById[event.id]}</span>
                    </div>
                  )}
                  {rsvpErrorById[event.id] && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{rsvpErrorById[event.id]}</span>
                    </div>
                  )}

                  {event.price && event.price > 0 ? (
                    paidEventIds.has(event.id) ? (
                      <div className="w-full py-3 rounded bg-green-950/20 border border-green-900/40 text-green-400 font-sans font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Registered
                      </div>
                    ) : (
                      <button
                        onClick={() => payForEvent(event.id)}
                        disabled={payingId === event.id}
                        className="w-full py-3 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {payingId === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {event.payButtonText || 'Make Payments'} — {event.currency || 'GHS'} {event.price.toFixed(2)}
                      </button>
                    )
                  ) : rsvpByEventId[event.id] ? (
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 py-3 rounded border font-sans font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 ${
                        rsvpByEventId[event.id] === 'yes' ? 'bg-green-950/20 border-green-900/40 text-green-400'
                        : rsvpByEventId[event.id] === 'no' ? 'bg-red-950/20 border-red-900/40 text-red-400'
                        : 'bg-yellow-950/20 border-yellow-900/40 text-yellow-400'
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                        {RSVP_LABEL[rsvpByEventId[event.id]]}
                      </div>
                      <button
                        onClick={() => setRsvpPopupEvent(event)}
                        className="shrink-0 px-3 py-3 rounded border border-gray-800 hover:border-luxury-gold/50 text-gray-400 hover:text-luxury-gold text-[10px] font-sans font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRsvpPopupEvent(event)}
                      disabled={rsvpSubmittingId === event.id}
                      className="w-full py-3 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {rsvpSubmittingId === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirm Attendance
                    </button>
                  )}
                </div>

              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-charcoal-card border border-gray-900 rounded-xl max-w-md mx-auto">
            <Calendar className="w-12 h-12 text-luxury-gold/30 mx-auto mb-4" />
            <h4 className="font-display text-lg font-black text-white uppercase tracking-wide mb-2">No Active Events Scheduled</h4>
            <p className="font-sans text-xs text-gray-500 px-6">We are currently mapping the next generation of legacy assemblies. Check back soon or register as a visionary to get alerted.</p>
          </div>
        )}

      </div>

      {/* Per-event photo/video gallery lightbox */}
      {galleryEvent && (() => {
        const media = galleryEvent.media || [];
        const active = media[activeMediaIndex];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setGalleryEvent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-charcoal-card border border-luxury-gold/40 max-w-4xl w-full max-h-[92vh] rounded-lg overflow-y-auto overscroll-contain relative shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
            >
              <button
                onClick={() => setGalleryEvent(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:text-luxury-gold font-sans font-bold text-lg p-2 transition-colors cursor-pointer z-20 bg-black/60 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
              >
                ✕
              </button>

              {/* Main viewer */}
              <div className="relative w-full aspect-video bg-black">
                {active && (
                  active.isVideo ? (
                    <video
                      key={active.id}
                      src={active.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      key={active.id}
                      src={active.url}
                      alt={galleryEvent.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  )
                )}

                {media.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveMediaIndex((i) => (i - 1 + media.length) % media.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveMediaIndex((i) => (i + 1) % media.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Header + thumbnails */}
              <div className="p-5 sm:p-6">
                <h3 className="font-display text-lg sm:text-xl font-black text-white uppercase tracking-tight mb-1">
                  {galleryEvent.title}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-4">
                  {galleryEvent.date} • {media.length} file{media.length === 1 ? '' : 's'}
                </p>

                {media.length > 1 && (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {media.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveMediaIndex(i)}
                        className={`relative aspect-square rounded overflow-hidden border-2 transition-all cursor-pointer ${
                          i === activeMediaIndex ? 'border-luxury-gold' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {m.isVideo ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <PlayCircle className="w-4 h-4 text-luxury-gold" />
                          </div>
                        ) : (
                          <img src={m.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* RSVP Yes/No/Maybe popup for free events */}
      {rsvpPopupEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setRsvpPopupEvent(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-charcoal-card border border-luxury-gold/40 max-w-sm w-full rounded-lg p-6 relative shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            <button
              onClick={() => setRsvpPopupEvent(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1">
              Confirm Attendance
            </h3>
            <p className="font-sans text-white text-sm font-bold mb-6 leading-snug">{rsvpPopupEvent.title}</p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={async () => { const ev = rsvpPopupEvent; setRsvpPopupEvent(null); if (ev) await rsvpForEvent(ev.id, 'yes'); }}
                className="w-full py-3 rounded bg-green-950/20 border border-green-900/40 hover:border-green-500/60 text-green-400 font-sans font-black tracking-widest text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Yes, Attending
              </button>
              <button
                onClick={async () => { const ev = rsvpPopupEvent; setRsvpPopupEvent(null); if (ev) await rsvpForEvent(ev.id, 'maybe'); }}
                className="w-full py-3 rounded bg-yellow-950/20 border border-yellow-900/40 hover:border-yellow-500/60 text-yellow-400 font-sans font-black tracking-widest text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Maybe
              </button>
              <button
                onClick={async () => { const ev = rsvpPopupEvent; setRsvpPopupEvent(null); if (ev) await rsvpForEvent(ev.id, 'no'); }}
                className="w-full py-3 rounded bg-red-950/20 border border-red-900/40 hover:border-red-500/60 text-red-400 font-sans font-black tracking-widest text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Not Attending
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
