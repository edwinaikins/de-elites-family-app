import { Pillar, Leader, GalleryItem, Shoutout, Member, EliteEvent, HeroConfig, CmsUser, MemberApplication } from '../types';

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

// --- Per-item CMS saves (Leadership, Legacy Gallery, Upcoming Events) ---
// Saves/deletes a single item instead of resending the whole section array
// — see server.ts's /api/cms/:section/item comment for why. Both return
// the section's full updated array so the caller can replace its local copy.

export type PerItemSection = 'leaders' | 'gallery' | 'events';

export async function saveCmsItem<K extends PerItemSection>(
  type: K,
  item: CmsDatabase[K][number]
): Promise<CmsDatabase[K]> {
  const res = await fetch(`/api/cms/${type}/item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `Failed to save ${type} item`);
  }
  return result.data;
}

export async function deleteCmsItem<K extends PerItemSection>(type: K, id: string): Promise<CmsDatabase[K]> {
  const res = await fetch(`/api/cms/${type}/item/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `Failed to delete ${type} item`);
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

// --- Prospective Member Applications ---
// Kept as a dedicated endpoint (not part of /api/cms/data) since applications
// contain sensitive personal information that should never be exposed in the
// public, unauthenticated CMS bulk payload.

export async function submitMemberApplication(
  application: Omit<MemberApplication, 'id' | 'status' | 'submittedAt'>
): Promise<MemberApplication> {
  const res = await fetch("/api/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(application),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit application: ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to submit application");
  }

  return result.data;
}

export async function fetchMemberApplications(): Promise<MemberApplication[]> {
  const res = await fetch("/api/applications");
  if (!res.ok) {
    throw new Error(`Failed to fetch applications: ${res.statusText}`);
  }
  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to parse applications from server");
  }
  return result.data;
}

export async function updateMemberApplicationStatus(
  id: string,
  status: MemberApplication['status']
): Promise<MemberApplication> {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update application: ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to update application");
  }

  return result.data;
}

// --- Legacy Gallery: bulk media uploads ---
// Files are sent as multipart/form-data (not JSON/Base64) so large event
// videos stream to disk on the server instead of ballooning a JSON payload
// in memory. See server.ts's /api/admin/gallery/upload comment for why.

export interface UploadedMediaItem {
  url: string;
  isVideo: boolean;
  originalName: string;
}

export async function uploadGalleryMedia(files: File[]): Promise<UploadedMediaItem[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const res = await fetch('/api/admin/gallery/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `Failed to upload media: ${res.statusText}`);
  }
  return result.data;
}

export async function deleteMemberApplication(id: string): Promise<void> {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete application: ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to delete application");
  }
}
