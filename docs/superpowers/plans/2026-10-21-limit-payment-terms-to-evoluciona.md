# Limit Payment Terms to EVOLUCIONA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the payment-terms block only for EVOLUCIONA 8 and EVOLUCIONA 16.

**Architecture:** Reuse the existing `isEvol` boolean in `render()` as the sole eligibility condition. Hide the existing `.payment-block` element for FLEX and INTEGRA, preserving all quote calculations and controls.

**Tech Stack:** Vanilla JavaScript, HTML, GitHub Pages.

---

### Task 1: Gate the existing payment-terms block by modality

**Files:**
- Modify: `costa-sur.js:115-158`
- Test: browser interaction against the static page

- [ ] **Step 1: Reproduce the incorrect FLEX presentation**

Open the cotizador, select `FLEX · renta`, and inspect the element with class `payment-block`.

Expected before the fix: the block is visible and contains `Pago inicial · 20 %` plus `Renta mensual · 2 meses`.

- [ ] **Step 2: Implement the smallest visibility change**

In `render()`, immediately after `const isEvol = mode === 'EVO8' || mode === 'EVO16';`, set the existing block visibility:

```js
document.querySelector('.payment-block').hidden = !isEvol;
```

Do not alter `calculateQuote`, payment labels, payment amounts, rental-field behavior, or any program data.

- [ ] **Step 3: Verify all four modes**

In a browser, select each model and check the `.payment-block` state:

| Model | Expected payment block |
| --- | --- |
| INTEGRA · compra | Hidden |
| FLEX · renta | Hidden |
| EVOLUCIONA 8 | Visible |
| EVOLUCIONA 16 | Visible |

For EVO8 and EVO16, confirm the label remains `Pago inicial · 20 %` and the second label states the appropriate monthly installment count.

- [ ] **Step 4: Verify unchanged calculations and controls**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
node --check costa-sur.js
git diff --check
```

Expected: JavaScript syntax and whitespace checks succeed. In the browser, change program, equipment count, and FLEX rental period; the quote continues updating.

- [ ] **Step 5: Commit, publish, and validate**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git add costa-sur.js
git commit -m "fix: limit payment terms to evoluciona"
git push origin main
```

After the Pages workflow completes, verify the public page loads and that the mode-specific payment-block behavior matches Step 3.
