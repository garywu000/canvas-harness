# Focus room: Gary's current source and the official 3.6 comparison

This is a focused maintainer handoff for Flzsh/canvas-harness, related to PR #43
and issue #55. Gary requested restoration of the room experience from his local
build. The official PR was closed as included, but the shipped room is a smaller
adaptation. Missing features below are source-confirmed gaps relative to that
contribution, not evidence that a Git merge command failed.

Compared upstream: **v3.6.0** and current main commit
`51eb229b0c43010a1475ab1eff2341c56c1df72d`.
Local snapshot: **Gary Edition 3.5.1**, the current files on this device.
This folder is reference source, not an installable extension or a ready-to-merge
replacement for current main. No host application file is overwritten here.

## What is missing in the official room

| Area | Current official room | Gary's source in this folder |
| --- | --- | --- |
| Layout | A heading, large timer text and basic timer controls | Dedicated room layout, animated ring, goal/task card, room panels and responsive styles |
| Room scenes | Uses the existing dashboard background; no in-room scene selector | Rain, night, ocean, lamp, painted stars, lilies, ink, course art, own photo/video and plain paper; dim/blur controls |
| Sound | No sound panel, mixer or audio/media frame | White, pink and brown noise, rain, own sound and volume controls |
| Distraction guard | No room guard UI or supporting guard modules | Optional site list, permission flow, active-session guard and a separate Strict focus mode with an explicit early-end control |
| Sessions | Existing dashboard timer and cycle controls | Timer/Pomodoro/open sessions, short/long breaks, optional automatic continuation, session history/statistics |

Official `extension/focus-room.js` is 43 source lines. Its feature catalogue entry
loads only that script and no dedicated stylesheet. The source tree has none of
the focus scene/guard/dial modules shipped in Gary's version. Global dashboard
themes still exist upstream; the missing feature is a choice **inside the room**.

## Source layout

- `extension/focus-room.js` and `.css`: complete local room interface.
- `extension/focus-room-model.js`: session rules, saved room choices and history.
- `extension/focus-scene-renderer.js`: painted scenes and reduced-motion behavior.
- `extension/focus-dial.js`: a shared ring using one native animation.
- `extension/focus-scene.html` and `.js`: local media and generated noise layers.
- `extension/focus-guard-*`, `focus-guard.html`, `focus-cover.*`: optional guard and Strict focus components.
- `integration/wiring-excerpts.md`: exact local host-code excerpts and manifest relationships; port these deliberately into current main.
- `reference-tests/`: the four unchanged focus test files from the local application.
- `source-manifest.json`: SHA-256 and size of each unchanged copied source/test/license file.
- `audit/`: unmodified official room, one reproducible keyboard-focus defect and a proposed small fix.

## Integration work needed

1. Keep the current feature loader and opt-in `focus-room` switch. Register all
   required modules, their load order, room CSS and frame resources. The local
   build uses static loading; copying its whole manifest would regress upstream.
2. Port the `widgets.js` room API: the local room needs `save`, `getContext`,
   `helpers`, `startTick` and `onFinished` as well as `container` and `store`.
   Its event handlers include input/change and session-completion hooks, not only click/keydown.
3. Reconcile the local `ReserveFocusRoomModel` session fields with current core
   timers and Biscuit commands; retain one shared session, account scoping, saved
   data and backup validation. Port room/history cleaning and the guard record
   update from storage. Do not replace current `storage.js` wholesale.
4. Port background guard registration/message handling with sender checks,
   school-site exclusions and access requested from the student's explicit click.
   Current upstream scripting permissions differ from the local manifest.
   Strict focus is included for reference and can be a separate opt-in change.
5. Restore toolbar/timer/assignment entry points and Shift+F without stealing
   keystrokes from inputs, textareas, selectors or editable content. Preserve
   existing quiz-taking exclusions and current dashboard features.
6. Test each supported global theme, reduced motion, phone width, pause/resume,
   native fullscreen rejection/exit, tab hiding, account changes and permission
   revocation. Background audio should stop when the room closes.

## Verification

The unchanged local focus suites were run in the full local application:

```sh
node --test tests/focus-room.test.cjs tests/focus-guard.test.cjs tests/focus-scenes.test.cjs tests/focus-dial.test.cjs
```

Result: **47 passed, zero failed/skipped**. These tests depend on the local host
application and its wiring, which is intentionally not duplicated in this folder.
`reference-tests` are reference material, not a standalone full-app test command.
Two suites can run directly from this handoff using the copied components:

```sh
node --test component-tests/focus-scenes.test.cjs component-tests/focus-dial.test.cjs
```

One additional defect is reproduced against the unmodified official room:

```sh
node --test audit/shadow-focus.test.cjs
```

This intentionally fails: `open()` captures `document.activeElement`, which is
the shadow host in the actual dashboard structure. `close()` focuses that host
instead of the Focus room trigger inside the shadow root. The official existing
fixture has no shadow root. The proposed fix in `audit/shadow-focus-fix.patch`
uses the container's own root to capture the actual active control. The same
diagnostic passed with that fix applied to a temporary copy.

The room layout and absent controls were checked in source; Gary also reported
the missing controls in his installed official version. No new authenticated
Canvas browser session or cross-site blocking test was performed for this handoff.

## Licensing and scope

Canvas Harness remains Flzsh's GPL-3.0-only project; `LICENSE` is preserved.
The painted-scene attribution and MIT text are in
`extension/licenses/huashu-art-motion.txt`.
Only focus components, test fixtures and integration references are included.
Course records, daily lab logs, AI summaries, student backups and uploaded media
are not part of this source handoff.
