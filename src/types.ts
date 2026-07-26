export interface Pillar {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  quote: string;
}

export interface Leader {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  bio: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Legacy' | 'Community' | 'Philanthropy' | 'Movement';
  image: string;
  description: string;
  date: string;
  isVideo?: boolean;
}

export interface Shoutout {
  id: string;
  name: string;
  role: string;
  message: string;
  timestamp: string;
  theme: 'gold-glow' | 'minimalist' | 'regal-banner' | 'charcoal-border';
  likes: number;
  approved?: boolean;
}

export interface Member {
  id: string;
  name: string;
  chapter: string;
  role: string;
  image: string;
  bio: string;
  joinedDate: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    github?: string;
  };
  featured?: boolean;
}

export interface EliteEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  category: 'Meeting' | 'Summit' | 'Concert' | 'Community' | 'Launch';
  buttonText?: string;
  buttonLink?: string;
}

export interface HeroConfig {
  id: string;
  title: string;
  slogan: string;
  description: string;
  joinButtonText: string;
  exploreButtonText: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  logo?: string;
}

export interface CmsUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'moderator';
}



