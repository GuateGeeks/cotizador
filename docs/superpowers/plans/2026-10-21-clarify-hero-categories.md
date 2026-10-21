# Clarify Hero Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hero proposal label and present the four program areas as non-interactive descriptive text.

**Architecture:** Limit the change to the hero markup and its two CSS rules. Preserve all catalog controls, JavaScript data, prices, target-school references, and other content exactly as published.

**Tech Stack:** HTML, CSS, GitHub Pages.

---

### Task 1: Clarify the hero without changing functionality

**Files:**
- Modify: `index.html:12-24`
- Modify: `costa-sur.css:39-40,61-62,213,244-245`
- Test: browser and HTTP checks against the static site

- [ ] **Step 1: Capture the current markup contract**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
rg -n 'proposal-label|intro-tags|id="level-filter"|id="program-filter"|id="model-filter"' index.html
```

Expected: the proposal label and category chips are identified, and the three interactive catalog controls remain separate from the requested change.

- [ ] **Step 2: Make the minimal markup change**

In `index.html`, remove only the `<div class="proposal-label">…</div>` inside `.topbar`. Replace the nested spans in `.intro-tags` with this plain text:

```html
<p class="intro-tags">Áreas disponibles: Robótica · Electrónica · Drones · Experiencias inmersivas</p>
```

- [ ] **Step 3: Remove button-like styling**

In `costa-sur.css`, remove the `.proposal-label` rules and change `.intro-tags` to text styling without border, background, border radius, hover behavior, pointer cursor, or nested-span rules:

```css
.intro-tags { margin: 0; color: #f0eaf5; font-size: 14px; font-weight: 650; line-height: 1.5; }
```

Remove the now-obsolete responsive `.proposal-label` and `.intro-tags span` rules; retain only responsive text sizing if needed.

- [ ] **Step 4: Validate scope and static behavior**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
rg -n 'Propuesta para Colegio Costa Sur|proposal-label|intro-tags span' index.html costa-sur.css || true
rg -n 'id="level-filter"|id="program-filter"|id="model-filter"' index.html
node --check costa-sur.js
```

Expected: the removed label and chip selectors have no matches; all three catalog control IDs remain; JavaScript syntax passes.

- [ ] **Step 5: Commit and publish**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git add index.html costa-sur.css
git commit -m "style: clarify hero program areas"
git push origin main
```

Expected: the existing GitHub Pages workflow deploys the minimal change from `main`.

- [ ] **Step 6: Verify the public page**

Run:

```bash
curl -sS -L --max-time 30 https://guategeeks.com/cotizador/ | rg 'Áreas disponibles: Robótica · Electrónica · Drones · Experiencias inmersivas'
curl -sS -L --max-time 30 -o /dev/null -w 'css=%{http_code}\n' https://guategeeks.com/cotizador/costa-sur.css
curl -sS -L --max-time 30 -o /dev/null -w 'js=%{http_code}\n' https://guategeeks.com/cotizador/costa-sur.js
```

Expected: the non-interactive description is published and both static resources return `200`.
