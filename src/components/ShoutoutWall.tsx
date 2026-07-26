import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Send, Sparkles, Award, RotateCcw, AlertCircle } from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { Shoutout } from '../types';

export default function ShoutoutWall() {
  const { shoutouts, updateSection, resetToDefaults } = useCms();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<Shoutout['theme']>('gold-glow');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name.trim()) {
      setError('Name is required to register your elite card.');
      return;
    }
    if (!role.trim()) {
      setError('Role or Branch is required (e.g. Creative / Kumasi Chapter).');
      return;
    }
    if (!message.trim()) {
      setError('Please leave a meaningful shoutout message.');
      return;
    }
    if (message.length > 280) {
      setError('Shoutouts must be kept under 280 characters to preserve wall space.');
      return;
    }

    const newShoutout: Shoutout = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      message: message.trim(),
      timestamp: 'Just now',
      theme: theme,
      likes: 0,
      approved: false
    };

    const updated = [newShoutout, ...shoutouts];
    updateSection('shoutouts', updated).catch(err => {
      console.error("Failed to persist shoutout to server:", err);
    });

    // Reset Form & Show Success state
    setName('');
    setRole('');
    setMessage('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
  };

  const handleLike = (id: string) => {
    const updated = shoutouts.map((s) => {
      if (s.id === id) {
        return { ...s, likes: s.likes + 1 };
      }
      return s;
    });
    updateSection('shoutouts', updated).catch(err => {
      console.error("Failed to save like on server:", err);
    });
  };

  const handleReset = async () => {
    if (window.confirm('This will restore the entire CMS database back to factory default values. Proceed?')) {
      try {
        await resetToDefaults();
      } catch (err) {
        console.error("Failed to reset shoutouts board:", err);
      }
    }
  };

  // Card background styling based on theme state
  const getCardStyle = (cardTheme: Shoutout['theme']) => {
    switch (cardTheme) {
      case 'gold-glow':
        return 'border-2 border-luxury-gold gold-glow bg-charcoal-card';
      case 'minimalist':
        return 'border border-gray-800 bg-charcoal-card/85';
      case 'regal-banner':
        return 'border border-luxury-gold/40 bg-gradient-to-br from-charcoal-card to-jet-black relative before:content-[""] before:absolute before:top-0 before:right-0 before:w-16 before:h-16 before:bg-luxury-gold/5 before:rounded-bl-full';
      case 'charcoal-border':
        return 'border border-gray-900 bg-charcoal-card hover:border-luxury-gold/20 transition-all';
      default:
        return 'border border-gray-800 bg-charcoal-card';
    }
  };

  return (
    <section id="shoutouts" className="py-24 bg-jet-black relative overflow-hidden border-t border-gray-950">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-luxury-gold/3 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-luxury-gold block mb-3">
            Elite Voices
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
            SHOUTOUT WALL
          </h2>
          <div className="h-[2px] w-20 bg-luxury-gold mx-auto mb-6" />
          <p className="font-sans text-gray-400 text-sm leading-relaxed">
            Unite your voice with the global movement. Drop your signature, leave a custom elite card, and like other family members' shoutouts instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Interactive Creation Form */}
          <div className="lg:col-span-4 bg-charcoal-card border border-gray-900 rounded-lg p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative">
            
            {/* Corner Accent Sparkle */}
            <div className="absolute top-4 right-4 text-luxury-gold/20">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="font-display text-xl font-black text-white uppercase mb-1 tracking-wider">
              Register Your Card
            </h3>
            <p className="font-sans text-xs text-gray-400 mb-6 leading-relaxed">
              Become part of the global wall. Choose your visual card style and sign with pride.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Full Name / Alias
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwesi Wale SM"
                  maxLength={50}
                  className="bg-jet-black border border-gray-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-700"
                />
              </div>

              {/* Role Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Role / Branch Chapter
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Digital Artist / Accra Chapter"
                  maxLength={60}
                  className="bg-jet-black border border-gray-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-700"
                />
              </div>

              {/* Message Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Your Message
                  </label>
                  <span className={`font-mono text-[9px] ${
                    message.length > 250 ? 'text-red-500 font-bold' : 'text-gray-500'
                  }`}>
                    {message.length}/280
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write an inspiring shoutout, motto, or testimonial about De Elites movement legacy..."
                  maxLength={280}
                  rows={4}
                  className="bg-jet-black border border-gray-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-luxury-gold transition-colors placeholder:text-gray-700 resize-none"
                />
              </div>

              {/* Theme Customizer */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Card Theme Presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'gold-glow', label: 'Gold Glow', color: 'bg-luxury-gold' },
                    { id: 'minimalist', label: 'Minimalist', color: 'bg-gray-800' },
                    { id: 'regal-banner', label: 'Regal Banner', color: 'bg-gradient-to-br from-luxury-gold to-yellow-600' },
                    { id: 'charcoal-border', label: 'Charcoal', color: 'bg-gray-900 border border-gray-700' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTheme(preset.id as Shoutout['theme'])}
                      className={`h-8 rounded flex items-center justify-center text-[9px] uppercase font-bold tracking-widest border transition-all cursor-pointer ${
                        theme === preset.id
                          ? 'border-luxury-gold text-luxury-gold bg-luxury-gold/5 scale-105'
                          : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                      }`}
                      title={preset.label}
                    >
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${preset.color}`} />
                      {preset.id.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Signals */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 p-3 rounded">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Elite Card submitted! It will appear on the wall once approved by an admin.</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                POST SHOUTOUT CARD
              </button>
            </form>

            {/* Discreet Reset Button */}
            <div className="mt-6 pt-6 border-t border-gray-900 flex justify-between items-center text-[10px] text-gray-500">
              <span>Saved locally in browser storage</span>
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-widest font-black cursor-pointer"
                title="Reset local storage cards"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Wall
              </button>
            </div>
          </div>

          {/* Right Side: Shoutouts Grid Display */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[660px] overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {shoutouts.filter(s => s.approved !== false).map((shoutout) => (
                  <motion.div
                    key={shoutout.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className={`${getCardStyle(shoutout.theme)} p-6 rounded-lg flex flex-col justify-between shadow-lg relative group`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-display text-base font-black text-white uppercase tracking-wide">
                            {shoutout.name}
                          </h4>
                          <span className="font-sans text-[10px] uppercase tracking-widest text-luxury-gold font-bold">
                            {shoutout.role}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-jet-black flex items-center justify-center shrink-0 border border-gray-800">
                          <MessageSquare className="w-3.5 h-3.5 text-luxury-gold" />
                        </div>
                      </div>

                      {/* Card Message */}
                      <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed italic mb-6">
                        "{shoutout.message}"
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="border-t border-gray-900/60 pt-4 flex items-center justify-between">
                      <span className="font-sans text-[9px] uppercase tracking-wider text-gray-500 font-bold">
                        {shoutout.timestamp}
                      </span>

                      {/* Interactive Like Button */}
                      <button
                        onClick={() => handleLike(shoutout.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-jet-black hover:bg-luxury-gold/10 text-gray-400 hover:text-luxury-gold border border-gray-900 hover:border-luxury-gold/30 transition-all cursor-pointer group/like"
                      >
                        <Heart className="w-3 h-3 text-gray-500 group-hover/like:text-red-500 group-hover/like:fill-red-500 transition-colors" />
                        <span className="font-mono text-xs font-bold">
                          {shoutout.likes}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Grid Scroll Indicator */}
            {shoutouts.length > 4 && (
              <div className="text-center mt-6 text-[10px] uppercase font-bold tracking-[0.2em] text-gray-600 animate-pulse">
                ↑ Scroll up/down to see more elite family cards ↑
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
