# Geeky Character Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Geeky visibly guides a quote from an empty proposal using text and optional voice.
**Architecture:** Local proposal navigation + existing semantic adapter; original SVG character rendered independently of WebGL; transport activity events drive UI states.
**Tech Stack:** Browser JS, original GeekyBrain/SvgRenderer, esbuild, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-10-28-geeky-character-guide-design.md

## Global Constraints
Preserve authoritative motor, manual flow, saved drafts, undo, exact pinned source provenance, optional microphone, reduced motion and no-WebGL. Do not change secrets or hosting infrastructure.

## Review Focus
- Empty and stale saved drafts open safely without repricing or deleting selections.
- Navigation does not consume or replace undo; new edits still honor revisions.
- Audio playback may outlast response.done; speaking state follows output buffer events.
- Closed/hidden/reduced-motion views do not keep character frame loops active.
- Mobile keyboard, errors, interrupted connection and Escape retain usable controls.

### Task1: Proposal navigation and empty draft
Files: asesor/asesor.js, asesor/agent-adapter.js, asesor/test/agent-adapter.test.js.
Interface: GGCotizadorAgent.openProposal() -> {ok,context}; semantic navigate step5 also allowed empty; step4 remains guarded.
- [x] Add failing tests for empty proposal, preserving selections/prices and undo through navigation.
- [x] Implement local host navigation and meaningful empty proposal state with manual next steps.
- [x] Run Node tests and review diff.

### Task2: Transport activity
Files in geeky-agent: src/client.mjs, test/client.test.mjs, README.md.
Interface event: {type:'activity',state:'idle'|'listening'|'thinking'|'speaking'|'acting'}; emit only changes.
- [x] Add tests for text, voice playback after response.done, tools, voiceoff, interruption/disconnect.
- [x] Implement actual activity state events without altering message/tool behavior.
- [x] Run suite; commit for immutable vendor pin.

### Task3: Character and conversation surface
Files: asesor/lab/agent-character.js, original lab/geeky/live/svg-renderer.mjs + provenance, package.json, vendor/agent-character.mjs, agent-ui.mjs, agent.css, index.html, Pages workflow.
Interfaces: mountGeekyCharacter(host) -> {setState(state),react(action),setVisible(boolean),dispose(),getDiagnostics()}; state mapping uses transport activity plus UI connecting/error; one SVG instance moves between launcher and panel.
- [x] Integrate original SVG renderer unchanged; bounded30fps loop, visibility/reduced-motion/pause gating.
- [x] Rebuild companion around character, state text, draft CTA, proposal shortcut, voice and composer.
- [x] Start quote navigates locally then sends grounded prompt; keep character static fallback on load error.
- [x] Bundle character, sync pinned transport, bump cache, update Pages copy and build checks.

### Task4: Verification and release
Files: asesor/test/agent-browser.cjs and docs/geeky-agent.md.
- [x] Extend browser checks for initial proposal jump, existing draft/undo preservation, states, reduced motion, no-WebGL, desktop/mobile and closed character loops.
- [x] Run suites, build consistency, pinned hashes, browser capture; inspect screenshots together.
- [x] Independent code/visual review and fix material findings.
- [ ] Push PRs, verify CI, publish continuation of the requested deployed experience, live text/tools and synthetic voice smoke.

Pre-release evidence: Cotizador 159/159 tests; geeky-agent 45/45 tests; build and immutable pin verification passed. Browser captures: artifacts/geeky-agent/ui-1793242834061 (desktop, mobile, no-WebGL, 390x360 microphone error). Independent foundation review and final UI review approved after pause synchronization, 44px disclosure, and short-height scrolling fixes. Real local WebRTC smoke passed text, proposal tools/undo and synthetic voice in geeky-agent/artifacts/character-live-1793242596466. Physical microphones/devices were not tested.
