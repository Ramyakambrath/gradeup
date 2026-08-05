# GradeUp — GCSE Study App

AQA GCSE study app with spec-aligned topic explanations, mock practice with auto-marking, and spaced repetition review.

Based on the product definition in `docs/` — MVP focuses on **AQA Maths (8300)** with Foundation/Higher tier support.

## Features (MVP)

- **Onboarding** — tier selection (Foundation / Higher)
- **Topics** — browse and search AQA spec topics with concept, example, and common mistakes
- **Mocks** — exam-style questions with instant marking and mark-scheme feedback
- **Review** — spaced repetition deck (cards from topics, mocks, and scanned notes)
- **Local-first** — deck, tier, notes, and groups persist in `localStorage`

## v2+ (demo stubs)

- Scan notes → smart cards
- Group study
- Biology & English Lit subject tabs

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Docs

Product specs and epics from the original archive are in `docs/`.
