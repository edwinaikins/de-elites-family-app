import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, X, ArrowRight } from 'lucide-react';
import { useCms } from '../context/CmsContext';

// Event dates are stored as free-text strings (e.g. "August 15, 2026"). We
// best-effort parse them with `new Date()`, filter to future dates, and sort
// ascending to find the soonest upcoming event. If nothing parses cleanly,
// the banner simply doesn't render rather than showing bad data.
function parseEventDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function UpcomingEventBanner() {
  const { events } = useCms();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const nextEvent = useMemo(() => {
    if (!events || events.length === 0) return null;

    const withDates = events
      .map((event) => ({ event, parsedDate: parseEventDate(event.date) }))
      .filter((e): e is { event: typeof events[number]; parsedDate: Date } => e.parsedDate !== null);

    const upcoming = withDates
      .filter((e) => e.parsedDate.getTime() >= new Date(new Date().toDateString()).getTime())
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    if (upcoming.length > 0) return upcoming[0].event;

    // Fall back to the first event with a parseable date if none are strictly future
    return withDates.length > 0 ? withDates[0].event : events[0];
  }, [events]);

  useEffect(() => {
    if (nextEvent && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [nextEvent, dismissed]);

  const scrollToEvents = () => {
    const section = document.getElementById('events');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  if (!nextEvent || dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 sm:max-w-sm"
        >
          <div className="bg-charcoal-card border border-luxury-gold/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-md">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="w-10 h-10 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4.5 h-4.5 text-luxury-gold animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-luxury-gold block mb-1">
                  Upcoming Event
                </span>
                <h4 className="font-display text-sm font-black text-white uppercase tracking-wide leading-tight line-clamp-2">
                  {nextEvent.title}
                </h4>
                <p className="font-mono text-[11px] text-gray-400 mt-1.5">
                  {nextEvent.date} &middot; {nextEvent.time}
                </p>
                <button
                  onClick={scrollToEvents}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-luxury-gold hover:underline cursor-pointer"
                >
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => setDismissed(true)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer shrink-0 p-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
