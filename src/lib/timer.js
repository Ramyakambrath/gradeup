export function formatSeconds(total) {
  const s = Math.max(0, Math.round(total));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm < 10 ? "0" : ""}${mm}:${ss < 10 ? "0" : ""}${ss}`;
}

/** Recommended time for a mock: ~90 seconds per mark, minimum 1 minute. */
export function recommendedMockSeconds(questions) {
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  return Math.max(60, totalMarks * 90);
}
