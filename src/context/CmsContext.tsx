import React, { createContext, useContext, useState, useEffect } from 'react';
import { Pillar, Leader, GalleryItem, Shoutout, Member, EliteEvent, HeroConfig, CmsUser } from '../types';
import { fetchCmsData, updateCmsSection, resetCmsDatabase, saveCmsItem, deleteCmsItem, PerItemSection, CmsDatabase } from '../lib/cmsClient';
import { PILLARS, LEADERSHIP, GALLERY_ITEMS, DEFAULT_SHOUTOUTS, DEFAULT_MEMBERS, DEFAULT_EVENTS, DEFAULT_HERO } from '../data';

interface CmsContextType {
  pillars: Pillar[];
  leaders: Leader[];
  gallery: GalleryItem[];
  shoutouts: Shoutout[];
  members: Member[];
  events: EliteEvent[];
  hero: HeroConfig[];
  users: CmsUser[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateSection: <K extends keyof CmsDatabase>(type: K, data: CmsDatabase[K]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  // Save or delete a single Leader/GalleryItem/EliteEvent without resending
  // the rest of that section's array — see cmsClient.ts's saveCmsItem for why.
  saveItem: <K extends PerItemSection>(type: K, item: CmsDatabase[K][number]) => Promise<void>;
  deleteItem: (type: PerItemSection, id: string) => Promise<void>;
}

const CmsContext = createContext<CmsContextType | undefined>(undefined);

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const [pillars, setPillars] = useState<Pillar[]>(PILLARS);
  const [leaders, setLeaders] = useState<Leader[]>(LEADERSHIP);
  const [gallery, setGallery] = useState<GalleryItem[]>(GALLERY_ITEMS);
  const [shoutouts, setShoutouts] = useState<Shoutout[]>(DEFAULT_SHOUTOUTS);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [events, setEvents] = useState<EliteEvent[]>(DEFAULT_EVENTS);
  const [hero, setHero] = useState<HeroConfig[]>(DEFAULT_HERO);
  const [users, setUsers] = useState<CmsUser[]>([{ id: 'admin-1', username: 'admin', password: 'password', role: 'admin' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCmsData();
      
      // Update state with server data if available
      if (data.pillars && data.pillars.length > 0) setPillars(data.pillars);
      if (data.leaders && data.leaders.length > 0) setLeaders(data.leaders);
      if (data.gallery && data.gallery.length > 0) setGallery(data.gallery);
      if (data.shoutouts && data.shoutouts.length > 0) setShoutouts(data.shoutouts);
      if (data.members && data.members.length > 0) setMembers(data.members);
      if (data.events && data.events.length > 0) setEvents(data.events);
      if (data.hero && data.hero.length > 0) setHero(data.hero);
      if (data.users && data.users.length > 0) setUsers(data.users);
    } catch (err: any) {
      console.warn("Could not load database from backend, using default data fallbacks:", err);
      // Keep static defaults if server fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const updateSection = async <K extends keyof CmsDatabase>(type: K, data: CmsDatabase[K]) => {
    try {
      setError(null);
      const updatedData = await updateCmsSection(type, data);
      
      // Update state
      if (type === 'pillars') setPillars(updatedData as Pillar[]);
      else if (type === 'leaders') setLeaders(updatedData as Leader[]);
      else if (type === 'gallery') setGallery(updatedData as GalleryItem[]);
      else if (type === 'shoutouts') setShoutouts(updatedData as Shoutout[]);
      else if (type === 'members') setMembers(updatedData as Member[]);
      else if (type === 'events') setEvents(updatedData as EliteEvent[]);
      else if (type === 'hero') setHero(updatedData as HeroConfig[]);
      else if (type === 'users') setUsers(updatedData as CmsUser[]);
    } catch (err: any) {
      console.error(`Failed to update section ${type}:`, err);
      setError(err.message || `Failed to update section ${type}`);
      throw err;
    }
  };

  const saveItem = async <K extends PerItemSection>(type: K, item: CmsDatabase[K][number]) => {
    try {
      setError(null);
      const updated = await saveCmsItem(type, item);
      if (type === 'leaders') setLeaders(updated as Leader[]);
      else if (type === 'gallery') setGallery(updated as GalleryItem[]);
      else if (type === 'events') setEvents(updated as EliteEvent[]);
    } catch (err: any) {
      console.error(`Failed to save ${type} item:`, err);
      setError(err.message || `Failed to save ${type} item`);
      throw err;
    }
  };

  const deleteItem = async (type: PerItemSection, id: string) => {
    try {
      setError(null);
      const updated = await deleteCmsItem(type, id);
      if (type === 'leaders') setLeaders(updated as Leader[]);
      else if (type === 'gallery') setGallery(updated as GalleryItem[]);
      else if (type === 'events') setEvents(updated as EliteEvent[]);
    } catch (err: any) {
      console.error(`Failed to delete ${type} item:`, err);
      setError(err.message || `Failed to delete ${type} item`);
      throw err;
    }
  };

  const resetToDefaults = async () => {
    try {
      setError(null);
      const defaultDb: CmsDatabase = {
        pillars: PILLARS,
        leaders: LEADERSHIP,
        gallery: GALLERY_ITEMS,
        shoutouts: DEFAULT_SHOUTOUTS,
        members: DEFAULT_MEMBERS,
        events: DEFAULT_EVENTS,
        hero: DEFAULT_HERO,
        users: [{ id: 'admin-1', username: 'admin', password: 'password', role: 'admin' }]
      };
      await resetCmsDatabase(defaultDb);
      
      setPillars(PILLARS);
      setLeaders(LEADERSHIP);
      setGallery(GALLERY_ITEMS);
      setShoutouts(DEFAULT_SHOUTOUTS);
      setMembers(DEFAULT_MEMBERS);
      setEvents(DEFAULT_EVENTS);
      setHero(DEFAULT_HERO);
      setUsers([{ id: 'admin-1', username: 'admin', password: 'password', role: 'admin' }]);
    } catch (err: any) {
      console.error("Failed to reset database:", err);
      setError(err.message || "Failed to reset database");
      throw err;
    }
  };

  return (
    <CmsContext.Provider
      value={{
        pillars,
        leaders,
        gallery,
        shoutouts,
        members,
        events,
        hero,
        users,
        loading,
        error,
        refreshData,
        updateSection,
        resetToDefaults,
        saveItem,
        deleteItem
      }}
    >
      {children}
    </CmsContext.Provider>
  );
}

export function useCms() {
  const context = useContext(CmsContext);
  if (context === undefined) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
}
