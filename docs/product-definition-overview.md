# Product Definition: GCSE Study App — MVP (AQA Maths)

## Input synthesis

- **Persona:** GCSE student (age 14–16) sitting AQA GCSE Mathematics (spec 8300), Foundation or Higher tier.
- **User-realisable value:** the student learns spec-aligned content, practises with exam-style questions marked against mark-scheme logic, and retains it via a spaced-repetition review loop fed by their mistakes.
- **Scope boundary (MVP):** one board (AQA), one subject (Maths), three capabilities — explanations, mocks with auto-marking, spaced repetition. Notebook scanning, highlight capture, weakness heatmap, multi-subject/multi-board are explicitly v2+.
- **Non-functional requirements:** users are minors — UK Children's Code (ICO) compliance, minimal data collection, no ads/tracking; offline caching of downloaded content; WCAG 2.1 AA accessibility; LLM outputs grounded in the AQA 8300 spec; no redistribution of copyrighted AQA past papers — MVP uses original AQA-style questions tagged to spec references.
- **Dependencies:** LLM API for explanations and marking-feedback generation; AQA 8300 specification content model (spec references, e.g. "N1", "A4", topic → paper mapping); question bank authored/generated and human-reviewed before release.

## Epics

**MVP (v1):**

1. **Spec-aligned topic explanations** — `epic-topic-explanations.md`
2. **Mock practice with auto-marking** — `epic-mock-practice.md`
3. **Spaced repetition review engine** — `epic-spaced-repetition.md`

**v2:**

4. **Multi-subject support** — `epic-multi-subject.md`
5. **Notebook scanning and smart cards** — `epic-scanning-smart-cards.md`
6. **Group study** — `epic-group-study.md`

**v3:**

7. **Revision planner with exam countdown** — `epic-revision-planner.md`
8. **Teacher edition (classroom dashboard)** — `epic-teacher-edition.md` (placeholder pending commercial validation)

**Validation:** `student-interview-script.md` — run before committing to v2/v3 build order.

Release order is 1 → 2 → 3 → 4 → 5 → 6. Epic 1 is releasable alone (a spec-aligned study reference). Epic 2 depends on the topic model from Epic 1. Epic 3 depends on Epic 2 (wrong answers seed the review deck) but ships with manual card creation so it degrades gracefully. Epic 4 generalises 1–3 across subjects. Epic 5 needs a handwriting-OCR accuracy spike before commitment. Epic 6 needs an accounts/sync backend (v1 is local-first) and a staffed moderation process — the two biggest new infrastructure costs in the plan.

## Flagged for your judgment

- Five stories use `(non-standard action)`: "Ask a follow-up question", "Review due cards", "Scan a notebook page", and "Join a study group". None fit the canonical verb taxonomy; all are core. Consider adding "ask", "review", "scan", and "join" as verbs.
- Group study is the highest-risk epic: it requires accounts/sync (v1 is local-first), a moderation process, and the strictest safeguarding posture (invite-only, no chat, no public discovery). Deliberately last in release order.
- Scanning has an explicit accuracy gate (≥90% word-level on teen handwriting) as a go/no-go spike before the epic is committed.
- Marking model risk: maths short-answer marking is deterministic for numeric answers but method marks (M1/A1-style) for multi-step working require either structured answer entry or LLM judging — the stories assume structured entry for MVP, with LLM feedback as explanation only, never as the mark authority.
- Age/consent flow (under-13 handling, parental consent) is listed as a business requirement but deliberately has no stories yet — needs a legal decision on target age floor before defining.
