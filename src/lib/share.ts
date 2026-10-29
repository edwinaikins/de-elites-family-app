// Shared by every "Share" button in the app (Events, Legacy Gallery, and
// the whole-site share in the Footer) and by the matching deep-link
// consumption on the receiving end. Kept as one small module so the two
// halves — building a shareable link, and reading one back out of the URL
// on load — can't drift out of sync on the URL shape they agree on.

// True when the browser's native share sheet (iOS/Android "Share..." menu,
// and some desktop browsers) is available. Always false in environments
// without a real `navigator` (shouldn't happen in this app, but keeps this
// safe to import anywhere).
export function canShareNatively(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
}

// Absolute URL for a site-relative path, built from wherever this page is
// actually being served from (so it's correct on localhost, a staging
// domain, or the real de-elitesfamily.org without needing any config).
export function absoluteUrl(path: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

// Attempts the native share sheet. Returns true if it was shown (even if
// the person then cancelled it — that's not a failure, just means no
// fallback menu should open either). Returns false only when the native
// share sheet isn't available or genuinely failed, so the caller knows to
// fall back to the platform-link menu instead.
export async function shareNative(data: { title: string; text?: string; url: string }): Promise<boolean> {
  if (!canShareNatively()) return false;
  try {
    await (navigator as any).share(data);
    return true;
  } catch (err: any) {
    // AbortError = the person closed the share sheet without picking
    // anything — that's a normal cancel, not a failure to report.
    if (err?.name === 'AbortError') return true;
    console.error('Native share failed:', err);
    return false;
  }
}

// Fallback platform links, used when navigator.share isn't available
// (most desktop browsers) — each just opens that platform's own share
// intent in a new tab/window.
export function whatsappShareUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function twitterShareUrl(title: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
}

// Reads a one-shot deep link out of the current URL, e.g.
// consumeDeepLinkId('/events') matches a URL like ".../events/evt-123" and
// returns "evt-123". This app has no client router — a path like this is
// just a signal read once on page load (see /welfare in App.tsx and
// /request-access in MemberAuthContext for the same pattern) — so the URL
// is reset to "/" immediately after reading it, which also means calling
// this a second time (e.g. from a dependent effect re-running after data
// loads) safely returns null instead of re-triggering anything.
export function consumeDeepLinkId(prefix: string): string | null {
  const path = window.location.pathname.replace(/\/+$/, '');
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = path.match(new RegExp(`^${escaped}/([^/]+)$`));
  if (!match) return null;
  window.history.replaceState({}, '', '/');
  return decodeURIComponent(match[1]);
}
