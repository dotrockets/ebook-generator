#!/usr/bin/env node
/**
 * Sends an email with auto-book results (KDP metadata, download links, etc.)
 * Usage: node send-auto-book-email.mjs <ebook-id>
 * Or without ID: picks the latest book from library
 */

import { createTransport } from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const DOMAIN = process.env.DOMAIN || "ebookgenerator.puls.io";

const SMTP_HOST = process.env.SMTP_HOST || "w00e161e.kasserver.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "send@herzschlag-der-erde.de";
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "send@herzschlag-der-erde.de";
const TO_EMAIL = process.env.TO_EMAIL || "mail@bjoernpuls.com";

if (!SMTP_PASS) {
  console.error("SMTP_PASS required");
  process.exit(1);
}

// Load library
const libPath = join(DATA_DIR, "library.json");
const library = JSON.parse(readFileSync(libPath, "utf-8"));

// Find ebook
const ebookId = process.argv[2];
const ebook = ebookId
  ? library.find((e) => e.id === ebookId)
  : library.find((e) => e.status === "done");

if (!ebook) {
  console.error("No ebook found");
  process.exit(1);
}

const kdp = ebook.kdpMetadata;
const downloadBase = `https://${DOMAIN}/api/library/download?id=${ebook.id}`;

// Build email body
const subject = `📚 Neues Auto-Book: "${ebook.title}" — KDP-ready!`;

const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">

  <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">📚 Neues Auto-Book generiert</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Reddit-Scanner → AI → KDP-ready PDF</p>
  </div>

  <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

    <!-- Title Block -->
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h2 style="margin: 0 0 4px; font-size: 22px; color: #111;">${ebook.title}</h2>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 15px;">${ebook.subtitle || ""}</p>
      <div style="display: flex; gap: 16px; font-size: 13px; color: #6b7280;">
        <span>📄 ${ebook.wordCount?.toLocaleString("de-DE") || "?"} Wörter</span>
        <span>📖 ${ebook.chapters?.length || "?"} Kapitel</span>
        <span>📐 ${ebook.pages} Seiten</span>
        <span>🎯 Template: ${ebook.template}</span>
      </div>
    </div>

    <!-- Downloads -->
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">⬇️ Downloads</h3>
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=pdf" style="color: #8b5cf6;">PDF herunterladen</a></p>
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=md" style="color: #8b5cf6;">Markdown herunterladen</a></p>
      ${ebook.outputFiles?.cover ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=cover" style="color: #8b5cf6;">Cover herunterladen</a></p>` : ""}
      ${ebook.outputFiles?.["cover-composed"] ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=cover-composed" style="color: #8b5cf6;">Cover PDF (mit Titel) herunterladen</a></p>` : ""}
    </div>

    <!-- Chapters -->
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">📑 Kapitel</h3>
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        ${(ebook.chapters || []).map((c) => `<li>${c}</li>`).join("\n        ")}
      </ol>
    </div>

    ${kdp ? `
    <!-- KDP Metadata — Copy/Paste Ready -->
    <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #8b5cf6; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; color: #8b5cf6;">🎯 KDP Metadaten (Copy/Paste)</h3>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">TITEL (SEO-optimiert)</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchTitle || ebook.title}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">UNTERTITEL (SEO-optimiert)</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchSubtitle || ebook.subtitle || ""}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">BESCHREIBUNG (HTML)</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${(kdp.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KEYWORDS (7 Stück)</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${(kdp.keywords || []).join("\n")}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KATEGORIEN</p>
        ${(kdp.categories || []).map((c) => `<div style="background: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 4px;">${c.path || c.name}</div>`).join("\n        ")}
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">PREIS</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">
          💶 ${kdp.pricing?.recommendedEUR || "?"} EUR / 💵 ${kdp.pricing?.recommendedUSD || "?"} USD<br>
          <span style="font-size: 12px; color: #6b7280;">${kdp.pricing?.reasoning || ""}</span>
        </div>
      </div>

      ${kdp.preflight ? `
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">PREFLIGHT / DRUCKDATEN</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">
          📐 Trim Size: ${kdp.preflight.trimSize}<br>
          📏 Spine Width: ${kdp.preflight.spineWidth}<br>
          🎨 Interior: ${kdp.preflight.interiorColor}<br>
          📄 Paper: ${kdp.preflight.paperType}<br>
          📦 Cover: ${kdp.preflight.coverDimensions}
        </div>
      </div>
      ` : ""}
    </div>

    ${kdp.socialMedia ? `
    <!-- Social Media Copy -->
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px;">📱 Social Media (Copy/Paste)</h3>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">INSTAGRAM</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap;">${kdp.socialMedia.instagram}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">TWITTER / X</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">${kdp.socialMedia.twitter}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">FACEBOOK</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">${kdp.socialMedia.facebook}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">AMAZON BESCHREIBUNG</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">${kdp.socialMedia.amazonDescription}</div>
      </div>
    </div>
    ` : ""}
    ` : "<p style='color: #6b7280; font-size: 14px;'>KDP-Metadaten nicht verfügbar (kein kindle-kdp Template)</p>"}

    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      Auto-generiert von ebook-gen · Reddit-Scanner → Claude → Typst → KDP
    </p>
  </div>
</div>
`;

// Send
const transporter = createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  const info = await transporter.sendMail({
    from: `"ebook-gen" <${FROM_EMAIL}>`,
    to: TO_EMAIL,
    subject,
    html,
  });
  console.log(`Email sent to ${TO_EMAIL}: ${info.messageId}`);
} catch (err) {
  console.error("Failed to send email:", err.message);
  process.exit(1);
}
