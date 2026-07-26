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
