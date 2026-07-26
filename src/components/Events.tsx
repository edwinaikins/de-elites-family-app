import React from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Crown, ArrowUpRight, Tag, CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { useEventPayments } from '../hooks/useEventPayments';
import { usePaymentsConfig } from '../hooks/usePaymentsConfig';

export default function Events() {
  const { events } = useCms();
  const { paidEventIds, payingId, errorById, payForEvent } = useEventPayments();
  const { mock: mockPayments } = usePaymentsConfig();

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
                        Pay &amp; Register — {event.currency || 'GHS'} {event.price.toFixed(2)}
                      </button>
                    )
                  ) : event.buttonLink ? (
                    <a
                      href={event.buttonLink}
                      target={event.buttonLink.startsWith('#') ? undefined : '_blank'}
                      rel={event.buttonLink.startsWith('#') ? undefined : 'noopener noreferrer'}
                      className="w-full py-3 rounded bg-charcoal-card border border-gray-800 hover:border-luxury-gold text-white hover:text-luxury-gold font-sans font-black tracking-widest text-xs uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {event.buttonText || 'Register'}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
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
    </section>
  );
}
