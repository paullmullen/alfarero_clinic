// src/helpers/releaseNotes.js
import releaseNotesEn from "../release-notes/releaseNotes.en.md";
import releaseNotesEs from "../release-notes/releaseNotes.es.md";

/**
 * Returns release notes markdown string by language.
 * `lang` is typically "en" or "es" from i18n.language
 */
export function getReleaseNotesMarkdown(lang = "en") {
  const l = (lang || "en").toLowerCase();
  if (l.startsWith("es")) return releaseNotesEs;
  return releaseNotesEn;
}
