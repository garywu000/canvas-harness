# Review deck: current local source and official 3.6 comparison

Maintainer handoff for Flzsh/canvas-harness, following Gary's PR #44 and issue
#56. The Focus room report is upstream issue #63; this handoff concerns flashcards.

Compared: release **v3.6.0** and current main commit
`51eb229b0c43010a1475ab1eff2341c56c1df72d`.
Local source snapshot: **Gary Edition 3.5.1**.
This folder contains reference components and porting notes, not an installable
extension or a complete replacement for current upstream host files.

## Findings

The official adaptation retains substantial card functionality: spaced repetition,
two-way and cloze cards, Again/Good/Easy, daily limits, before-test scheduling,
search/edit/pause/delete and import/export. It also adds CSV/TSV handling, manual
test dates and stronger ownership, validation and concurrency checks. Preserve
those improvements when restoring Gary's original room-level workflow.

| Area | Gary's local version | Current official adaptation |
| --- | --- | --- |
| Design | Dedicated review/manager overlay, styled card, progress bar, keyboard hints and completion screen | A Review workspace using generic sections and forms; no original dedicated review CSS |
| Home/Today | Review module with due count, estimated minutes, courses, seven-day forecast, streak and learned totals; Today reminder | Review workspace has due/total counts; original Home and Today integrations are absent |
| Course/reader workflow | Course-heading Flashcards buttons, assignment-reader Add card with course/source context | Review workspace has a course filter; original contextual shortcuts and assignment source-link workflow are absent |
| Access/counts | Toolbar Cards button with due badge, Shift+R, live course badges | Review workspace tab; original opening shortcut and contextual badges are absent |
| Focus room | Review cards task and deck button/count | No deck integration in the official Focus room |
| End of session | Completion summary and local review-reward callback | Basic reviewed count; original completion presentation/reward hook is absent |

These are specific source-confirmed parity gaps, not a claim that the entire
flashcard implementation is missing or that a Git merge failed.

## Reproduced bug: editing a card makes the current session stale

On the unmodified official controller/model:

1. Start a review and reveal a card.
2. Choose Edit, change its answer, and save successfully.
3. Return to Review, reveal, and choose Good.
4. The grade is rejected as `This card changed elsewhere. Start review again.`
   The session stays on the same card and no grade is recorded.

`saveCard` replaces the saved card, but its pending session entry retains the
old `reviewVersion` signature. `grade` then rejects this controller's own edit as
a concurrent change. The bundled diagnostic uses public controller methods and
does not require a real account or browser.

```sh
node --test audit/edit-during-review.test.cjs
```

Expected diagnostic result on pinned upstream: **one failure, two passes**.
The two passes verify that genuine independent edits remain protected.
`audit/edit-during-review-fix.patch` is a proposed narrow fix: refresh only the
pending signatures belonging to the just-saved card, and only if they matched
the editor's original card revision. Re-hide the answer after changing it.
Sessions already stale before the local edit remain stale. The patch is a
review candidate, not a change applied to Flzsh's repository.

## Contents and verification

- `extension/review-deck.js`, `.css`, `review-model.js`: exact current local components.
- `reference-tests/review-deck.test.cjs`: unchanged full local suite; requires the local host application.
- `component-tests/review-model.test.cjs`: six model-only tests extracted from that suite, with host-only imports removed.
- `integration/wiring-excerpts.md`: exact local host excerpts plus loader/resource relationships.
- `source-manifest.json`: sizes and SHA-256 hashes of unchanged local source/test/license files.
- `audit/upstream/`: unchanged official controller, model and their existing tests, pinned to the commit above.
- `audit/edit-during-review.test.cjs` and the proposed patch: new diagnostic and suggested fix.

Results from this handoff:

| Check | Result |
| --- | --- |
| Full local `tests/review-deck.test.cjs` | 8 passed |
| Standalone extracted model tests | 6 passed |
| Official model/UI baseline suites | 44 passed |
| New diagnostic on unmodified official source | 1 failed as expected, 2 passed |
| New diagnostic with proposed patch in a temporary copy | 3 passed |
| Official model/UI suites with the proposed patch | 44 passed |

Run the standalone tests from this directory:

```sh
node --test component-tests/review-model.test.cjs
node --test audit/upstream/tests/review-deck-ui.test.cjs audit/upstream/tests/review-deck-model.test.cjs
```

To try the patch, copy `audit/upstream` into a temporary directory, apply the patch
there, and set `CANVAS_REVIEW_UI_SOURCE` to that copy's absolute
`extension/review-deck.js` path when running the new diagnostic. No production
extension source was changed in this handoff. No live authenticated Canvas visual
or keyboard test was performed; design and integration comparisons are source-based.

## Porting requirements

1. Keep the current feature loader, the Custom opt-in and the existing Review
   tab. Register the dedicated styles and additional entry points without
   loading disabled functionality.
2. Restore the card/manager presentation, Home/Today widgets, course and reader
   actions, toolbar due counts and Shift+R. Contextual actions should select the
   correct course and retain a validated assignment source.
3. Port layout/API hooks deliberately: local code uses `ReserveReviewModel`,
   top-level `data.reviewDeck` and an overlay controller; upstream uses
   `ReserveReviewDeckModel`, `data.settings.reviewDecks` and workspace rendering.
   Do not overwrite storage or import a local backup as a migration strategy.
   Preserve card IDs, histories, settings, official manual test dates, and
   account/site boundaries; explicitly migrate source metadata if adding it.
4. Keep upstream's atomic imports, CSV/TSV handling, validation, failed-save
   draft retention, quiz/assessment exclusions and cross-tab guards. The local
   files are UI/integration references, not a substitute for those checks.
5. Coordinate the Focus room review task/button with issue #63. Preserve normal
   typing when adding shortcuts; check native button keys, focus return, phone
   width, all global themes, account changes, failed writes and same-session edits.

## Scope and license

GPL-3.0-only, with Flzsh's original Canvas Harness attribution preserved in
`LICENSE` and the source. Only source, synthetic test fixtures and integration
notes are included. Personal card collections, `review-bank.json`, course records,
lab logs, backups and uploaded documents are excluded.
