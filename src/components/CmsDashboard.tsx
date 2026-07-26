import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Save, Plus, Trash2, Shield, Crown,
  RefreshCw, Heart, ShieldCheck, Users, Flame,
  Award, Compass, Image, Calendar,
  X, Check, RotateCcw, MessageSquare, AlertCircle, LogOut,
  UserCheck, Loader2, Mail, Phone
} from 'lucide-react';
import { useCms } from '../context/CmsContext';
import { ImageUpload } from './ImageUpload';
import { Pillar, Leader, GalleryItem, Shoutout, EliteEvent, HeroConfig, CmsUser, MemberApplication } from '../types';
import { fetchMemberApplications, updateMemberApplicationStatus, deleteMemberApplication } from '../lib/cmsClient';

interface CmsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'pillars' | 'leaders' | 'gallery' | 'shoutouts' | 'events' | 'hero' | 'users' | 'applications';

export default function CmsDashboard({ isOpen, onClose }: CmsDashboardProps) {
  const {
    pillars, leaders, gallery, shoutouts, events, hero, users,
    updateSection, resetToDefaults, loading, error
  } = useCms();

  const [activeTab, setActiveTab] = useState<TabType>('pillars');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Local editable copies of states
  const [localPillars, setLocalPillars] = useState<Pillar[]>([]);
  const [localLeaders, setLocalLeaders] = useState<Leader[]>([]);
  const [localGallery, setLocalGallery] = useState<GalleryItem[]>([]);
  const [localShoutouts, setLocalShoutouts] = useState<Shoutout[]>([]);
  const [localEvents, setLocalEvents] = useState<EliteEvent[]>([]);
  const [localHero, setLocalHero] = useState<HeroConfig[]>([]);
  const [localUsers, setLocalUsers] = useState<CmsUser[]>([]);

  // Prospective member applications (kept out of the CmsDatabase/useCms mechanism
  // for privacy — fetched from a dedicated, non-public endpoint)
  const [applications, setApplications] = useState<MemberApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  // Track currently active item for editing or "new" state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('cms_authenticated') === 'true');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // New user credentials state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator'>('moderator');

  // Initialize local copies when modal is opened or tab is switched
  React.useEffect(() => {
    if (isOpen) {
      setLocalPillars([...pillars]);
      setLocalLeaders([...leaders]);
      setLocalGallery([...gallery]);
      setLocalShoutouts([...shoutouts]);
      setLocalEvents([...events]);
      setLocalHero([...hero]);
      setLocalUsers([...(users || [])]);
      setSelectedItemId(null);
      setIsAddingNew(false);
      setLocalError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, pillars, leaders, gallery, shoutouts, events, hero, users]);

  React.useEffect(() => {
    setSelectedItemId(null);
    setIsAddingNew(false);
    setLocalError(null);
  }, [activeTab]);

  // Load prospective member applications when that tab is opened
  React.useEffect(() => {
    if (isOpen && activeTab === 'applications') {
      setApplicationsLoading(true);
      setApplicationsError(null);
      fetchMemberApplications()
        .then(setApplications)
        .catch((err: any) => setApplicationsError(err.message || 'Failed to load applications'))
        .finally(() => setApplicationsLoading(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const triggerNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Generic Save handler for the whole section
  const handleSaveSection = async (tab: TabType) => {
    setSaveLoading(true);
    setLocalError(null);
    try {
      if (tab === 'pillars') {
        await updateSection('pillars', localPillars);
      } else if (tab === 'leaders') {
        await updateSection('leaders', localLeaders);
      } else if (tab === 'gallery') {
        await updateSection('gallery', localGallery);
      } else if (tab === 'shoutouts') {
        await updateSection('shoutouts', localShoutouts);
      } else if (tab === 'events') {
        await updateSection('events', localEvents);
      } else if (tab === 'hero') {
        await updateSection('hero', localHero);
      } else if (tab === 'users') {
        await updateSection('users', localUsers);
      }
      triggerNotification(`Successfully saved ${tab} changes to server!`);
    } catch (err: any) {
      setLocalError(err.message || `Failed to save ${tab} changes`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm("WARNING: This will overwrite your CMS server database with the application's default factory data. This cannot be undone. Proceed?")) {
      setSaveLoading(true);
      try {
        await resetToDefaults();
        // Update local arrays
        setLocalPillars([...pillars]);
        setLocalLeaders([...leaders]);
        setLocalGallery([...gallery]);
        setLocalShoutouts([...shoutouts]);
        setLocalEvents([...events]);
        setLocalHero([...hero]);
        setLocalUsers([...users]);
        setSelectedItemId(null);
        setIsAddingNew(false);
        triggerNotification("Database reset to defaults successfully!");
      } catch (err: any) {
        setLocalError(err.message || "Failed to reset database");
      } finally {
        setSaveLoading(false);
      }
    }
  };

  // --- CRUD HELPERS FOR INDIVIDUAL TABS ---

  // PILLARS CRUD
  const handlePillarChange = (id: string, field: keyof Pillar, value: any) => {
    setLocalPillars(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // LEADERS CRUD
  const handleLeaderChange = (id: string, field: string, value: any) => {
    setLocalLeaders(prev => prev.map(l => {
      if (l.id === id) {
        if (field.startsWith('socials.')) {
          const socialKey = field.split('.')[1];
          return {
            ...l,
            socials: {
              ...(l.socials || {}),
              [socialKey]: value
            }
          };
        }
        return { ...l, [field]: value };
      }
      return l;
    }));
  };

  const handleAddLeader = () => {
    const newLeader: Leader = {
      id: `leader-${Date.now()}`,
      name: "New Leader Name",
      role: "Board Role",
      quote: "Sovereign quote...",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400",
      bio: "A brief bio about the leader's contributions...",
      socials: { twitter: "", instagram: "", facebook: "" }
    };
    setLocalLeaders(prev => [...prev, newLeader]);
    setSelectedItemId(newLeader.id);
    setIsAddingNew(true);
  };

  const handleDeleteLeader = (id: string) => {
    if (window.confirm("Are you sure you want to delete this leader profile?")) {
      setLocalLeaders(prev => prev.filter(l => l.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  // GALLERY CRUD
  const handleGalleryChange = (id: string, field: keyof GalleryItem, value: any) => {
    setLocalGallery(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAddGalleryItem = () => {
    const newItem: GalleryItem = {
      id: `g-${Date.now()}`,
      title: "New Project Event Title",
      category: "Legacy",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500",
      description: "Describe this milestone accomplishment here...",
      date: "Current Month 2026"
    };
    setLocalGallery(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setIsAddingNew(true);
  };

  const handleDeleteGalleryItem = (id: string) => {
    if (window.confirm("Are you sure you want to delete this gallery item?")) {
      setLocalGallery(prev => prev.filter(g => g.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  // APPLICATIONS ACTIONS (server-backed, not part of local CmsDatabase state)
  const handleApplicationStatusChange = async (id: string, status: MemberApplication['status']) => {
    try {
      const updated = await updateMemberApplicationStatus(id, status);
      setApplications(prev => prev.map(a => a.id === id ? updated : a));
      triggerNotification(`Application marked as ${status}.`);
    } catch (err: any) {
      setApplicationsError(err.message || 'Failed to update application status');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application?")) return;
    try {
      await deleteMemberApplication(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    } catch (err: any) {
      setApplicationsError(err.message || 'Failed to delete application');
    }
  };

  // AUTHENTICATION & SECURITY LOGIC
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Both username and password are required.');
      return;
    }
    const found = users?.find(
      u => u.username.toLowerCase() === loginUsername.trim().toLowerCase() && u.password === loginPassword.trim()
    );
    if (found) {
      setIsAuthenticated(true);
      sessionStorage.setItem('cms_authenticated', 'true');
      sessionStorage.setItem('cms_user', JSON.stringify(found));
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cms_authenticated');
    sessionStorage.removeItem('cms_user');
  };

  const handleDeleteUser = (id: string) => {
    const user = localUsers.find(u => u.id === id);
    if (!user) return;
    if (user.username === 'admin') {
      alert('The primary default "admin" user cannot be deleted to prevent accidental locking out.');
      return;
    }
    const loggedUserStr = sessionStorage.getItem('cms_user');
    if (loggedUserStr) {
      const loggedUser = JSON.parse(loggedUserStr);
      if (loggedUser.id === id) {
        alert('You cannot delete your own logged-in user account.');
        return;
      }
    }
    if (window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
      setLocalUsers(prev => prev.filter(u => u.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  // SHOUTOUTS CRUD
  const handleShoutoutChange = (id: string, field: keyof Shoutout, value: any) => {
    setLocalShoutouts(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAddShoutout = () => {
    const newShoutout: Shoutout = {
      id: `s-${Date.now()}`,
      name: "Sovereign Contributor",
      role: "Leader / Accra Chapter",
      message: "Leave an official statement or testimony...",
      timestamp: "Just now",
      theme: "gold-glow",
      likes: 5
    };
    setLocalShoutouts(prev => [newShoutout, ...prev]);
    setSelectedItemId(newShoutout.id);
    setIsAddingNew(true);
  };

  const handleDeleteShoutout = (id: string) => {
    if (window.confirm("Are you sure you want to delete this shoutout message?")) {
      setLocalShoutouts(prev => prev.filter(s => s.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  // EVENTS CRUD
  const handleEventChange = (id: string, field: keyof EliteEvent, value: any) => {
    setLocalEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddEvent = () => {
    const newEvent: EliteEvent = {
      id: `event-${Date.now()}`,
      title: "New Epic Event Title",
      date: "August 15, 2026",
      time: "6:00 PM GMT",
      location: "Accra, Ghana",
      description: "A summary of the upcoming sovereign family event, mission meetup, or music concert.",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500",
      category: "Summit",
      buttonText: "Reserve Seat",
      buttonLink: "#contact"
    };
    setLocalEvents(prev => [newEvent, ...prev]);
    setSelectedItemId(newEvent.id);
    setIsAddingNew(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      setLocalEvents(prev => prev.filter(e => e.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  const handleHeroChange = (field: keyof HeroConfig, value: string) => {
    setLocalHero(prev => {
      if (prev.length === 0) {
        return [{
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
          [field]: value
        }];
      }
      return prev.map(h => h.id === 'hero-config' ? { ...h, [field]: value } : h);
    });
  };


  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0d0d0d] border border-luxury-gold rounded-lg p-8 shadow-[0_20px_50px_rgba(0,0,0,0.95)] relative animate-fade-in"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full border border-luxury-gold flex items-center justify-center bg-charcoal-card mx-auto mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Shield className="w-8 h-8 text-luxury-gold animate-pulse" />
            </div>
            <h2 className="font-display text-xl font-black text-white uppercase tracking-wider">
              Elite Access Control
            </h2>
            <p className="font-sans text-[9px] text-luxury-gold uppercase tracking-[0.2em] mt-1 font-bold">
              Secure CMS Administrator Console
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                Username / Alias
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. admin"
                className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold placeholder:text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                Security Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-jet-black border border-gray-800 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-luxury-gold placeholder:text-gray-700"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">
                <AlertCircle className="shrink-0 w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Authorize Credentials
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            Default credentials are set to <span className="text-gray-400">admin / password</span>
          </div>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
      
      {/* CMS Dashboard Wrapper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="w-full h-full max-w-7xl mx-auto flex flex-col bg-[#0d0d0d] border border-gray-900 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
      >
        
        {/* Header bar */}
        <header className="px-6 py-4 bg-jet-black border-b border-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-luxury-gold/15 rounded border border-luxury-gold/30">
              <Settings className="w-5 h-5 text-luxury-gold animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-black bg-luxury-gold px-1.5 py-0.5 rounded">
                  Admin System
                </span>
                <span className="text-gray-500 font-mono text-[10px]">v1.2</span>
              </div>
              <h2 className="font-display text-lg font-black text-white uppercase tracking-wider">
                DE ELITES CMS BACKEND
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.8 rounded border border-gray-800 bg-charcoal-card hover:bg-gray-900 text-gray-400 hover:text-white font-sans font-bold tracking-wider text-[10px] uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Logout from CMS"
            >
              <LogOut className="w-3.5 h-3.5 text-luxury-gold" />
              Logout
            </button>

            {/* Reset Factory button */}
            <button
              onClick={handleResetToDefaults}
              className="px-3.5 py-1.8 rounded border border-red-900/30 bg-red-950/15 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-sans font-bold tracking-wider text-[10px] uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset server DB back to hardcoded defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Server DB
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white bg-jet-black/60 border border-gray-950 rounded hover:border-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Central Layout Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT Sidebar: Categories list */}
          <aside className="w-64 bg-jet-black border-r border-gray-900 flex flex-col justify-between shrink-0">
            <div className="p-4 space-y-1">
              <span className="font-sans text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 block px-2 mb-3">
                Content Modules
              </span>
              {[
                { type: 'pillars', label: '1. Core Pillars', count: localPillars.length, desc: 'Love, Loyalty, Unity' },
                { type: 'leaders', label: '2. Leadership', count: localLeaders.length, desc: 'Patrons & Council' },
                { type: 'gallery', label: '3. Legacy Gallery', count: localGallery.length, desc: 'Milestone Events' },
                { type: 'shoutouts', label: '4. Shoutout Wall', count: localShoutouts.length, desc: 'Community Voice' },
                { type: 'events', label: '5. Upcoming Events', count: localEvents.length, desc: 'Concerts & Summits' },
                { type: 'hero', label: '6. Hero & Branding', count: localHero.length, desc: 'Title, Logo & Stats' },
                { type: 'users', label: '7. User Accounts', count: localUsers.length, desc: 'Manage CMS Users' },
                { type: 'applications', label: '8. Applications', count: applications.length, desc: 'Prospective Members' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setActiveTab(item.type as TabType)}
                  className={`w-full text-left px-3 py-3 rounded transition-all cursor-pointer flex items-center justify-between border ${
                    activeTab === item.type
                      ? 'bg-luxury-gold/10 text-luxury-gold border-luxury-gold/30'
                      : 'text-gray-400 hover:text-white bg-transparent border-transparent hover:bg-gray-900/20'
                  }`}
                >
                  <div>
                    <span className="font-sans text-xs font-black uppercase tracking-wider block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5 font-sans truncate max-w-[150px]">
                      {item.desc}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-black/60 text-gray-400 px-2 py-0.5 rounded border border-gray-900 font-bold">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Status */}
            <div className="p-4 border-t border-gray-900 bg-[#070707] text-[10px] text-gray-600 font-mono flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>DATABASE STATUS:</span>
                <span className="text-green-500 font-bold">● PERSISTENT</span>
              </div>
              <div className="flex justify-between">
                <span>ENGINE:</span>
                <span>JSON-FILE / EXPRESS</span>
              </div>
              <div className="flex justify-between">
                <span>PORT INGRESS:</span>
                <span>3000</span>
              </div>
            </div>
          </aside>

          {/* MAIN Workspace Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
            
            {/* Sub-Header Actions */}
            <div className="px-6 py-3 bg-jet-black/50 border-b border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Editing Module:
                </span>
                <span className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest">
                  {activeTab}
                </span>
              </div>

              {/* Action and Save buttons */}
              <div className="flex items-center gap-3">
                {activeTab !== 'pillars' && activeTab !== 'hero' && activeTab !== 'applications' && (
                  <button
                    onClick={() => {
                      if (activeTab === 'leaders') handleAddLeader();
                      else if (activeTab === 'gallery') handleAddGalleryItem();
                      else if (activeTab === 'shoutouts') handleAddShoutout();
                      else if (activeTab === 'events') handleAddEvent();
                    }}
                    className="px-3.5 py-1.5 rounded bg-jet-black border border-gray-800 hover:border-luxury-gold/50 text-white hover:text-luxury-gold font-sans font-black tracking-widest text-[10px] uppercase transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Entry
                  </button>
                )}

                {activeTab !== 'applications' && (
                  <button
                    onClick={() => handleSaveSection(activeTab)}
                    disabled={saveLoading}
                    className="px-4 py-2 rounded bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] hover:shadow-[0_2px_15px_rgba(212,175,55,0.4)] disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    {saveLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save All {activeTab}
                  </button>
                )}
              </div>
            </div>

            {/* Error / Success feedback bar */}
            {localError && (
              <div className="bg-red-950/20 border-b border-red-900/30 px-6 py-2.5 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{localError}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-green-950/20 border-b border-green-900/30 px-6 py-2.5 text-xs text-green-400 flex items-center gap-2">
                <Crown className="w-4 h-4 text-luxury-gold shrink-0 animate-spin" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tab Inner Contents - Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* PILLARS MODULE VIEW */}
              {activeTab === 'pillars' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="bg-charcoal-card p-4 rounded border border-gray-900 text-xs text-gray-400 leading-relaxed">
                    🌟 <strong>Core Pillars Info:</strong> Core pillars form the foundational backbone of the De Elites Family philosophy. For visual safety, these items are mapped specifically to design icons. You can update the titles, quotes, and descriptive copy of each pillar.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {localPillars.map((p, index) => (
                      <div key={p.id} className="bg-charcoal-card p-5 border border-gray-900 rounded-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-900/80 pb-2">
                          <span className="font-mono text-[10px] text-luxury-gold font-bold">
                            PILLAR ID: {p.id.toUpperCase()}
                          </span>
                          <span className="font-sans text-[10px] font-black uppercase text-gray-500">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Pillar Name</label>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => handlePillarChange(p.id, 'name', e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Display Icon</label>
                            <select
                              value={p.icon}
                              onChange={(e) => handlePillarChange(p.id, 'icon', e.target.value)}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                            >
                              <option value="Heart">Heart (Love)</option>
                              <option value="ShieldCheck">Shield (Loyalty)</option>
                              <option value="Users">Users (Unity)</option>
                              <option value="Flame">Flame (Passion)</option>
                              <option value="Award">Award (Respect)</option>
                              <option value="Compass">Compass (Community)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Pillar Creed Quote</label>
                          <input
                            type="text"
                            value={p.quote}
                            onChange={(e) => handlePillarChange(p.id, 'quote', e.target.value)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold italic"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Full Description</label>
                          <textarea
                            value={p.description}
                            onChange={(e) => handlePillarChange(p.id, 'description', e.target.value)}
                            rows={3}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* LEADERS MODULE VIEW */}
              {activeTab === 'leaders' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Council list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Leadership Profiles
                    </span>
                    {localLeaders.map((leader) => (
                      <div
                        key={leader.id}
                        onClick={() => setSelectedItemId(leader.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === leader.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={leader.image}
                            alt={leader.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-gray-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {leader.name}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500 truncate">
                              {leader.role}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLeader(leader.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Council editor form */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localLeaders.find(l => l.id === selectedItemId) ? (
                      (() => {
                        const leader = localLeaders.find(l => l.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT LEADERSHIP CARD
                              </h3>
                              <span className="text-[10px] font-mono text-gray-500">
                                ID: {leader.id}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Leader Name</label>
                                <input
                                  type="text"
                                  value={leader.name}
                                  onChange={(e) => handleLeaderChange(leader.id, 'name', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Administrative Role</label>
                                <input
                                  type="text"
                                  value={leader.role}
                                  onChange={(e) => handleLeaderChange(leader.id, 'role', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <ImageUpload
                              value={leader.image}
                              onChange={(val) => handleLeaderChange(leader.id, 'image', val)}
                              label="Council Leader Photo"
                              description="Drag and drop or click to upload a photo for this leader."
                              aspectRatio="avatar"
                            />

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Sovereign Statement / Quote</label>
                              <input
                                type="text"
                                value={leader.quote}
                                onChange={(e) => handleLeaderChange(leader.id, 'quote', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold italic"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Biography / Credentials</label>
                              <textarea
                                value={leader.bio}
                                onChange={(e) => handleLeaderChange(leader.id, 'bio', e.target.value)}
                                rows={4}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>

                            {/* Social Handles */}
                            <div className="pt-3 border-t border-gray-900">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                                Social Channels (Optional URLs)
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  placeholder="Instagram Link"
                                  value={leader.socials?.instagram || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.instagram', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                                <input
                                  type="text"
                                  placeholder="Twitter Link"
                                  value={leader.socials?.twitter || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.twitter', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                                <input
                                  type="text"
                                  placeholder="Facebook Link"
                                  value={leader.socials?.facebook || ''}
                                  onChange={(e) => handleLeaderChange(leader.id, 'socials.facebook', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Shield className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select a leadership profile on the left side to edit credentials or add a new council member.
                      </div>
                    )}
                  </div>

                </div>
              )}


              {/* GALLERY MODULE VIEW */}
              {activeTab === 'gallery' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Milestones list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Legacy Projects & Milestones
                    </span>
                    {localGallery.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === item.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-8 rounded object-cover border border-gray-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {item.title}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500">
                              {item.category} • {item.date}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGalleryItem(item.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Milestones editor */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localGallery.find(g => g.id === selectedItemId) ? (
                      (() => {
                        const item = localGallery.find(g => g.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT MILESTONE EVENT
                              </h3>
                              <span className="text-[10px] font-mono text-gray-500">
                                ID: {item.id}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Milestone Title</label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleGalleryChange(item.id, 'title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Category Tag</label>
                                <select
                                  value={item.category}
                                  onChange={(e) => handleGalleryChange(item.id, 'category', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                                >
                                  <option value="Legacy">Legacy</option>
                                  <option value="Community">Community</option>
                                  <option value="Philanthropy">Philanthropy</option>
                                  <option value="Movement">Movement</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Date Display</label>
                                <input
                                  type="text"
                                  value={item.date}
                                  placeholder="e.g. March 2026"
                                  onChange={(e) => handleGalleryChange(item.id, 'date', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <ImageUpload
                              value={item.image}
                              onChange={(val) => handleGalleryChange(item.id, 'image', val)}
                              label="Banner Image / Cover Photo"
                              description="Drag and drop or click to upload a banner image for this milestone."
                              aspectRatio="banner"
                            />

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Milestone Summary Description</label>
                              <textarea
                                value={item.description}
                                onChange={(e) => handleGalleryChange(item.id, 'description', e.target.value)}
                                rows={5}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Image className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select a milestone event on the left side to edit details or log a new community event.
                      </div>
                    )}
                  </div>

                </div>
              )}


              {/* SHOUTOUTS MODULE VIEW */}
              {activeTab === 'shoutouts' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Shoutouts list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Shoutout Posts
                    </span>
                    {localShoutouts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedItemId(post.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === post.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold text-xs font-black shrink-0">
                            SM
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                                {post.name}
                              </h4>
                              {post.approved === false ? (
                                <span className="text-[8px] px-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase rounded tracking-wider shrink-0">
                                  Pending
                                </span>
                              ) : (
                                <span className="text-[8px] px-1.5 bg-green-500/10 border border-green-500/20 text-green-500 font-bold uppercase rounded tracking-wider shrink-0">
                                  Approved
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[9px] text-gray-500 truncate mt-0.5">
                              "{post.message}"
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteShoutout(post.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Shoutouts editor */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localShoutouts.find(s => s.id === selectedItemId) ? (
                      (() => {
                        const post = localShoutouts.find(s => s.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT SHOUTOUT MESSAGE
                              </h3>
                              <span className="text-[10px] font-mono text-gray-500">
                                ID: {post.id}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Sender Name</label>
                                <input
                                  type="text"
                                  value={post.name}
                                  onChange={(e) => handleShoutoutChange(post.id, 'name', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Sender Role / Branch</label>
                                <input
                                  type="text"
                                  value={post.role}
                                  onChange={(e) => handleShoutoutChange(post.id, 'role', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Visual Theme</label>
                                <select
                                  value={post.theme}
                                  onChange={(e) => handleShoutoutChange(post.id, 'theme', e.target.value as any)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                                >
                                  <option value="gold-glow">Gold Glow</option>
                                  <option value="minimalist">Minimalist</option>
                                  <option value="regal-banner">Regal Banner</option>
                                  <option value="charcoal-border">Charcoal Border</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Likes Count</label>
                                <input
                                  type="number"
                                  value={post.likes}
                                  onChange={(e) => handleShoutoutChange(post.id, 'likes', parseInt(e.target.value) || 0)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</label>
                                <input
                                  type="text"
                                  value={post.timestamp}
                                  onChange={(e) => handleShoutoutChange(post.id, 'timestamp', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Shoutout Message (max 280 chars)</label>
                              <textarea
                                value={post.message}
                                onChange={(e) => handleShoutoutChange(post.id, 'message', e.target.value)}
                                rows={5}
                                maxLength={280}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>

                            {/* Moderator Approval Card */}
                            <div className="bg-jet-black border border-gray-900 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                              <div className="flex items-center gap-3">
                                {post.approved === false ? (
                                  <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/30 text-amber-500 shrink-0">
                                    <AlertCircle className="w-5 h-5 animate-pulse" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30 text-green-500 shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-display text-xs font-black uppercase tracking-wider text-white">
                                    {post.approved === false ? 'PENDING APPROVAL MODERATION' : 'SHOUTOUT APPROVED'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 max-w-md mt-0.5 leading-relaxed">
                                    {post.approved === false 
                                      ? 'This elite card is currently hidden from the public shoutout wall. Click approve below to release it.' 
                                      : 'This elite card is currently visible on the public shoutout wall. You can withdraw approval at any time.'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {post.approved === false ? (
                                  <button
                                    type="button"
                                    onClick={() => handleShoutoutChange(post.id, 'approved', true)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-[10px] font-sans font-black tracking-widest uppercase rounded cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    APPROVE CARD
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleShoutoutChange(post.id, 'approved', false)}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-sans font-black tracking-widest uppercase rounded cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    WITHDRAW APPROVAL
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <MessageSquare className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select a shoutout post on the left side to edit details or log a new official testimony.
                      </div>
                    )}
                  </div>

                </div>
              )}


              {/* EVENTS MODULE VIEW */}
              {activeTab === 'events' && (
                <div className="grid grid-cols-3 gap-6 h-full items-start">
                  
                  {/* Events list */}
                  <div className="col-span-1 bg-charcoal-card rounded border border-gray-900 p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                      Upcoming Events
                    </span>
                    {localEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedItemId(event.id)}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                          selectedItemId === event.id
                            ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                            : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded bg-luxury-gold/15 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold text-[10px] font-black shrink-0">
                            EV
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                              {event.title}
                            </h4>
                            <p className="font-sans text-[9px] text-gray-500 truncate">
                              {event.date} • {event.location}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Events editor */}
                  <div className="col-span-2 bg-charcoal-card rounded border border-gray-900 p-6">
                    {selectedItemId && localEvents.find(e => e.id === selectedItemId) ? (
                      (() => {
                        const event = localEvents.find(e => e.id === selectedItemId)!;
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-4">
                              <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                EDIT UPCOMING EVENT
                              </h3>
                              <span className="text-[10px] font-mono text-gray-500">
                                ID: {event.id}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Title</label>
                              <input
                                type="text"
                                value={event.title}
                                onChange={(e) => handleEventChange(event.id, 'title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Date</label>
                                <input
                                  type="text"
                                  value={event.date}
                                  onChange={(e) => handleEventChange(event.id, 'date', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Event Time</label>
                                <input
                                  type="text"
                                  value={event.time}
                                  onChange={(e) => handleEventChange(event.id, 'time', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Location</label>
                                <input
                                  type="text"
                                  value={event.location}
                                  onChange={(e) => handleEventChange(event.id, 'location', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
                                <select
                                  value={event.category}
                                  onChange={(e) => handleEventChange(event.id, 'category', e.target.value as any)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                                >
                                  <option value="Meeting">Meeting</option>
                                  <option value="Summit">Summit</option>
                                  <option value="Concert">Concert</option>
                                  <option value="Community">Community</option>
                                  <option value="Launch">Launch</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">CTA Button Text</label>
                                <input
                                  type="text"
                                  value={event.buttonText || ''}
                                  onChange={(e) => handleEventChange(event.id, 'buttonText', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">CTA Button Link</label>
                                <input
                                  type="text"
                                  value={event.buttonLink || ''}
                                  onChange={(e) => handleEventChange(event.id, 'buttonLink', e.target.value)}
                                  className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                />
                              </div>
                            </div>

                            <ImageUpload
                              value={event.image}
                              onChange={(val) => handleEventChange(event.id, 'image', val)}
                              label="Event Banner / Cover Image"
                              description="Drag and drop or click to upload a banner image for this event."
                              aspectRatio="banner"
                            />

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                              <textarea
                                value={event.description}
                                onChange={(e) => handleEventChange(event.id, 'description', e.target.value)}
                                rows={4}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none"
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-gray-500 text-xs">
                        <Calendar className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                        Select an event card on the left side to edit details or log a new official upcoming event.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'hero' && (
                <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto">
                  <div className="bg-charcoal-card border border-gray-900 rounded-lg p-6 space-y-6">
                    <div>
                      <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1">
                        Hero Branding & Copy
                      </h4>
                      <p className="text-[10px] text-gray-500 font-sans">
                        Customize the main identity text, slogan, and mission statement displayed at the top of the portal.
                      </p>
                    </div>

                    {(() => {
                      const heroItem = localHero[0] || {
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

                      return (
                        <div className="space-y-4 text-xs">
                          {/* Logo Upload Field */}
                          <div className="bg-jet-black border border-gray-900 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full border border-luxury-gold bg-charcoal-card overflow-hidden flex items-center justify-center shrink-0">
                                {heroItem.logo ? (
                                  <img src={heroItem.logo} alt="Portal Logo" className="w-full h-full object-cover" />
                                ) : (
                                  <Flame className="w-8 h-8 text-luxury-gold" />
                                )}
                              </div>
                              <div>
                                <h5 className="font-display text-xs font-black text-white uppercase tracking-wider">
                                  PORTAL MAIN LOGO
                                </h5>
                                <p className="text-[10px] text-gray-500 max-w-sm">
                                  Upload a PNG or JPG file. It will replace the default flame icon in both the Navbar and Footer immediately.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <label className="px-3.5 py-2 bg-charcoal-card border border-gray-800 hover:border-luxury-gold rounded text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-white cursor-pointer transition-colors whitespace-nowrap">
                                Choose File
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        handleHeroChange('logo', reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {heroItem.logo && (
                                <button
                                  type="button"
                                  onClick={() => handleHeroChange('logo', '')}
                                  className="px-3 py-2 border border-red-900/30 bg-red-950/10 hover:bg-red-950/40 text-red-400 text-[10px] uppercase font-black tracking-widest rounded transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Remove Logo
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Main Title</label>
                              <input
                                type="text"
                                value={heroItem.title}
                                onChange={(e) => handleHeroChange('title', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Slogan</label>
                              <input
                                type="text"
                                value={heroItem.slogan}
                                onChange={(e) => handleHeroChange('slogan', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Mission Description</label>
                            <textarea
                              value={heroItem.description}
                              onChange={(e) => handleHeroChange('description', e.target.value)}
                              rows={4}
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold resize-none leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-900">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Join CTA Button Text</label>
                              <input
                                type="text"
                                value={heroItem.joinButtonText}
                                onChange={(e) => handleHeroChange('joinButtonText', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Explore CTA Button Text</label>
                              <input
                                type="text"
                                value={heroItem.exploreButtonText}
                                onChange={(e) => handleHeroChange('exploreButtonText', e.target.value)}
                                className="bg-jet-black border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-luxury-gold"
                              />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-gray-900">
                            <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-3">
                              Statistics Counters
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 1 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat1Value}
                                    onChange={(e) => handleHeroChange('stat1Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 1 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat1Label}
                                    onChange={(e) => handleHeroChange('stat1Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 2 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat2Value}
                                    onChange={(e) => handleHeroChange('stat2Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 2 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat2Label}
                                    onChange={(e) => handleHeroChange('stat2Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 3 Value</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat3Value}
                                    onChange={(e) => handleHeroChange('stat3Value', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-gray-500">Stat 3 Label</label>
                                  <input
                                    type="text"
                                    value={heroItem.stat3Label}
                                    onChange={(e) => handleHeroChange('stat3Label', e.target.value)}
                                    className="bg-jet-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Registered users list card */}
                    <div className="col-span-1 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                      <div>
                        <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                          CMS Registered Users ({localUsers.length})
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          A listing of administrative staff currently authorized with secure workspace control.
                        </p>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {localUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 rounded bg-jet-black border border-gray-850 flex items-center justify-between gap-3 group hover:border-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded bg-luxury-gold/15 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold text-xs font-black shrink-0">
                                {user.role === 'admin' ? 'AD' : 'MD'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-display text-xs font-black uppercase text-white truncate">
                                  {user.username}
                                </h4>
                                <p className="font-sans text-[9px] text-gray-500 truncate capitalize">
                                  {user.role}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Provisioning form card */}
                    <div className="col-span-1 lg:col-span-2 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-6">
                      <div>
                        <h4 className="font-display text-sm font-black text-luxury-gold uppercase tracking-widest mb-1">
                          PROVISION SECURE USER ACCOUNT
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          Grant editing clearance to moderators, chapters leads, or other elite administration.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Username / Alias</label>
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="e.g. moderator_accra"
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Access Password</label>
                            <input
                              type="text"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Choose secure password..."
                              className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-400">Authorization Clearance</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="bg-jet-black border border-gray-800 rounded px-3 py-2.5 text-xs text-white focus:outline-none focus:border-luxury-gold cursor-pointer"
                          >
                            <option value="moderator">Moderator (Full Content Editing Permissions)</option>
                            <option value="admin">Administrator (Full Content Editing + User Management)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newUsername.trim() || !newPassword.trim()) {
                              alert('Please provide both username and password.');
                              return;
                            }
                            if (localUsers.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
                              alert('This username is already taken.');
                              return;
                            }
                            const newUser: CmsUser = {
                              id: `user-${Date.now()}`,
                              username: newUsername.trim(),
                              password: newPassword.trim(),
                              role: newUserRole
                            };
                            setLocalUsers(prev => [...prev, newUser]);
                            setNewUsername('');
                            setNewPassword('');
                            setNewUserRole('moderator');
                            triggerNotification('User account created locally. Remember to click "Save User Section" below to persist changes to the server database.');
                          }}
                          className="px-5 py-3 bg-luxury-gold hover:bg-luxury-gold-dark text-black font-sans font-black tracking-widest text-[10px] uppercase rounded transition-colors cursor-pointer"
                        >
                          Add User Account
                        </button>
                      </div>

                      <div className="pt-6 border-t border-gray-900 flex items-center justify-between">
                        <p className="text-[9px] text-gray-500 font-sans max-w-sm">
                          * Changes made to registered accounts must be saved to the backend database to become live.
                        </p>
                        <button
                          type="button"
                          disabled={saveLoading}
                          onClick={() => handleSaveSection('users')}
                          className="px-5 py-3 bg-gradient-to-r from-luxury-gold to-luxury-gold-dark text-black font-sans font-black tracking-widest text-xs uppercase rounded transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          {saveLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          Save User Section
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* APPLICATIONS MODULE VIEW */}
              {activeTab === 'applications' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Applications list card */}
                    <div className="col-span-1 bg-charcoal-card rounded-lg border border-gray-900 p-6 space-y-4">
                      <div>
                        <h4 className="font-display text-xs font-black text-luxury-gold uppercase tracking-widest mb-1">
                          Prospective Members ({applications.length})
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans">
                          Submissions from the "Join the Movement" application form on the public site.
                        </p>
                      </div>

                      {applicationsLoading ? (
                        <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-luxury-gold/50" />
                          Loading applications...
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 text-xs">
                          <UserCheck className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                          No applications submitted yet.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {applications.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedItemId(app.id)}
                              className={`p-3 rounded border flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                                selectedItemId === app.id
                                  ? 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-gold'
                                  : 'bg-jet-black border-transparent hover:border-gray-800 text-gray-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="font-display text-xs font-black uppercase truncate leading-tight">
                                  {app.fullName}
                                </h4>
                                <p className="font-sans text-[9px] text-gray-500 truncate">
                                  {app.occupation} • {app.residence}
                                </p>
                                <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                  app.status === 'approved' ? 'bg-green-950/40 text-green-400' :
                                  app.status === 'rejected' ? 'bg-red-950/40 text-red-400' :
                                  'bg-gray-800 text-gray-400'
                                }`}>
                                  {app.status}
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteApplication(app.id);
                                }}
                                className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-1 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Application detail card */}
                    <div className="col-span-1 lg:col-span-2 bg-charcoal-card rounded-lg border border-gray-900 p-6">
                      {applicationsError && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mb-4">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{applicationsError}</span>
                        </div>
                      )}

                      {selectedItemId && applications.find(a => a.id === selectedItemId) ? (
                        (() => {
                          const app = applications.find(a => a.id === selectedItemId)!;
                          return (
                            <div className="space-y-5">
                              <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-2">
                                <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">
                                  {app.fullName} {app.nickname && <span className="text-luxury-gold">"{app.nickname}"</span>}
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500">
                                  Submitted {new Date(app.submittedAt).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <DetailRow label="Date of Birth" value={app.dob} />
                                <DetailRow label="Gender" value={app.gender} />
                                <DetailRow label="Occupation" value={app.occupation} />
                                <DetailRow label="Residence" value={app.residence} />
                                <DetailRow label="Phone" value={app.phone} icon={<Phone className="w-3 h-3" />} />
                                <DetailRow label="Email" value={app.email} icon={<Mail className="w-3 h-3" />} />
                                {app.socialHandles && <DetailRow label="Socials" value={app.socialHandles} />}
                                {app.referrer && <DetailRow label="Referred By" value={app.referrer} />}
                                <DetailRow label="Prior Group Member" value={app.priorGroupMember ? (app.priorGroupDetail || 'Yes') : 'No'} />
                                <DetailRow label="Activity Level" value={app.activityLevel} />
                                <DetailRow label="Financial Support" value={app.willingToSupportFinancially ? 'Yes' : 'No'} />
                                <DetailRow label="Agrees to Rules" value={app.agreesToRulesAndDiscipline ? 'Yes' : 'No'} />
                              </div>

                              <div>
                                <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                  Reason for Joining
                                </label>
                                <p className="text-xs text-gray-300 leading-relaxed bg-jet-black border border-gray-900 rounded p-3">
                                  {app.reasonForJoining}
                                </p>
                              </div>

                              {app.contributionAreas.length > 0 && (
                                <div>
                                  <label className="font-sans text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                    Contribution Areas
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {app.contributionAreas.map((area) => (
                                      <span key={area} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20">
                                        {area}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-4 border-t border-gray-900 flex flex-wrap items-center gap-2.5">
                                <button
                                  onClick={() => handleApplicationStatusChange(app.id, 'approved')}
                                  disabled={app.status === 'approved'}
                                  className="px-4 py-2 rounded bg-green-950/30 border border-green-900/40 text-green-400 hover:bg-green-950/50 font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApplicationStatusChange(app.id, 'rejected')}
                                  disabled={app.status === 'rejected'}
                                  className="px-4 py-2 rounded bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/50 font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                                {app.status !== 'pending' && (
                                  <button
                                    onClick={() => handleApplicationStatusChange(app.id, 'pending')}
                                    className="px-4 py-2 rounded bg-jet-black border border-gray-800 text-gray-400 hover:text-white font-sans font-black tracking-widest text-[10px] uppercase transition-colors cursor-pointer"
                                  >
                                    Reset to Pending
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-24 text-center text-gray-500 text-xs">
                          <UserCheck className="w-8 h-8 text-luxury-gold/25 mx-auto mb-3" />
                          Select an application on the left side to review its details.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </main>

        </div>

      </motion.div>

    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <span className="text-gray-300 flex items-center gap-1.5 break-words">
        {icon && <span className="text-luxury-gold shrink-0">{icon}</span>}
        {value}
      </span>
    </div>
  );
}
