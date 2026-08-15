function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build multiple-choice quiz questions from a pool of topics.
 * Each question asks which statement correctly describes a topic;
 * distractors are drawn from the other topics' concepts.
 */
export function buildQuizQuestions(topics, count = 6) {
  const items = topics.map((t) => ({
    ref: t.ref,
    title: t.title,
    fact: (t.concept.split(".")[0] + ".").trim(),
  }));
  const pool = shuffle(items).slice(0, Math.min(count, items.length));

  return pool.map((item) => {
    const distractors = shuffle(items.filter((x) => x.ref !== item.ref))
      .slice(0, 3)
      .map((x) => x.fact);
    const choices = shuffle([item.fact, ...distractors]);
    return {
      ref: item.ref,
      question: `Which statement correctly describes "${item.title}"?`,
      choices,
      answer: item.fact,
    };
  });
}
