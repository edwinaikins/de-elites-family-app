import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MemberAccount, MemberProfileUpdate } from '../types';
import { memberLogin, fetchMyProfile, updateMyProfile } from '../lib/memberClient';

const TOKEN_STORAGE_KEY = 'def_member_token';

interface MemberAuthContextType {
  member: MemberAccount | null;
  token: string | null;
  loading: boolean;
  isPortalOpen: boolean;
  openPortal: () => void;
  closePortal: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateBio: (update: MemberProfileUpdate) => Promise<void>;
  // Set for exactly one portal-open when the page itself was loaded at
  // /request-access (see the mount effect below) — lets MemberPortalModal
  // jump straight to the "Request Access" form instead of the login
  // screen, so a link posted in the WhatsApp group can open right onto the
  // form with no extra taps. Consumed (cleared) the moment it's acted on.
  requestAccessIntent: boolean;
  clearRequestAccessIntent: () => void;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [member, setMember] = useState<MemberAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [requestAccessIntent, setRequestAccessIntent] = useState(false);

  const openPortal = useCallback(() => setIsPortalOpen(true), []);
  const closePortal = useCallback(() => setIsPortalOpen(false), []);
  const clearRequestAccessIntent = useCallback(() => setRequestAccessIntent(false), []);

  // A direct link to the "Request Access" form — /request-access — opens
  // the site, lands here, and pops the portal straight into that form.
  // Checked once on load only; the URL is cleaned up immediately after so
  // a refresh (or sharing the resulting plain "/" link) doesn't re-trigger
  // it, and nothing about the rest of routing in this (router-less) SPA
  // depends on the path staying at /request-access.
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, '') === '/request-access') {
      window.history.replaceState({}, '', '/');
      setRequestAccessIntent(true);
      setIsPortalOpen(true);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMember(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchMyProfile(token);
        if (!cancelled) setMember(profile);
      } catch (err) {
        // Token expired/invalid — silently log out rather than looping errors.
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (username: string, password: string) => {
    const { token: newToken, member: newMember } = await memberLogin(username, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setMember(newMember);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await fetchMyProfile(token);
    setMember(profile);
  }, [token]);

  const updateBio = useCallback(
    async (update: MemberProfileUpdate) => {
      if (!token) throw new Error('Not logged in.');
      const updated = await updateMyProfile(token, update);
      setMember(updated);
    },
    [token]
  );

  return (
    <MemberAuthContext.Provider
      value={{
        member, token, loading, isPortalOpen, openPortal, closePortal, login, logout, refreshProfile, updateBio,
        requestAccessIntent, clearRequestAccessIntent,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
}
