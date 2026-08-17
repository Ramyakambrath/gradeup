/** Client for topic-scoped follow-up Q&A. */

const OFF_TOPIC =
  "That's a bit outside this topic — try asking something about the explanation you're reading, or browse another topic in the library.";

const OFFLINE_MSG =
  "You're offline — questions need a connection. Your question is saved and you can send it when you're back online.";

const BUSY_MSG = "The tutor is busy — try again in a minute.";

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** Safely evaluate a plain arithmetic expression (+ - × ÷ and parentheses only — no eval/Function). Returns null if it can't be parsed. */
function evalExpr(expr) {
  const s = expr.replace(/\s+/g, "").replace(/[x×]/g, "*").replace(/÷/g, "/");
  let i = 0;

  function parseNumber() {
    const start = i;
    if (s[i] === "-") i++;
    while (i < s.length && /[\d.]/.test(s[i])) i++;
    if (i === start || (i === start + 1 && s[start] === "-")) return null;
    return parseFloat(s.slice(start, i));
  }
  function parseFactor() {
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      if (s[i] !== ")") return null;
      i++;
      return v;
    }
    return parseNumber();
  }
  function parseTerm() {
    let v = parseFactor();
    if (v === null) return null;
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i];
      i++;
      const rhs = parseFactor();
      if (rhs === null) return null;
      if (op === "/" && rhs === 0) return null;
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  }
  function parseExpr() {
    let v = parseTerm();
    if (v === null) return null;
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i];
      i++;
      const rhs = parseTerm();
      if (rhs === null) return null;
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }

  if (!s) return null;
  const result = parseExpr();
  if (i !== s.length || result === null || Number.isNaN(result)) return null;
  return result;
}

const SUPERSCRIPT_DIGITS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

function formatPower(base, exp) {
  const b = parseFloat(base);
  const e = parseFloat(exp);
  const result = Math.round(b ** e * 1e6) / 1e6;
  const display = e === 2 ? "²" : e === 3 ? "³" : `^${exp}`;
  return `${b}${display} = ${result}`;
}

/** Any way of expressing "N to the power of M": "N squared/cubed", superscript digits (N², N⁴...), N^M, or "N to the power of M". */
function tryPower(q) {
  let m = q.match(/(-?\d+(?:\.\d+)?)\s*squared/);
  if (m) return formatPower(m[1], 2);

  m = q.match(/(-?\d+(?:\.\d+)?)\s*cubed/);
  if (m) return formatPower(m[1], 3);

  m = q.match(/(-?\d+(?:\.\d+)?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
  if (m) {
    const expStr = m[2].split("").map((ch) => SUPERSCRIPT_DIGITS[ch]).join("");
    return formatPower(m[1], expStr);
  }

  m = q.match(/(-?\d+(?:\.\d+)?)\s*(?:to the power of|\^)\s*(-?\d+(?:\.\d+)?)/);
  if (m) return formatPower(m[1], m[2]);

  return null;
}

/** Find the substring inside the parentheses starting at openIdx (which must point at "("), respecting nesting. */
function findParenExpr(str, openIdx) {
  let depth = 0;
  for (let j = openIdx; j < str.length; j++) {
    if (str[j] === "(") depth++;
    else if (str[j] === ")") {
      depth--;
      if (depth === 0) return str.slice(openIdx + 1, j);
    }
  }
  return null;
}

/** Answer simple, well-defined arithmetic questions directly, without needing an LLM. */
function tryCompute(question) {
  const q = question.toLowerCase().trim();

  // √(...) or sqrt(...), where "..." can be any arithmetic expression, e.g. √(5+4)
  const rootOpen = q.search(/(?:sqrt|√)\s*\(/);
  if (rootOpen !== -1) {
    const openIdx = q.indexOf("(", rootOpen);
    const inner = findParenExpr(q, openIdx);
    const val = inner !== null ? evalExpr(inner) : null;
    if (val !== null) {
      if (val < 0) return `The square root of a negative number (${val}) isn't a real number at GCSE level.`;
      const r = Math.round(Math.sqrt(val) * 1000) / 1000;
      return `√(${inner.trim()}) = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
    }
  }

  // Bare form without parentheses, e.g. "square root of 64" or "√64"
  let m = q.match(/(?:square\s*root\s*of|sqrt)\s*(-?\d+(?:\.\d+)?)/) || q.match(/√\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (n < 0) return `The square root of a negative number (${n}) isn't a real number at GCSE level.`;
    const r = Math.round(Math.sqrt(n) * 1000) / 1000;
    return `√${n} = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
  }

  // Cube root, with or without parentheses
  const cbrtOpen = q.search(/cube\s*root\s*of\s*\(/);
  if (cbrtOpen !== -1) {
    const openIdx = q.indexOf("(", cbrtOpen);
    const inner = findParenExpr(q, openIdx);
    const val = inner !== null ? evalExpr(inner) : null;
    if (val !== null) {
      const r = Math.round(Math.cbrt(val) * 1000) / 1000;
      return `Cube root of (${inner.trim()}) = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
    }
  }
  m = q.match(/cube\s*root\s*of\s*(-?\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    const r = Math.round(Math.cbrt(n) * 1000) / 1000;
    return `Cube root of ${n} = ${r}${Number.isInteger(r) ? "" : " (to 3 d.p.)"}`;
  }

  // Any power — "N squared/cubed", superscript digits (N², N⁴...), N^M, or "N to the power of M"
  const power = tryPower(q);
  if (power) return power;

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
