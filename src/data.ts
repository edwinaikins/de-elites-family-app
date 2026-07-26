import { Pillar, Leader, GalleryItem, Shoutout, Member, EliteEvent, HeroConfig } from './types';

export const PILLARS: Pillar[] = [
  {
    id: 'love',
    name: 'Love',
    description: 'The foundation of our brotherhood. We nurture genuine relationships, lift each other in times of need, and express absolute care for our community members.',
    icon: 'Heart',
    quote: 'Love is the ultimate force that binds De Elites together as one.'
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    description: 'Uncompromising allegiance to our family and our shared mission. We stand shoulder to shoulder, through every storm and triumph, honoring our word.',
    icon: 'ShieldCheck',
    quote: 'True loyalty is not passive; it is a shield forged in the fire of shared struggle.'
  },
  {
    id: 'unity',
    name: 'Unity',
    description: 'A fragmented house cannot stand. We merge our individual strengths into a single, unstoppable collective voice, forged entirely by our own resolve.',
    icon: 'Users',
    quote: 'Separated we are whispers; united we are an absolute roar.'
  },
  {
    id: 'passion',
    name: 'Passion',
    description: 'The burning desire to excel, create, and revolutionize. We approach our work, music, art, and businesses with raw, high-octane energy.',
    icon: 'Flame',
    quote: 'Our passion is the fuel that keeps the Elites fire burning day and night.'
  },
  {
    id: 'respect',
    name: 'Respect',
    description: 'Honoring the journey of every individual. We respect our elders, support our peers, and pay homage to the foundations laid down before us.',
    icon: 'Award',
    quote: 'Respect is earned through character, consistency, and honor.'
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Lifting as we climb. We create opportunities, fund local educational and creative endeavors, and serve as a beacon of hope for the next generation.',
    icon: 'Compass',
    quote: 'The success of the Elite is measured by the progress of our neighborhood.'
  }
];

export const LEADERSHIP: Leader[] = [
  {
    id: 'leader-1',
    name: 'Marcus "The Sovereign" Bediako',
    role: 'The Founding Patron & Supreme Leader',
    quote: 'Hustle is my signature, royalty is my birthright. De Elites Family is the heartbeat of the streets and the boardrooms combined.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'The visionary founder of street-smart musical royalty. Inspiring millions with unwavering drive, direct leadership, and global impact, establishing a blueprint of self-made legacy.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com'
    }
  },
  {
    id: 'leader-2',
    name: 'Chief Alhaji Rahman',
    role: 'Executive Chairman & Global Convener',
    quote: 'True leadership isn\'t about commands; it is about building a table large enough for everyone who has the heart to build with us.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'A visionary strategist who bridges corporate structure with grassroots street advocacy. Managing international alliances, legacy funds, and administrative strategy.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com'
    }
  },
  {
    id: 'leader-3',
    name: 'Lady Nicole Appiah',
    role: 'Director of Community & Philanthropy',
    quote: 'We do not build walls to keep others out. We build bridges to pull our community into the light of absolute economic and creative independence.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Spearheading the educational scholarship drives and localized relief funds. Dedicated to turning creative raw talent into sustainable, respected industry careers.',
    socials: {
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com'
    }
  },
  {
    id: 'leader-4',
    name: 'Kofi "Major" Mensah',
    role: 'Chief Operations Officer',
    quote: 'Execution is the only currency that never devalues. Our vision is massive, and our operations must remain clean, swift, and standard.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Overseeing local chapters across four continents. Leading mobilization, event security, project timelines, and coordinating high-energy regional meetups.',
    socials: {
      twitter: 'https://twitter.com',
      facebook: 'https://facebook.com'
    }
  },
  {
    id: 'leader-5',
    name: 'Kwame "Hype" Mensah',
    role: 'Chief Communications Officer',
    quote: 'Our voice must cut through the noise with raw conviction and absolute clarity. The Elite message is a movement of sovereign hope.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Overseeing global public relations, media announcements, and digital brand voice. Building dynamic promotional campaigns to extend the De Elites Family legacy.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com'
    }
  },
  {
    id: 'leader-6',
    name: 'Dr. Emmanuel Boateng',
    role: 'Director of Research & Strategic Tech',
    quote: 'Technology is the ultimate equalizer. When street-smart drive meets robust code and data strategy, we build generational dominance.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Leading our digital expansion, automated platforms, and crypto/fintech training. Dedicated to training local youth in code, smart contracts, and data-driven careers.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com'
    }
  },
  {
    id: 'leader-7',
    name: 'Aisha Sarpong',
    role: 'Global Treasurer & Fund Administrator',
    quote: 'Financial discipline isn\'t about limiting growth; it is about paving a secure highway for our massive philanthropic ambitions.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Managing our legacy endowment funds, scholarship allocations, and local treasury operations. Ensuring absolute auditing compliance across our global network.',
    socials: {
      instagram: 'https://instagram.com'
    }
  },
  {
    id: 'leader-8',
    name: 'DJ Miller',
    role: 'Global Music Director & Legacy DJ',
    quote: 'Music is the spiritual vehicle of our struggle and our success. We keep the rhythms high-energy, raw, and absolutely regal.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Directing the sound profile of our events and managing our creative recording labs. Curating official family playlists, performance tracks, and street mixtapes.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com'
    }
  },
  {
    id: 'leader-9',
    name: 'Desmond "Desz" Cole',
    role: 'Director of Brand Strategy & Design',
    quote: 'Visuals speak before words. De Elites visual brand should feel premium, untouchably solid, and instantly recognizable.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Crafting the artistic visual brand assets, merchandise layout, and stage configurations worldwide. Bridging contemporary luxury design with raw street aesthetics.',
    socials: {
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com'
    }
  }
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'g-1',
    title: 'Elite Empowerment Summit Accras',
    category: 'Legacy',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500',
    description: 'Gathering over 500 young creatives, tech builders, and entrepreneurs to discuss financial independence and intellectual property rights.',
    date: 'March 2026'
  },
  {
    id: 'g-2',
    title: 'Nima Educational Relief Program',
    category: 'Philanthropy',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'Providing fully-funded high school scholarships, brand new laptops, and learning supplies to 50 ambitious students in vulnerable neighborhoods.',
    date: 'January 2026'
  },
  {
    id: 'g-3',
    title: 'Street-To-Studio Creative Incubator',
    category: 'Movement',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800&h=530',
    description: 'Opening state-of-the-art recording studios and digital labs for street-based musical talent to produce professional records.',
    date: 'December 2025'
  },
  {
    id: 'g-4',
    title: 'The Annual Royal Gold Feast',
    category: 'Community',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800&h=500',
    description: 'A grand family gathering celebrating brotherhood, cultural roots, and local accomplishments with live traditional and modern music.',
    date: 'November 2025'
  },
  {
    id: 'g-5',
    title: 'Global Chapter Unity Concert',
    category: 'Legacy',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'Connecting our UK, USA, and Ghana chapters in a massive celebration of sound, style, and sovereign community action.',
    date: 'September 2025'
  },
  {
    id: 'g-6',
    title: 'Elite Health Care Outreach',
    category: 'Philanthropy',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800&h=530',
    description: 'Offering free clinical checkups, health screenings, and wellness seminars for over 1,200 local families.',
    date: 'June 2025'
  }
];

export const DEFAULT_SHOUTOUTS: Shoutout[] = [
  {
    id: 's-1',
    name: 'Sampson "Vibe" Osei',
    role: 'Creative Designer / Kumasi Chapter',
    message: 'The Elites Family saved my creative career. Hearing our founder say "Hustle can build palaces" motivated me to open my own branding agency. Today we employ 5 people. Absolute love and unity!',
    timestamp: '2 hours ago',
    theme: 'gold-glow',
    likes: 24
  },
  {
    id: 's-2',
    name: 'Amara Diop',
    role: 'Tech Lead / London Chapter',
    message: 'From London to Accra, the unity is real. De Elites is a lifestyle of excellence and standard. One Family, One Mission, One Legacy. Proud to represent the tech wing!',
    timestamp: '5 hours ago',
    theme: 'charcoal-border',
    likes: 18
  },
  {
    id: 's-3',
    name: 'Ekow SM',
    role: 'Street Hustler / Nima Chapter',
    message: 'LOYALTY is not a word we just talk about; we live it! Shoutout to the Executive Board for the local studio equipment. We are dropping pure heat next week! SM4LYF!',
    timestamp: '1 day ago',
    theme: 'regal-banner',
    likes: 42
  },
  {
    id: 's-4',
    name: 'Jessica Mensah',
    role: 'Music Producer / USA Branch',
    message: 'We are creating a massive cultural bridge. Respect to all the leaders who keep our values aligned. The gold standards are set high, and we are reaching even higher.',
    timestamp: '2 days ago',
    theme: 'minimalist',
    likes: 15
  }
];

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'm-1',
    name: 'Kojo "Prince" Boateng',
    chapter: 'Member',
    role: 'Lead Sound Engineer & Producer',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Crafting the pristine, heavy sonic soundscapes that define the modern street-hop era. Dedicated to mastering organic Ghanaian percussion mixed with trap elements.',
    joinedDate: 'Jan 2024',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' },
    featured: true
  },
  {
    id: 'm-2',
    name: 'Ama Serwaa Prempeh',
    chapter: 'Member',
    role: 'Creative Fashion Designer',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Pioneering custom regal gold threads and street wear that blend traditional Kente motifs with luxury athleisure. Dressing the global Elite crew.',
    joinedDate: 'Mar 2024',
    socials: { instagram: 'https://instagram.com' },
    featured: true
  },
  {
    id: 'm-3',
    name: 'Derrick Kwabena',
    chapter: 'Member',
    role: 'Full-Stack Software Engineer',
    image: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Building scalable decentralized tools and secure mobile portals for community action. Proud advocate of offline-first architecture for the streets.',
    joinedDate: 'Jun 2024',
    socials: { github: 'https://github.com', twitter: 'https://twitter.com' },
    featured: true
  },
  {
    id: 'm-4',
    name: 'Sena "Gold-Pen" Ahadzi',
    chapter: 'Member',
    role: 'Digital Storyteller & Author',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Documenting the authentic evolution of African street cultures and the global Afrobeat movement through rich investigative journalism and premium photography.',
    joinedDate: 'Sep 2024',
    socials: { twitter: 'https://twitter.com', instagram: 'https://instagram.com' }
  },
  {
    id: 'm-5',
    name: 'Yusuf Diallo',
    chapter: 'Member',
    role: 'Visual Artist & Sculptor',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Blending direct industrial scrap-metal sculpture with luxurious royal gold leaf overlay, showcasing the resilience and royalty of self-made individuals.',
    joinedDate: 'Nov 2024',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-6',
    name: 'Belinda "Bella" Mensah',
    chapter: 'Member',
    role: 'Agri-Tech Social Entrepreneur',
    image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Empowering local young female farmers in the Ashanti region with automated smart irrigation and direct market access. Redefining street hustle as sustainable wealth.',
    joinedDate: 'Feb 2025',
    socials: { twitter: 'https://twitter.com', github: 'https://github.com' }
  },
  {
    id: 'm-7',
    name: 'Emmanuel "E-Pence" Tetteh',
    chapter: 'Member',
    role: 'Fintech Product Manager',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Bridging financial inclusion gaps by creating micro-lending apps for local street businesses. Obsessed with high execution and clean product flows.',
    joinedDate: 'May 2025',
    socials: { twitter: 'https://twitter.com', github: 'https://github.com' }
  },
  {
    id: 'm-8',
    name: 'Grace "Sovereign" Osei',
    chapter: 'Member',
    role: 'Sovereign Wellness Strategist',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Promoting mental wellness, premium life coaching, and physical conditioning workshops tailored specifically for high-energy creatives facing mental pressure.',
    joinedDate: 'Aug 2025',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-9',
    name: 'Kwame "Aura" Osei',
    chapter: 'Member',
    role: 'Afrobeat Music Producer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Crafting the dynamic, bass-heavy polyrhythms of modern West African club sounds. Bridging traditional highlife and contemporary street anthems.',
    joinedDate: 'Oct 2025',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-10',
    name: 'Abena "Echo" Danquah',
    chapter: 'Member',
    role: 'Creative Choreographer',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Bringing high-energy street dance routines to the global stage. Directing choreography for international Afrobeat music videos.',
    joinedDate: 'Oct 2025',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-11',
    name: 'Kofi "Vibe" Mensah',
    chapter: 'Member',
    role: 'Streetwear Coordinator',
    image: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Curating the visual representation of our brand across streetwear drops. Specializing in high-end, limited-run fabric curation.',
    joinedDate: 'Nov 2025',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-12',
    name: 'Akosua "Pixel" Darko',
    chapter: 'Member',
    role: 'UI/UX Designer',
    image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Designing pristine digital experiences for our community platforms, ensuring accessibility and high aesthetic standard.',
    joinedDate: 'Nov 2025',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-13',
    name: 'Yaw "Steel" Appiah',
    chapter: 'Member',
    role: 'Metal Sculptor',
    image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Forging monumental metal sculptures that represent the raw strength of self-made builders, decorated with royal gold elements.',
    joinedDate: 'Dec 2025',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-14',
    name: 'Adwoa "Glow" Sarpong',
    chapter: 'Member',
    role: 'Organic Skincare Founder',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Formulating sustainable skin products using raw African Shea and essential oils, exporting global premium care.',
    joinedDate: 'Dec 2025',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-15',
    name: 'Akwasi "Verse" Boateng',
    chapter: 'Member',
    role: 'Hip-Hop Lyricist',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Writing intricate verses that document street struggles, ultimate triumph, and corporate sovereign ascension.',
    joinedDate: 'Jan 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-16',
    name: 'Efua "Rhythm" Addo',
    chapter: 'Member',
    role: 'Acoustic Guitarist',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Infusing modern soundscapes with acoustic harmonies, carrying the acoustic flame of classic highlife music.',
    joinedDate: 'Jan 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-17',
    name: 'Kwabena "Focus" Nyame',
    chapter: 'Member',
    role: 'Cinematic Video Director',
    image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Directing cinematic narratives and music videos that highlight the raw royal beauty of street environments.',
    joinedDate: 'Jan 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-18',
    name: 'Baaba "Tempo" Gyasi',
    chapter: 'Member',
    role: 'Traditional Percussionist',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Preserving our ancestral drum languages. Leading live polyrhythmic setups that anchor our majestic gatherings.',
    joinedDate: 'Feb 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-19',
    name: 'Ekow "Crypt" Mensah',
    chapter: 'Member',
    role: 'Web3 Blockchain Architect',
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Building decentralized structures that allow peer-to-peer sovereign wealth and economic security for global creators.',
    joinedDate: 'Feb 2026',
    socials: { github: 'https://github.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-20',
    name: 'Araba "Aesthetic" Koomson',
    chapter: 'Member',
    role: 'Interior Curator',
    image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Designing premium exhibition and living spaces that seamlessly blend modern design with rustic African elegance.',
    joinedDate: 'Feb 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-21',
    name: 'Fiifi "Motion" Annan',
    chapter: 'Member',
    role: 'Motion Graphic Designer',
    image: 'https://images.unsplash.com/photo-1504257404131-3975d4469069?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Bringing static brand assets to life with high-energy dynamic kinetic typography and custom visuals.',
    joinedDate: 'Mar 2026',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-22',
    name: 'Yaa "Scale" Owusu',
    chapter: 'Member',
    role: 'Financial Strategist',
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Assisting creative professionals with long-term investment planning, capital structure, and asset preservation.',
    joinedDate: 'Mar 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-23',
    name: 'Kweku "Sparks" Asante',
    chapter: 'Member',
    role: 'IoT Tech Innovator',
    image: 'https://images.unsplash.com/photo-1509783236416-c9ad59bae472?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Deploying custom smart hardware solutions for off-grid rural automation and street-level connectivity hub networks.',
    joinedDate: 'Mar 2026',
    socials: { github: 'https://github.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-24',
    name: 'Maame "Word" Arthur',
    chapter: 'Member',
    role: 'Youth Literary Mentor',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Inspiring vulnerable children to tell their own stories through classic creative writing and spoken word poetry.',
    joinedDate: 'Apr 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-25',
    name: 'Jojo "Bass" Quansah',
    chapter: 'Member',
    role: 'Sound Designer',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Creating immersive acoustic environments and digital audio presets optimized for modern cinematic game developers.',
    joinedDate: 'Apr 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-26',
    name: 'Nana "Empire" Ofori',
    chapter: 'Member',
    role: 'Real Estate Developer',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Acquiring and designing modern community spaces to offer affordable creative hubs for street-grown tech talent.',
    joinedDate: 'Apr 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-27',
    name: 'Afia "Culinary" Agyeman',
    chapter: 'Member',
    role: 'Modern African Chef',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Reimagining classic West African dining with custom luxury formats, taking local food on global gourmet tours.',
    joinedDate: 'May 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-28',
    name: 'Kobina "Lens" Hammond',
    chapter: 'Member',
    role: 'Portrait Photographer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Focusing lenses on raw street life and capturing the elegant nobility of self-made street merchants.',
    joinedDate: 'May 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-29',
    name: 'Esme "Vanguard" Clarke',
    chapter: 'Member',
    role: 'Non-Profit Organizer',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Driving global charity campaigns to bring tech education, infrastructure, and learning libraries to orphanages.',
    joinedDate: 'Jun 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-30',
    name: 'Gabriel "Echo" Dubois',
    chapter: 'Member',
    role: 'Event Strategist',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Managing complex logistical plans for large-scale concerts, corporate showcases, and street empowerment summits.',
    joinedDate: 'Jun 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-31',
    name: 'Amina "Horizon" Touré',
    chapter: 'Member',
    role: 'Digital Marketing Lead',
    image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Executing data-driven marketing programs for our global lifestyle product drops and event ticketing channels.',
    joinedDate: 'Jun 2026',
    socials: { twitter: 'https://twitter.com', instagram: 'https://instagram.com' }
  },
  {
    id: 'm-32',
    name: 'Marcus "Blueprint" Vance',
    chapter: 'Member',
    role: 'Urban Architect',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Drafting futuristic building designs that emphasize sustainable community living and shared artistic studio zones.',
    joinedDate: 'Jul 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-33',
    name: 'Chloe "Sovereign" Dubois',
    chapter: 'Member',
    role: 'Art Curator',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Curating luxury gallery displays that connect contemporary street-born art with global elite investors.',
    joinedDate: 'Jul 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-34',
    name: 'Dave "Beat" Miller',
    chapter: 'Member',
    role: 'Live Sound Engineer',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Mixing high-fidelity sound for arena concerts, ensuring the heavy rhythms of our live music translate flawlessly.',
    joinedDate: 'Jul 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-35',
    name: 'Sarah "Vocal" Jenkins',
    chapter: 'Member',
    role: 'Jazz Vocalist',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Blending classic acoustic jazz melodies with heavy African street percussion for a unique global fusion.',
    joinedDate: 'Aug 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-36',
    name: 'Pierre "Luxury" Laurent',
    chapter: 'Member',
    role: 'Brand Stylist',
    image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Coordinating high-end visual aesthetics and promotional styling for our sovereign luxury collection drops.',
    joinedDate: 'Aug 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-37',
    name: 'Malik "Sovereign" Jommo',
    chapter: 'Member',
    role: 'Youth Mentor',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Conducting regular workshops on public speaking, discipline, and building a self-made legacy for young minds.',
    joinedDate: 'Aug 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-38',
    name: 'Elena "Canvas" Rostova',
    chapter: 'Member',
    role: 'Portrait Painter',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Creating large-scale acrylic portraits that express the beautiful diversity and struggle of our global brothers.',
    joinedDate: 'Sep 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-39',
    name: 'Tariq "Crypt" Al-Mansoor',
    chapter: 'Member',
    role: 'Web3 Developer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Writing audited smart contracts to support decentralized royalties and community micro-funds.',
    joinedDate: 'Sep 2026',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-40',
    name: 'Nia "Legacy" Robinson',
    chapter: 'Member',
    role: 'Community Organizer',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Mobilizing local volunteers to manage sanitation drives and localized relief initiatives in vulnerable areas.',
    joinedDate: 'Sep 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-41',
    name: 'Lucas "Frame" Dupont',
    chapter: 'Member',
    role: 'Film Editor',
    image: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Editing premium documentaries that follow the historical journey of De Elites Family across continents.',
    joinedDate: 'Oct 2026',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-42',
    name: 'Isabella "Vibe" Silva',
    chapter: 'Member',
    role: 'Cultural Anthropologist',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Studying the cross-cultural patterns of modern African sounds as they influence Western urban music trends.',
    joinedDate: 'Oct 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-43',
    name: 'Aaron "Glow" Brooks',
    chapter: 'Member',
    role: 'Sustainable Energy Builder',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Designing and deploying solar-powered setups for community schools and local recording studios.',
    joinedDate: 'Oct 2026',
    socials: { github: 'https://github.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-44',
    name: 'Olivia "Harmony" Bennett',
    chapter: 'Member',
    role: 'Music Director',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Coordinating live band setups, arranging sheet music, and directing professional studio choral sessions.',
    joinedDate: 'Nov 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-45',
    name: 'Mateo "Sparks" Alvarez',
    chapter: 'Member',
    role: 'Mobile App Developer',
    image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Programming high-performance native iOS and Android apps for our secure community portals.',
    joinedDate: 'Nov 2026',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-46',
    name: 'Sophia "Sovereign" Meyer',
    chapter: 'Member',
    role: 'Stage Coordinator',
    image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Ensuring seamless talent transitions and precise technical cues on our massive global concert stages.',
    joinedDate: 'Nov 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'm-47',
    name: 'Daniel "Pulse" Nkrumah',
    chapter: 'Member',
    role: 'Agri-Tech Data Analyst',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Analyzing soil metrics and climate predictions to optimize local agricultural farm yields for young cooperatives.',
    joinedDate: 'Dec 2026',
    socials: { github: 'https://github.com' }
  },
  {
    id: 'm-48',
    name: 'Cynthia "Empire" Taylor',
    chapter: 'Member',
    role: 'Public Relations Specialist',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Crafting authoritative press releases and communicating our sovereign philanthropic milestones to global media outlets.',
    joinedDate: 'Dec 2026',
    socials: { twitter: 'https://twitter.com' }
  },
  {
    id: 'm-49',
    name: 'Julian "Lens" Mercier',
    chapter: 'Member',
    role: 'Fashion Videographer',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Capturing dynamic raw footage of our lifestyle merchandise campaigns and high-end apparel presentations.',
    joinedDate: 'Dec 2026',
    socials: { instagram: 'https://instagram.com' }
  },
  {
    id: 'm-50',
    name: 'Victoria "Legacy" King',
    chapter: 'Member',
    role: 'Global Strategy Consultant',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Advising on international legal compliance, legacy fund structure, and expanding chapter networks globally.',
    joinedDate: 'Dec 2026',
    socials: { instagram: 'https://instagram.com', twitter: 'https://twitter.com' }
  }
];

export const DEFAULT_EVENTS: EliteEvent[] = [
  {
    id: 'event-1',
    title: 'Sovereign Unity Gala 2026',
    date: 'December 15, 2026',
    time: '7:00 PM GMT',
    location: 'Grand Regal Hall, Accra, Ghana',
    description: 'The premium annual gathering of global Elites members. Celebrating brotherhood, sovereign music legacy, and international philanthropy achievements with live orchestra and award presentations.',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800&h=500',
    category: 'Summit',
    buttonText: 'Reserve Table Entry',
    buttonLink: '#contact'
  },
  {
    id: 'event-2',
    title: 'De Elites Legacy Concert',
    date: 'October 24, 2026',
    time: '8:00 PM GMT',
    location: 'Black Star Square, Accra, Ghana',
    description: 'An extraordinary night of royal sound, energy, and street-smart celebration led by our Supreme Leader alongside global guest performances. Strictly high-energy.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800&h=600',
    category: 'Concert',
    buttonText: 'Get Movement Pass',
    buttonLink: '#contact'
  },
  {
    id: 'event-3',
    title: 'Elite Tech & Empowerment Summit',
    date: 'August 12, 2026',
    time: '10:00 AM GMT',
    location: 'Sovereign Block HQ / Hybrid',
    description: 'Bridging grassroots drive with high-scale tech. Full-day workshops in custom coding, blockchain architectures, smart contracting, and business modeling for ambitious youth.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800&h=530',
    category: 'Summit',
    buttonText: 'Register Free Seat',
    buttonLink: '#contact'
  }
];

export const DEFAULT_HERO: HeroConfig[] = [
  {
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
    stat3Label: 'Uncompromising Loyalty'
  }
];


