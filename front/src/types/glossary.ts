// Mirrors back/src/main/java/com/collabothon/back/glossary/GlossaryController.java
export type TermSummary = {
  slug: string;
  name: string;
  shortDescription: string;
};

export type GlossaryCategory = {
  slug: string;
  name: string;
  terms: TermSummary[];
};

export type TermRef = { slug: string; name: string };

// GET /api/glossary/terms/{slug}. Definitions contain [[slug|text]] links (see lib/glossaryMarkup.ts).
export type TermDetail = {
  slug: string;
  name: string;
  fullName: string | null;
  category: { slug: string; name: string };
  definitionStandard: string;
  /** Null until the "in plain words" version has been written. */
  definitionPlain: string | null;
  example: string | null;
  graphicKey: string | null;
  related: TermRef[];
  lesson: { id: number; title: string } | null;
};

export type LanguageLevel = 'plain' | 'standard';

// GET /api/glossary/search?q=
export type TermHit = { slug: string; name: string; category: { slug: string; name: string }; shortDescription: string };
export type Mention = { slug: string; name: string; snippet: string };
export type SearchResponse = {
  terms: TermHit[];
  /** Other terms whose definition contains the text. */
  mentions: Mention[];
  /** Similar names, only filled when `terms` is empty (typo tolerance). */
  suggestions: TermHit[];
};
