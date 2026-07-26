import { Pillar, Leader, GalleryItem, Shoutout, Member, EliteEvent, HeroConfig, CmsUser } from '../types';

export interface CmsDatabase {
  pillars: Pillar[];
  leaders: Leader[];
  gallery: GalleryItem[];
  shoutouts: Shoutout[];
  members: Member[];
  events: EliteEvent[];
  hero: HeroConfig[];
  users?: CmsUser[];
}

export async function fetchCmsData(): Promise<CmsDatabase> {
  const res = await fetch("/api/cms/data");
  if (!res.ok) {
    throw new Error(`Failed to fetch CMS data: ${res.statusText}`);
  }
  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to parse CMS data from server");
  }
  return result.data;
}

export async function updateCmsSection<K extends keyof CmsDatabase>(
  type: K,
  data: CmsDatabase[K]
): Promise<CmsDatabase[K]> {
  const res = await fetch("/api/cms/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, data }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update CMS section '${type}': ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || `Failed to update CMS section ${type}`);
  }

  return result.data;
}

export async function resetCmsDatabase(database: CmsDatabase): Promise<void> {
  const res = await fetch("/api/cms/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ database }),
  });

  if (!res.ok) {
    throw new Error(`Failed to reset CMS database: ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to reset CMS database on server");
  }
}
