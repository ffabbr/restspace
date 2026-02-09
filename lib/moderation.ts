// Hate speech and slur blacklist — checked as whole-word boundaries (case-insensitive).
// This covers slurs, dehumanizing language, and calls to violence.
// Patterns use word boundaries so partial matches in normal words are not flagged.

const BLACKLISTED_PATTERNS: RegExp[] = [
  // Racial / ethnic slurs
  /\bn+[i1!]+[gq]+(?:[e3]+r|[a@]+[h]?)\b/i,
  /\bk+[i1!]+k+[e3]+[s$]?\b/i,
  /\bch+[i1!]+n+k+[s$]?\b/i,
  /\bsp+[i1!]+c+[s$]?\b/i,
  /\bw+[e3]+tb+[a@]+ck+[s$]?\b/i,
  /\bg+[o0]+[o0]+k+[s$]?\b/i,
  /\bcoon+[s$]?\b/i,
  /\bdarki+e+[s$]?\b/i,
  /\btowel\s*head[s]?\b/i,
  /\brag\s*head[s]?\b/i,
  /\bbeaner[s]?\b/i,
  /\bgringo[s]?\b/i,

  // Anti-LGBTQ slurs
  /\bf+[a@]+g+[s$]?\b/i,
  /\bf+[a@]+g+[o0]+t+[s$]?\b/i,
  /\bd+[y]+k+[e3]+[s$]?\b/i,
  /\btr+[a@]+nn+[yie]+[s$]?\b/i,

  // Misogynistic slurs
  /\bc+[u]+n+t+[s$]?\b/i,

  // Antisemitic
  /\bheil\s+hitler\b/i,
  /\bsieg\s+heil\b/i,
  /\bgas\s+the\b/i,

  // Dehumanizing phrases
  /\bsub\s*human[s]?\b/i,
  /\bvermin\b/i,
  /\bcockroach(?:es)?\b/i,

  // Calls to violence against groups
  /\bkill\s+all\b/i,
  /\bdeath\s+to\b/i,
  /\bgenocide\b/i,
  /\bethnic\s+cleansing\b/i,

  // White supremacy phrases
  /\bwhite\s+power\b/i,
  /\bwhite\s+suprema/i,
  /\b14\s*88\b/,
  /\brace\s+war\b/i,
];

export function containsHateSpeech(text: string): boolean {
  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[_\-\.]+/g, " ");      // normalize separators

  return BLACKLISTED_PATTERNS.some((pattern) => pattern.test(normalized));
}
