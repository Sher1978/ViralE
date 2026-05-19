export interface PreprocessedSubtitles {
  intro: string;
  body: string;
  conclusion: string;
  key_sentences: string[];
}

export function preprocessSubtitles(rawText: string): PreprocessedSubtitles {
  if (!rawText) {
    return { intro: '', body: '', conclusion: '', key_sentences: [] };
  }

  // Split by sentence ending punctuation
  const sentences = rawText
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  const total = sentences.length;
  
  if (total <= 3) {
    return {
      intro: rawText,
      body: rawText,
      conclusion: rawText,
      key_sentences: sentences,
    };
  }

  // 15% intro, 65% body, 20% conclusion
  const introEnd = Math.max(1, Math.floor(total * 0.15));
  const bodyEnd = Math.max(introEnd + 1, Math.floor(total * 0.80));

  const intro = sentences.slice(0, introEnd).join('. ') + '.';
  const body = sentences.slice(introEnd, bodyEnd).join('. ') + '.';
  const conclusion = sentences.slice(bodyEnd).join('. ') + '.';

  // Get top 5 longest sentences which carry structural meaning rather than brief filler phrases
  const keySentences = [...sentences]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  return {
    intro,
    body,
    conclusion,
    key_sentences: keySentences,
  };
}
