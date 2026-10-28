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
import makeWASocketImport, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcodeTerminal from "qrcode-terminal";
import path from "path";
import fs from "fs";
import P from "pino";

// Baileys' default export doesn't resolve consistently once esbuild bundles
// it to CJS — depending on the exact package version, the imported binding
// can end up being the real makeWASocket(...) function, or an object with
// it nested one level deeper at `.default` (a known "double default" quirk
// of this package's CJS/ESM interop under esbuild/webpack). Resolve
// whichever shape actually came through at runtime instead of assuming one
// — this is what was crashing initWhatsApp() with "is not a function".
const makeWASocket: any =
  typeof makeWASocketImport === "function"
    ? makeWASocketImport
    : (makeWASocketImport as any)?.default;

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR
  ? path.resolve(process.env.WHATSAPP_SESSION_DIR)
  : path.join(process.cwd(), "whatsapp-session");
fs.mkdirSync(SESSION_DIR, { recursive: true });

let sock: any = null;
let isReady = false;
let hasPendingQr = false;
let starting = false;

// Registered via onIncomingDirectMessage below — business logic (looking up
// a member, updating the database) lives in server.ts, not here. This file
// stays protocol-only: extract the text, hand it off, send back whatever
// string comes back as a reply. Group messages never reach this handler —
// see the messages.upsert listener in initWhatsApp for why.
let directMessageHandler: ((fromJid: string, text: string) => Promise<string | void>) | null = null;

// Registers the function that handles an incoming 1-on-1 WhatsApp DM to the
// linked number (e.g. the member self-service menu — reset password, update
// phone/email — see handleWhatsAppDirectMessage in server.ts). Deliberately
// separate from the group-notification features elsewhere in this file:
// group messages are never passed here, only direct messages to the linked
// account itself, since letting arbitrary group chatter trigger account
// changes would be chaotic and insecure. Call this once at startup, same as
// initWhatsApp().
export function onIncomingDirectMessage(handler: (fromJid: string, text: string) => Promise<string | void>): void {
  directMessageHandler = handler;
}

// isWhatsAppConfigured() answers "will a notification actually get posted
// anywhere" — that needs WHATSAPP_GROUP_ID, since without a group to post
// into there's nowhere for sendWhatsAppDocument to send. It does NOT gate
// the connection attempt itself (see shouldConnectWhatsApp below): you have
// to link a device and discover your group ID via listWhatsAppGroups()
// *before* WHATSAPP_GROUP_ID can even be set, so requiring it up front would
// make that first-time setup impossible.
export function isWhatsAppConfigured(): boolean {
  if (process.env.WHATSAPP_ENABLED === "false") return false;
  return !!process.env.WHATSAPP_GROUP_ID;
}

// Whether the app should even attempt a WhatsApp connection at all. Defaults
// to "on" so the very first boot — with no WHATSAPP_GROUP_ID set yet — still
// prints a QR code, lets you link a device, and lets /api/admin/whatsapp/groups
// list the groups that device belongs to. Set WHATSAPP_ENABLED=false if you
// don't want this running at all (e.g. not using the feature, or don't want
// a QR code showing up in your logs on every restart).
function shouldConnectWhatsApp(): boolean {
  return process.env.WHATSAPP_ENABLED !== "false";
}

export function isWhatsAppReady(): boolean {
  return isReady;
}

export function hasPendingQrCode(): boolean {
  return hasPendingQr;
}

// Call once at server startup. Safe to call even before WHATSAPP_GROUP_ID is
// set — it connects and waits for a QR scan regardless, so you can discover
// your group ID. It only truly no-ops when WHATSAPP_ENABLED=false.
export async function initWhatsApp(): Promise<void> {
  if (!shouldConnectWhatsApp() || starting) return;
  if (typeof makeWASocket !== "function") {
    console.error("[WhatsApp] Could not resolve makeWASocket from @whiskeysockets/baileys — the installed version's export shape isn't recognized. Not attempting to connect.");
    return;
  }
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

    // Incoming messages — only used for the member self-service DM flow
    // (see onIncomingDirectMessage above). Group messages are ignored
    // entirely here; this never reacts to anything posted in
    // WHATSAPP_GROUP_ID or any other group.
    sock.ev.on("messages.upsert", async (upsert: any) => {
      if (!directMessageHandler) return;
      for (const msg of upsert.messages || []) {
        try {
          if (msg.key?.fromMe) continue; // ignore the bot's own messages
          const fromJid: string | undefined = msg.key?.remoteJid;
          if (!fromJid || fromJid.endsWith("@g.us") || fromJid === "status@broadcast") continue; // DMs only
          const text: string =
            msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.buttonsResponseMessage?.selectedButtonId || "";
          if (!text.trim()) continue;
          const reply = await directMessageHandler(fromJid, text.trim());
          if (reply) await sock.sendMessage(fromJid, { text: reply });
        } catch (err) {
          console.error("[WhatsApp] Failed to handle incoming direct message:", err);
        }
      }
    });

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

// Sends a plain text message into a group (e.g. the monthly dues reminders/
// report — see server.ts). Deliberately does NOT gate on
// isWhatsAppConfigured(), since that checks WHATSAPP_GROUP_ID specifically
// and this can target a different group (DUES_REPORT_GROUP_ID) — readiness
// of the underlying connection is all that matters here. `mentions` is an
// optional list of participant JIDs (e.g. "233244123456@s.whatsapp.net") to
// @-tag — the message text should already contain a matching "@<digits>"
// substring for each one (see phoneToWhatsAppJid/buildDuesReportMessage in
// server.ts) for WhatsApp clients to render the tag correctly. Same
// best-effort contract as sendWhatsAppDocument: never throws, false on any
// failure.
export async function sendWhatsAppText(groupId: string, text: string, mentions?: string[]): Promise<boolean> {
  if (!sock || !isReady) {
    console.warn("[WhatsApp] Not connected — skipping text send. Check the server logs for a QR code to scan.");
    return false;
  }
  try {
    await sock.sendMessage(groupId, { text, ...(mentions?.length ? { mentions } : {}) });
    return true;
  } catch (err) {
    console.error("[WhatsApp] Failed to send text message:", err);
    return false;
  }
}
