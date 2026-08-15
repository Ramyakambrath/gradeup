/** Client for topic-scoped follow-up Q&A. */

const OFF_TOPIC =
  "That's a bit outside this topic — try asking something about the explanation you're reading, or browse another topic in the library.";

const OFFLINE_MSG =
  "You're offline — questions need a connection. Your question is saved and you can send it when you're back online.";

const BUSY_MSG = "The tutor is busy — try again in a minute.";

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** Answer simple, well-defined arithmetic questions directly, without needing an LLM. */
function tryCompute(question) {
  const q = question.toLowerCase().trim();

  let m = q.match(/(?:square\s*root\s*of|sqrt\(?)\s*(-?\d+(?:\.\d+)?)\)?/) || q.match(/√\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (n < 0) return `The square root of a negative number (${n}) isn't a real number at GCSE level.`;
    const r = Math.round(Math.sqrt(n) * 1000) / 1000;
    return `√${n} = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
  }

  m = q.match(/cube\s*root\s*of\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    const r = Math.round(Math.cbrt(n) * 1000) / 1000;
    return `Cube root of ${n} = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*squared/) || q.match(/(-?\d+(?:\.\d+)?)\s*\^\s*2\b/);
  if (m) {
    const n = parseFloat(m[1]);
    return `${n}² = ${n * n}`;
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*cubed/) || q.match(/(-?\d+(?:\.\d+)?)\s*\^\s*3\b/);
  if (m) {
    const n = parseFloat(m[1]);
    return `${n}³ = ${n ** 3}`;
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*(?:to the power of|\^)\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const base = parseFloat(m[1]);
    const exp = parseFloat(m[2]);
    return `${base}^${exp} = ${Math.round(base ** exp * 1e6) / 1e6}`;
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*%\s*of\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const pct = parseFloat(m[1]);
    const of = parseFloat(m[2]);
    return `${pct}% of ${of} = ${Math.round(((pct / 100) * of) * 1e6) / 1e6}`;
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-x×*÷/])\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const a = parseFloat(m[1]);
    const op = m[2];
    const b = parseFloat(m[3]);
    if ((op === "÷" || op === "/") && b === 0) return "You can't divide by zero.";
    const result =
      op === "+" ? a + b :
      op === "-" ? a - b :
      op === "x" || op === "×" || op === "*" ? a * b :
      a / b;
    return `${a} ${op} ${b} = ${Math.round(result * 1e6) / 1e6}`;
  }

  return null;
}

/** Rule-based fallback when no LLM API key is configured. */
function mockAnswer(question, topic, tier) {
  const computed = tryCompute(question);
  if (computed) return computed;

  const q = question.toLowerCase();

  if (/^(hi|hello|hey)\b/.test(q) || q.length < 4) {
    return `Ask me anything about **${topic.title}** (${topic.ref}). I'll explain in ${tier} tier language.`;
  }

  if (/exam|paper|mark/.test(q)) {
    return `For ${topic.ref} (${topic.title}), exam questions often test: ${topic.concept.split(".")[0]}. Check the worked example on this page — ${topic.example.split("—")[0].trim()}.`;
  }

  if (/mistake|wrong|confus/.test(q)) {
    return `A common mistake here: ${topic.mistakes} Re-read the concept section — ${topic.concept.split(".")[0]}.`;
  }

  if (/example|how|why|what|when|explain/.test(q)) {
    return `For **${topic.title}**: ${topic.concept} Example: ${topic.example} (${tier} tier)`;
  }

  if (!q.includes(topic.ref.toLowerCase()) && !topic.title.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w))) {
    const mathsWords = ["math", "biology", "english", "game", "sport", "weather", "joke"];
    if (mathsWords.some((w) => q.includes(w)) && !q.includes("equation") && !q.includes("number")) {
      return OFF_TOPIC;
    }
  }

  return `Good question about ${topic.title}. ${topic.concept} Try working through: ${topic.example}`;
}

export async function askFollowUp({ question, topic, tier, history = [] }) {
  if (isOffline()) {
    const err = new Error(OFFLINE_MSG);
    err.offline = true;
    throw err;
  }

  if (question.trim().length > 500) {
    throw new Error("Keep your question under 500 characters.");
  }

  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, topic, tier, history }),
    });

    if (!res.ok) {
      if (res.status === 503) throw new Error(BUSY_MSG);
      throw new Error(BUSY_MSG);
    }

    const data = await res.json();
    return data.answer;
  } catch (err) {
    if (err.offline) throw err;
    // Fallback to mock when API unavailable (no key configured)
    return mockAnswer(question, topic, tier);
  }
}

export { OFFLINE_MSG, OFF_TOPIC, BUSY_MSG };
