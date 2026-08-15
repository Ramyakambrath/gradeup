const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "for", "to", "is", "are", "this", "that",
  "with", "as", "at", "by", "from", "it", "its", "be", "which", "when", "if", "not", "no",
  "can", "will", "using", "than", "then", "each", "into", "onto", "you", "your", "their",
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function subjectVocab(topics) {
  const words = new Set();
  topics.forEach((t) => {
    tokenize(t.title).forEach((w) => words.add(w));
    tokenize(t.strand).forEach((w) => words.add(w));
    tokenize(t.concept).forEach((w) => words.add(w));
  });
  return words;
}

/**
 * Guess which subject a chunk of scanned text belongs to, by keyword overlap
 * against each subject's topic titles/strands/concepts.
 */
export function classifySubject(text, subjects, topicsBySubject) {
  const words = tokenize(text);
  const scores = {};
  subjects.forEach((s) => {
    const vocab = subjectVocab(topicsBySubject[s.id] || []);
    scores[s.id] = words.reduce((n, w) => n + (vocab.has(w) ? 1 : 0), 0);
  });
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = ranked[0] || [null, 0];
  const confidence = words.length ? bestScore / words.length : 0;
  return { subjectId: bestScore > 0 ? bestId : null, confidence, scores };
}
