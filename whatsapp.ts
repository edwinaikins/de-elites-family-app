// --- WhatsApp group notifications (unofficial automation) ---
//
// There is no official Meta/WhatsApp API that can post into a WhatsApp
// group your team already created inside the app — Meta's Groups API can
// only post into NEW groups it creates itself via an invite link. To post
// directly into an existing group with no human involved, this uses
// Baileys, an unofficial library that logs in as a real WhatsApp Web
// "linked device" and speaks the same protocol the official web client
// uses. That means:
//
//   - It is NOT sanctioned by WhatsApp/Meta and technically violates their
//     Terms of Service around automation. There is a real (if historically
//     low-for-small-volume-use) risk of the linked phone number being
//     flagged or banned.
//   - It depends on reverse-engineered protocol details that can change
//     without notice whenever WhatsApp updates their app — this is
//     materially more fragile than the Paystack/SMTP integrations
//     elsewhere in this app, which are official and versioned.
//   - Every notification failure here is caught and logged, never thrown —
//     a WhatsApp hiccup must never block someone submitting a membership
//     application (see sendWhatsAppDocument's callers in server.ts).
//
// One-time setup: the first time this runs with no saved session, it
// prints a QR code to the server's console/logs. Open WhatsApp on the
// phone that should stay linked -> Settings -> Linked Devices -> Link a
// Device -> scan it. After that the session is cached to disk
// (WHATSAPP_SESSION_DIR) and survives restarts without re-scanning, unless
// the phone unlinks it or WhatsApp logs it out server-side.
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcodeTerminal from "qrcode-terminal";
import path from "path";
import fs from "fs";
import P from "pino";

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR
  ? path.resolve(process.env.WHATSAPP_SESSION_DIR)
  : path.join(process.cwd(), "whatsapp-session");
fs.mkdirSync(SESSION_DIR, { recursive: true });

let sock: any = null;
let isReady = false;
let hasPendingQr = false;
let starting = false;

// WHATSAPP_ENABLED defaults to "on" the moment WHATSAPP_GROUP_ID is set —
// there's no other configuration this needs (unlike Paystack/SMTP, there's
// no "keys" to add; the account IS the credential, established by scanning
// the QR code once). Set WHATSAPP_ENABLED=false to turn the whole feature
// off without touching WHATSAPP_GROUP_ID.
export function isWhatsAppConfigured(): boolean {
  if (process.env.WHATSAPP_ENABLED === "false") return false;
  return !!process.env.WHATSAPP_GROUP_ID;
}

export function isWhatsAppReady(): boolean {
  return isReady;
}

export function hasPendingQrCode(): boolean {
  return hasPendingQr;
}

// Call once at server startup. Safe to call even when not configured — it
// just does nothing until WHATSAPP_GROUP_ID is set and the server restarts.
export async function initWhatsApp(): Promise<void> {
  if (!isWhatsAppConfigured() || starting) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "silent" }) as any,
      printQRInTerminal: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        hasPendingQr = true;
        console.log("\n[WhatsApp] Scan this QR code with WhatsApp -> Settings -> Linked Devices -> Link a Device:\n");
        qrcodeTerminal.generate(qr, { small: true });
      }
      if (connection === "open") {
        isReady = true;
        hasPendingQr = false;
        console.log("[WhatsApp] Connected.");
      }
      if (connection === "close") {
        isReady = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Connection closed (code ${statusCode ?? "unknown"}).${loggedOut ? " Logged out — delete WHATSAPP_SESSION_DIR and re-scan the QR code to relink." : " Reconnecting..."}`);
        if (!loggedOut) {
          starting = false;
          initWhatsApp();
        }
      }
    });
  } catch (err) {
    console.error("[WhatsApp] Failed to initialize:", err);
  } finally {
    starting = false;
  }
}

// Lists every group the linked WhatsApp account is currently a member of —
// used by the CMS's admin-only "find your group ID" helper (see
// GET /api/admin/whatsapp/groups in server.ts). The linked account must
// already be a participant of the target group (join it normally from a
// phone first) before it shows up here.
export async function listWhatsAppGroups(): Promise<{ id: string; name: string }[]> {
  if (!sock || !isReady) return [];
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map((g: any) => ({ id: g.id, name: g.subject || g.id }));
  } catch (err) {
    console.error("[WhatsApp] Failed to list groups:", err);
    return [];
  }
}

// Returns true once the document has actually been sent — false (never
// thrown) on any failure, so callers can treat this exactly like the
// email-sending functions: best-effort, log-and-continue.
export async function sendWhatsAppDocument(
  groupId: string,
  buffer: Buffer,
  filename: string,
  caption: string
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  if (!sock || !isReady) {
    console.warn("[WhatsApp] Not connected — skipping document send. Check the server logs for a QR code to scan.");
    return false;
  }
  try {
    await sock.sendMessage(groupId, {
      document: buffer,
      fileName: filename,
      mimetype: "application/pdf",
      caption,
    });
    return true;
  } catch (err) {
    console.error("[WhatsApp] Failed to send document:", err);
    return false;
  }
}
