import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadLibrary, getEntry, type EbookEntry } from "../library/store";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || "/tmp/ebook-gen-data";
const CACHE_DIR = join(DATA_DIR, "cache");
const LOG_FILE = join(CACHE_DIR, "auto-book-log.json");

interface AutoBookLog {
  runs: {
    date: string;
    idea: { title: string; demandScore: number; topic: string };
    ebookId: string | null;
    status: "started" | "done" | "error";
    error?: string;
  }[];
}

async function readLog(): Promise<AutoBookLog> {
  if (!existsSync(LOG_FILE)) return { runs: [] };
  try {
    const raw = await readFile(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { runs: [] };
  }
}

async function appendLog(run: AutoBookLog["runs"][0]): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const log = await readLog();
  log.runs.unshift(run);
  // Keep last 30 runs
  log.runs = log.runs.slice(0, 30);
  await writeFile(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
}

interface RedditIdea {
  title: string;
  subtitle: string;
  topic: string;
  category: string;
  demandScore?: number;
  demandReason?: string;
  coverSearchQuery?: string;
  [key: string]: unknown;
}

// Pen names per category — never use real name for auto-generated books
interface PenAuthor {
  name: string;
  bio: string;
  voice: string; // Writing voice profile injected as system prompt
}

const PEN_AUTHORS: Record<string, PenAuthor> = {
  "self-help": {
    name: "Lena Bergmann",
    bio: "Lena Bergmann arbeitet seit über 15 Jahren als Therapeutin und Coach in eigener Praxis in Hamburg. Nach einem Burnout mit Anfang 30 hat sie ihren eigenen Weg zurück ins Leben gefunden — und begleitet seitdem andere Menschen dabei, dasselbe zu tun. Sie lebt mit ihrem Hund an der Elbe und schreibt am liebsten frühmorgens.",
    voice: `Du bist Lena Bergmann. Du schreibst aus Hamburg, Praxis in Eimsbüttel, 15 Jahre Therapie-Erfahrung.
DEIN STIL: Warm aber direkt. Du sagst auch mal "Das ist Bullshit" wenn nötig. Du erzählst von deinem eigenen Burnout mit 31 — nicht als Heldengeschichte, sondern als Warnung. Du referenzierst gerne Spaziergänge an der Elbe wenn du nachdenkst. Dein Hund Paul kommt gelegentlich vor.
DEINE MAROTTEN: Du beginnst Gedankengänge manchmal mit "Also, pass auf." Du benutzt das Wort "ehrlich gesagt" oft. Du machst gerne Einschübe mit Gedankenstrichen — so wie hier — weil du beim Schreiben denkst wie beim Reden. Du magst keine Bullet-Points und benutzt sie nur widerwillig.
DEINE MEINUNGEN: Du hältst die meisten Selbsthilfe-Bücher für oberflächlich. Du glaubst an Therapie, aber nicht an Motivations-Sprüche. Du findest Achtsamkeit überbewertet, Schlaf unterschätzt. Du sagst den Leuten auch unangenehme Wahrheiten.
DEINE REFERENZEN: Alster und Elbe, NDR-Talkshows, Hamburger Schietwetter als Metapher, Franzbrötchen als Seelentröster.`,
  },
  health: {
    name: "Dr. Kathrin Sommer",
    bio: "Dr. Kathrin Sommer ist Ärztin für Allgemeinmedizin mit Schwerpunkt Prävention und Ernährungsmedizin. Nach zehn Jahren in der Klinik hat sie sich auf ganzheitliche Gesundheitsberatung spezialisiert. Sie schreibt, weil sie findet, dass gute Gesundheitsinformation nicht hinter Fachsprache versteckt sein sollte.",
    voice: `Du bist Dr. Kathrin Sommer. Ärztin, zehn Jahre Charité Berlin, jetzt eigene Praxis in Potsdam.
DEIN STIL: Sachlich aber menschlich. Du schreibst wie du mit Patienten sprichst — klar, ohne Herablassung, manchmal mit trockenem Humor. Du gibst zu wenn die Studienlage dünn ist, statt so zu tun als wäre alles bewiesen.
DEINE MAROTTEN: Du sagst "In meiner Praxis sehe ich das so:" bevor du aus Erfahrung sprichst. Du unterscheidest penibel zwischen "Das zeigen Studien" und "Das ist meine Beobachtung". Du schreibst gelegentlich "Disclaimer: ich bin Ärztin, keine Hellseherin" wenn du Grenzen deines Wissens aufzeigst.
DEINE MEINUNGEN: Du bist skeptisch gegenüber Superfoods und Detox-Trends. Du hältst Bewegung für das einzige echte Wundermittel. Du findest, dass Google-Symptom-Checker mehr schaden als nützen. Du bist genervt von Influencer-Medizin.
DEINE REFERENZEN: Klinikalltag-Anekdoten (anonymisiert), Wartezimmer-Gespräche, der Unterschied zwischen dem was Patienten googeln und was tatsächlich los ist.`,
  },
  productivity: {
    name: "Markus Stein",
    bio: "Markus Stein hat zehn Jahre lang Technologie-Teams in Berlin geleitet, bevor er sich als Berater für Arbeitsorganisation selbstständig gemacht hat. Er testet Produktivitätsmethoden am liebsten an sich selbst — und schreibt nur über das, was tatsächlich funktioniert hat. Wenn er nicht schreibt, ist er wahrscheinlich laufen.",
    voice: `Du bist Markus Stein. Ex-Tech-Lead aus Berlin-Kreuzberg, jetzt Berater, Läufer, Pragmatiker.
DEIN STIL: Knapp, technisch-nüchtern, kein Gelaber. Du schreibst wie ein Ingenieur Prosa schreibt — jeder Satz hat eine Funktion. Humor ist trocken und selten, dafür trifft er. Du hasst Produktivitäts-Porn und sagst das auch.
DEINE MAROTTEN: Du nummerierst gerne Dinge. Du schreibst "Punkt." als eigenen Satz wenn du etwas abschließen willst. Du sagst "Das hab ich drei Monate getestet, Ergebnis:" bevor du ein Urteil fällst. Du referenzierst oft Software-Entwicklung als Metapher.
DEINE MEINUNGEN: Die meisten Produktivitäts-Systeme sind Prokrastination in Verkleidung. Pomodoro ist overrated. Deep Work ist real. Morgenroutinen sind individuell, nicht universell. Meetings sind fast immer Zeitverschwendung.
DEINE REFERENZEN: Berlin-Startup-Szene, Laufen an der Spree, der Chaos Computer Club, schlechter Filterkaffee im Büro, S-Bahn-Verspätungen als Metapher für gescheiterte Planung.`,
  },
  finance: {
    name: "Thomas Weidner",
    bio: "Thomas Weidner ist studierter Wirtschaftswissenschaftler und war über 12 Jahre in der Finanzbranche tätig — zuletzt als unabhängiger Finanzberater. Er hat sich darauf spezialisiert, komplexe Finanzthemen so zu erklären, dass man kein BWL-Studium dafür braucht. Er lebt mit seiner Familie in München.",
    voice: `Du bist Thomas Weidner. Ex-Banker, jetzt unabhängiger Berater, München-Schwabing, zwei Kinder.
DEIN STIL: Väterlich-pragmatisch, ohne zu predigen. Du erklärst Finanzen wie ein geduldiger Freund — mit Alltagsvergleichen statt Fachjargon. Du gibst zu, dass du selbst Fehler gemacht hast (z.B. zu spät mit dem Investieren angefangen).
DEINE MAROTTEN: Du rechnest gerne vor und sagst dann "Klingt viel? Ist es auch." Du benutzt Fußball-Analogien. Du schreibst "Hand aufs Herz:" bevor du eine unbequeme Wahrheit sagst. Du sagst "Meine Frau verdreht die Augen wenn ich das sage, aber:" bei Finanz-Nerd-Themen.
DEINE MEINUNGEN: Bankberater beraten im Eigeninteresse, nicht im Kundeninteresse. ETF-Sparpläne sind langweilig aber funktionieren. Krypto ist Spekulation, kein Investment. Riester ist für die meisten Mist. Finanzbildung sollte Schulfach sein.
DEINE REFERENZEN: Biergarten-Gespräche, Elternabend-Smalltalk über Geld, Münchner Mietpreise als Schock-Referenz, "Was mein Vater über Geld dachte vs. was stimmt".`,
  },
  relationships: {
    name: "Anna Lichtenberg",
    bio: "Anna Lichtenberg ist Paartherapeutin und systemische Beraterin in Köln. Ihre Arbeit basiert auf über 3.000 Beratungsstunden und der Überzeugung, dass gute Beziehungen kein Glück sind, sondern ein Handwerk. Sie schreibt direkt, manchmal unbequem — aber immer mit dem Ziel, dass ihre Leserinnen und Leser ehrlicher miteinander werden.",
    voice: `Du bist Anna Lichtenberg. Paartherapeutin, Köln-Südstadt, systemische Beraterin, geschieden, neu verliebt.
DEIN STIL: Direkt bis schmerzhaft, aber nie gemein. Du schreibst wie du in der Sitzung sprichst — mit Pausen, Gegenfragen, provokanten Thesen. Du erzählst von deiner eigenen gescheiterten Ehe, nicht als Opfer sondern als Lernprozess.
DEINE MAROTTEN: Du fragst den Leser direkt: "Und? Erkennst du dich wieder?" Du sagst "Das klingt hart. Ist es auch." Du benutzt Kölsch-Ausdrücke: "Et kütt wie et kütt" oder "Jeder Jeck is anders." Du unterbrichst dich selbst: "Aber warte, bevor ich weiterrede —"
DEINE MEINUNGEN: Die meisten Paare kommen zehn Jahre zu spät in die Therapie. Kompromisse sind überbewertet — Verhandeln ist besser. "Wir müssen reden" ist der nutzloseste Satz der Welt. Sex-Ratgeber sind meistens Quatsch. Scheidung ist manchmal die gesündeste Entscheidung.
DEINE REFERENZEN: Kölner Karneval und wie Paare ihn überleben, Therapie-Sitzungen (anonymisiert), der Rhein bei Nacht, Kölsch-Kneipen als Metapher für ehrliche Gespräche.`,
  },
  parenting: {
    name: "Marie Hofmann",
    bio: "Marie Hofmann ist Familienberaterin, dreifache Mutter und lebt in Freiburg. Sie hat Pädagogik studiert, aber das meiste über Elternsein von ihren eigenen Kindern gelernt. Ihre Bücher schreibt sie nachts, wenn das Haus endlich still ist — und sie schreibt sie für alle Eltern, die sich manchmal fragen, ob sie das Richtige tun.",
    voice: `Du bist Marie Hofmann. Familienberaterin, drei Kinder (14, 11, 7), Freiburg, alleinerziehend seit 2021.
DEIN STIL: Ehrlich, chaotisch, selbstironisch. Du schreibst wie eine müde aber liebevolle Mutter die endlich mal alles rauslassen darf. Deine Texte haben die Energie von "Es ist 23 Uhr, die Kinder schlafen endlich, und ich trinke den kalt gewordenen Tee."
DEINE MAROTTEN: Du schreibst Einschübe in Klammern (oft mit Seufzer). Du sagst "Spoiler:" bevor du das Ende einer Anekdote verrätst. Du benutzt "Theorie vs. Realität"-Gegenüberstellungen. Du lachst über deine eigenen Fehler: "Rate mal wer gestern selbst zu laut geschrien hat. Genau."
DEINE MEINUNGEN: Instagram-Elternschaft ist giftig. Kinder brauchen weniger Förderung und mehr Langeweile. Attachment Parenting funktioniert super — bis das zweite Kind kommt. "Qualitätszeit" ist ein Konzept von Leuten ohne Kinder. Perfektion ist der Feind von "gut genug".
DEINE REFERENZEN: Schulhof-Gespräche, Freiburger Münstermarkt, KIKA-Sendungen, durchwachte Nächte, das Chaos morgens um 7:15 wenn der Schulbus in 5 Minuten kommt.`,
  },
  "mental-health": {
    name: "Sarah Keller",
    bio: "Sarah Keller ist Psychologin und Autorin aus Wien. Sie hat an der Universität Wien zu Resilienz und emotionaler Gesundheit geforscht, bevor sie angefangen hat, für ein breiteres Publikum zu schreiben. Ihr Antrieb: psychologisches Wissen aus dem Elfenbeinturm holen und dahin bringen, wo es gebraucht wird — in den Alltag.",
    voice: `Du bist Sarah Keller. Psychologin, Wien-Neubau, 38, Forschung + Praxis + Autorin.
DEIN STIL: Intellektuell aber zugänglich. Du denkst beim Schreiben laut — der Leser begleitet deinen Gedankengang, inklusive Sackgassen und Korrekturen. Du bist die Freundin die Psychologie studiert hat und der man nachts um 2 eine Frage schicken kann.
DEINE MAROTTEN: Du sagst "Die Forschung sagt X, aber ehrlich gesagt..." wenn deine Erfahrung von Studien abweicht. Du benutzt Wiener Ausdrücke: "Na geh" (Ungläubigkeit), "Passt scho" (Akzeptanz). Du korrigierst dich selbst im Text: "Nein, das stimmt so nicht. Genauer gesagt..."
DEINE MEINUNGEN: Resilienz ist kein Persönlichkeitsmerkmal sondern eine Fähigkeit. Positive Psychologie wird oft missbraucht um echtes Leid zu ignorieren. Therapie ist kein Luxus. Nicht jede Traurigkeit ist Depression — manchmal ist das Leben einfach gerade scheiße.
DEINE REFERENZEN: Wiener Kaffeehäuser zum Nachdenken, Donaukanal-Spaziergänge, österreichischer Schmäh, Uni Wien Hörsäle, Viktor Frankl als Wiener Referenz.`,
  },
  career: {
    name: "Jan Hartmann",
    bio: "Jan Hartmann hat als Personalberater und Karrierecoach über 2.000 Bewerbungsprozesse begleitet — auf beiden Seiten des Schreibtischs. Heute berät er Berufstätige, die mehr aus ihrem Arbeitsleben machen wollen, ohne sich dabei zu verlieren. Er lebt in Leipzig und flucht regelmäßig über schlechte Stellenanzeigen.",
    voice: `Du bist Jan Hartmann. Ex-Personalberater, Leipzig-Plagwitz, 42, karrieremüde aber nicht zynisch.
DEIN STIL: Lakonisch, desillusioniert aber konstruktiv. Du schreibst wie ein Kumpel der im HR gearbeitet hat und dir jetzt die Wahrheit erzählt die dein Karrierecoach dir nicht sagt. Du fluchst gelegentlich — dezent, aber es kommt durch.
DEINE MAROTTEN: Du sagst "Und jetzt die Wahrheit:" wenn du Mythen entlarvst. Du benutzt "Bewerbungs-Bullshit-Bingo" als Running Gag. Du fängst Absätze manchmal mit einem Wort an: "Lebenslauf." oder "LinkedIn." als Einleitung. Du erzählst vom "schlimmsten Vorstellungsgespräch das ich je gesehen habe" (immer ein anderes).
DEINE MEINUNGEN: 90% der Stellenanzeigen beschreiben einen Job der so nicht existiert. Personal Branding ist meist narzisstischer Quatsch. Gehaltsverhandlung ist eine Fähigkeit die man lernen kann. Arbeitgeber lügen genauso viel wie Bewerber. Home Office hat die Arbeitswelt besser gemacht als 20 Jahre HR-Kongresse.
DEINE REFERENZEN: Leipziger Baumwollspinnerei (kreatives Umfeld), Sachsen-Humor, Karl-Heine-Kanal, ostdeutsche Arbeitsmoral-Klischees die er augenzwinkernd bricht.`,
  },
};

const DEFAULT_PEN_AUTHOR: PenAuthor = {
  name: "Luisa Falkner",
  bio: "Luisa Falkner ist freie Autorin und lebt in Norddeutschland. Sie schreibt Sachbücher zu Themen, die sie selbst nicht mehr losgelassen haben — und versucht dabei, die Dinge so zu erklären, wie sie sich gewünscht hätte, dass jemand sie ihr erklärt.",
  voice: `Du bist Luisa Falkner. Freie Autorin, Lübeck, introvertiert, neugierig, leicht melancholisch.
DEIN STIL: Nachdenklich, essayistisch, wie ein langer Brief an eine kluge Freundin. Du nimmst dir Zeit für Gedanken und hetzt nicht durch Themen. Du gibst zu dass du keine Expertin bist — du bist jemand der viel gelesen und nachgedacht hat.
DEINE MAROTTEN: Du schreibst "Ich weiß nicht ob das stimmt, aber:" bevor du eine Beobachtung teilst. Du machst Analogien zu Literatur und Filmen. Du beendest Abschnitte manchmal mit einer offenen Frage statt einer Antwort.`,
};

// Cover design presets per category
interface CoverPreset {
  style: string;
  headingFont: string;
  bodyFont: string;
  accent: string;
  promptStyle: string;
}

const COVER_PRESETS: Record<string, CoverPreset> = {
  "self-help": {
    style: "cinematic",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans 9pt",
    accent: "#d4a574",
    promptStyle: "warm golden hour lighting, person silhouette at sunrise, inspirational, hope, soft bokeh, atmospheric fog",
  },
  health: {
    style: "bold",
    headingFont: "Montserrat",
    bodyFont: "Inter",
    accent: "#22c55e",
    promptStyle: "fresh vibrant nature, green leaves, clean water droplets, healthy food flat lay, bright natural daylight, energetic",
  },
  productivity: {
    style: "minimal",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    accent: "#3b82f6",
    promptStyle: "clean minimal desk setup, modern workspace, geometric shapes, blue accent, sharp focus, contemporary design",
  },
  finance: {
    style: "minimal",
    headingFont: "Inter",
    bodyFont: "DM Sans 9pt",
    accent: "#0d9488",
    promptStyle: "abstract financial growth chart, teal and dark blue tones, premium feel, clean geometric patterns, wealth and success",
  },
  relationships: {
    style: "editorial",
    headingFont: "Playfair Display",
    bodyFont: "DM Sans 9pt",
    accent: "#e11d48",
    promptStyle: "warm intimate setting, soft candlelight, two coffee cups, cozy atmosphere, romantic warm tones, editorial photography",
  },
  parenting: {
    style: "editorial",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans 9pt",
    accent: "#f59e0b",
    promptStyle: "warm family scene, playful colors, sunlit room, children toys, soft pastel palette, joyful bright atmosphere",
  },
  "mental-health": {
    style: "split",
    headingFont: "Cormorant Garamond",
    bodyFont: "Inter",
    accent: "#8b5cf6",
    promptStyle: "serene calm landscape, still water reflection, meditation zen stones, purple blue twilight sky, peaceful tranquil mood",
  },
  career: {
    style: "split",
    headingFont: "Montserrat",
    bodyFont: "Inter",
    accent: "#f97316",
    promptStyle: "professional modern office skyline, confident pose, urban architecture, warm orange sunset, ambitious upward perspective",
  },
};

const DEFAULT_PRESET: CoverPreset = {
  style: "cinematic",
  headingFont: "Playfair Display",
  bodyFont: "DM Sans 9pt",
  accent: "#e67300",
  promptStyle: "dramatic cinematic lighting, atmospheric depth, rich color palette, editorial photography",
};

async function sendNotificationEmail(ebook: EbookEntry): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.TO_EMAIL || "mail@bjoernpuls.com";
  if (!resendKey) {
    console.log("[auto-book] RESEND_API_KEY not set, skipping email");
    return;
  }

  const domain = process.env.DOMAIN || "ebookgenerator.puls.io";
  const downloadBase = `https://${domain}/api/library/download?id=${ebook.id}`;
  const kdp = ebook.kdpMetadata;

  const subject = `Neues Auto-Book: "${ebook.title}" — KDP-ready!`;
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Neues Auto-Book generiert</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Reddit-Scanner → AI → KDP-ready PDF + EPUB</p>
  </div>
  <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h2 style="margin: 0 0 4px; font-size: 22px; color: #111;">${ebook.title}</h2>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 15px;">${ebook.subtitle || ""}</p>
      <div style="font-size: 13px; color: #6b7280;">
        ${ebook.wordCount?.toLocaleString("de-DE") || "?"} Woerter · ${ebook.chapters?.length || "?"} Kapitel · ${ebook.authors?.join(", ")}
      </div>
    </div>
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">Downloads</h3>
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=pdf" style="color: #8b5cf6;">PDF herunterladen</a></p>
      ${ebook.outputFiles?.epub ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=epub" style="color: #8b5cf6;">EPUB herunterladen</a></p>` : ""}
      <p style="margin: 4px 0;"><a href="${downloadBase}&format=md" style="color: #8b5cf6;">Markdown herunterladen</a></p>
      ${ebook.outputFiles?.["cover-pdf"] ? `<p style="margin: 4px 0;"><a href="${downloadBase}&format=cover-composed" style="color: #8b5cf6;">Cover PDF herunterladen</a></p>` : ""}
    </div>
    <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px;">Kapitel</h3>
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        ${(ebook.chapters || []).map((c) => `<li>${c}</li>`).join("")}
      </ol>
    </div>
    ${kdp ? `
    <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #8b5cf6; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; color: #8b5cf6;">KDP Metadaten (Copy/Paste)</h3>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">TITEL</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchTitle || ebook.title}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">UNTERTITEL</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${kdp.searchSubtitle || ebook.subtitle || ""}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">BESCHREIBUNG</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${(kdp.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KEYWORDS</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px; font-family: monospace;">${(kdp.keywords || []).join(" | ")}</div>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">KATEGORIEN</p>
        ${(kdp.categories || []).map((c) => `<div style="background: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 4px;">${c.path || c.name}</div>`).join("")}
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">PREIS</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">
          ${kdp.pricing?.recommendedEUR || "?"} EUR / ${kdp.pricing?.recommendedUSD || "?"} USD
        </div>
      </div>
      ${kdp.preflight ? `
      <div style="margin-bottom: 16px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">DRUCKDATEN</p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 13px;">
          Trim: ${kdp.preflight.trimSize} · Spine: ${kdp.preflight.spineWidth} · Cover: ${kdp.preflight.coverDimensions}
        </div>
      </div>` : ""}
    </div>` : ""}
    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      Auto-generiert von ebook-gen · Reddit → Claude → Typst → KDP
    </p>
  </div>
</div>`;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "ebook-gen <send@herzschlag-der-erde.de>",
        to: [toEmail],
        subject,
        html,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    console.log(`[auto-book] email sent to ${toEmail}: ${data.id}`);
  } catch (err) {
    console.error("[auto-book] email failed:", err);
  }
}

interface RedditCache {
  ideas: RedditIdea[];
  posts: unknown[];
  timestamp: number;
}

async function getRedditIdeas(): Promise<RedditIdea[]> {
  const cacheFile = join(CACHE_DIR, "reddit-scan.json");
  if (!existsSync(cacheFile)) return [];
  try {
    const raw = await readFile(cacheFile, "utf-8");
    const cache: RedditCache = JSON.parse(raw);
    return cache.ideas || [];
  } catch {
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function triggerAutoGenerate(
  idea: RedditIdea
): Promise<string | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const penAuthor = PEN_AUTHORS[idea.category] || DEFAULT_PEN_AUTHOR;
  const preset = COVER_PRESETS[idea.category] || DEFAULT_PRESET;

  console.log(
    `[auto-book] triggering: "${idea.title}" (demand: ${idea.demandScore}, author: ${penAuthor.name}, cover: ${preset.style})`
  );

  try {
    const resp = await fetch(`${baseUrl}/api/auto-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: idea.topic,
        pages: 50,
        lang: "de",
        format: "pdf",
        template: "kindle-kdp",
        paper: "a4",
        pageWidth: "15.24cm",
        pageHeight: "22.86cm",
        author: penAuthor.name,
        authorBio: penAuthor.bio,
        authorVoice: penAuthor.voice,
        coverStyle: preset.style,
        headingFont: preset.headingFont,
        bodyFont: preset.bodyFont,
        accent: preset.accent,
        coverPromptHint: preset.promptStyle,
      }),
    });

    if (!resp.ok || !resp.body) {
      console.error("[auto-book] auto-generate failed:", resp.status);
      return null;
    }

    // Read the SSE stream to find the ebook ID and wait for completion
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let ebookId: string | null = null;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: id")) {
          // Next data line has the ID
        } else if (line.startsWith("data: ") && !ebookId) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.id) ebookId = data.id;
          } catch {
            // not JSON or no id
          }
        } else if (line.startsWith("event: done")) {
          // Generation complete
          reader.cancel();
          return ebookId;
        } else if (line.startsWith("event: error")) {
          reader.cancel();
          return null;
        }
      }
    }

    return ebookId;
  } catch (err) {
    console.error("[auto-book] fetch error:", err);
    return null;
  }
}

// GET: show auto-book status and history
export async function GET() {
  const log = await readLog();
  const ideas = await getRedditIdeas();

  return NextResponse.json({
    lastRun: log.runs[0] || null,
    history: log.runs.slice(0, 10),
    nextIdea: ideas[0]
      ? {
          title: ideas[0].title,
          demandScore: ideas[0].demandScore,
          demandReason: ideas[0].demandReason,
        }
      : null,
    totalIdeas: ideas.length,
  });
}

// POST: pick top idea and generate a book
export async function POST(request: NextRequest) {
  // Optional: pass a secret to prevent unauthorized triggers
  const secret = request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.AUTO_BOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get Reddit ideas
  const ideas = await getRedditIdeas();
  if (ideas.length === 0) {
    return NextResponse.json(
      { error: "Keine Reddit-Ideen im Cache. Erst /api/reddit-scan aufrufen." },
      { status: 404 }
    );
  }

  // 2. Sort by demand score (highest first)
  ideas.sort(
    (a, b) => (b.demandScore || 0) - (a.demandScore || 0)
  );

  // 3. Check library for duplicates (fuzzy title match)
  const library = await loadLibrary();
  const existingTitles = new Set(
    library.map((e) => normalizeTitle(e.title))
  );
  const existingTopics = new Set(
    library.map((e) => normalizeTitle(e.topic))
  );

  const bestIdea = ideas.find(
    (idea) =>
      !existingTitles.has(normalizeTitle(idea.title)) &&
      !existingTopics.has(normalizeTitle(idea.topic))
  );

  if (!bestIdea) {
    return NextResponse.json(
      {
        error: "Alle Reddit-Ideen wurden bereits generiert. Warte auf neuen Reddit-Scan.",
        existingBooks: library.length,
        ideasChecked: ideas.length,
      },
      { status: 409 }
    );
  }

  console.log(
    `[auto-book] picked: "${bestIdea.title}" (demand: ${bestIdea.demandScore})`
  );

  // 4. Log the run as started
  const run: AutoBookLog["runs"][0] = {
    date: new Date().toISOString(),
    idea: {
      title: bestIdea.title,
      demandScore: bestIdea.demandScore || 0,
      topic: bestIdea.topic,
    },
    ebookId: null,
    status: "started",
  };
  await appendLog(run);

  // 5. Trigger auto-generate and wait for completion
  const ebookId = await triggerAutoGenerate(bestIdea);

  // 6. Update log
  run.ebookId = ebookId;
  run.status = ebookId ? "done" : "error";
  if (!ebookId) run.error = "auto-generate returned no ID";
  const log = await readLog();
  if (log.runs[0]?.date === run.date) {
    log.runs[0] = run;
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
  }

  if (ebookId) {
    console.log(`[auto-book] done! ebook ID: ${ebookId}`);

    // Send notification email with KDP metadata + download links
    const ebook = await getEntry(ebookId);
    if (ebook) {
      await sendNotificationEmail(ebook);
    }

    return NextResponse.json({
      status: "done",
      ebookId,
      idea: {
        title: bestIdea.title,
        demandScore: bestIdea.demandScore,
        demandReason: bestIdea.demandReason,
        category: bestIdea.category,
      },
    });
  }

  return NextResponse.json(
    { error: "Ebook-Generierung fehlgeschlagen", idea: bestIdea.title },
    { status: 500 }
  );
}
