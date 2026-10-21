# Cotizador GuateGeeks Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing cotizador, preserving its complete Git history, to `GuateGeeks/cotizador` and publish it through GitHub Pages at `https://guategeeks.com/cotizador/`.

**Architecture:** The existing static site and deployment workflow are retained unchanged. The clone changes its publishing remote from `jarredondor1/cotizadorgg` to `GuateGeeks/cotizador`; pushing `main` transfers the complete history and triggers the existing GitHub Actions Pages workflow.

**Tech Stack:** Git, GitHub repository remotes, GitHub Actions, GitHub Pages, HTML, CSS, JavaScript.

---

### Task 1: Validate the migration source and deployment artifact

**Files:**
- Verify: `index.html`
- Verify: `costa-sur.css`
- Verify: `costa-sur.js`
- Verify: `assets/`
- Verify: `.github/workflows/pages.yml`

- [ ] **Step 1: Confirm the source history and clean working tree**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git log --oneline -5
git status --short
```

Expected: the previous `jarredondor1/cotizadorgg` commits are visible and only the approved migration documentation is ahead of the source remote.

- [ ] **Step 2: Confirm that the Pages workflow packages every runtime file**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
sed -n '1,220p' .github/workflows/pages.yml
```

Expected: the `Prepare the Costa Sur site` step copies `index.html`, `costa-sur.css`, `costa-sur.js`, `README.md`, and `assets/` into `_site`.

- [ ] **Step 3: Verify static references work from the `/cotizador/` project path**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
rg -n '<link rel="stylesheet"|<script src=|<img src=' index.html
```

Expected: references are relative: `costa-sur.css`, `costa-sur.js`, and `assets/...`; no absolute `/cotizadorgg/` path exists.

### Task 2: Publish the preserved history to the organization repository

**Files:**
- Modify: Git remote configuration only

- [ ] **Step 1: Replace the source remote with the GuateGeeks repository**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git remote rename origin source
git remote add origin git@github.com:GuateGeeks/cotizador.git
git remote -v
```

Expected: `origin` fetches and pushes `git@github.com:GuateGeeks/cotizador.git`; `source` remains the migration reference.

- [ ] **Step 2: Push the complete `main` history**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git push -u origin main
```

Expected: GitHub accepts the branch and sets `origin/main` as the upstream. The empty destination means no force push is necessary.

- [ ] **Step 3: Confirm the remote commit and repository contents**

Run:

```bash
git ls-remote git@github.com:GuateGeeks/cotizador.git refs/heads/main
curl -fsSL https://api.github.com/repos/GuateGeeks/cotizador/contents/ | jq -r '.[] | [.type, .name] | @tsv'
```

Expected: the SHA matches local `main`, and the root includes `index.html`, `costa-sur.css`, `costa-sur.js`, `assets`, and `.github`.

### Task 3: Enable and validate GitHub Pages

**Files:**
- Verify: `.github/workflows/pages.yml`

- [ ] **Step 1: Set Pages to deploy with GitHub Actions**

Open `https://github.com/GuateGeeks/cotizador/settings/pages`, select **GitHub Actions** under **Build and deployment**, and save.

Expected: the repository creates a Pages site and permits the existing `pages.yml` workflow to deploy it.

- [ ] **Step 2: Confirm the deployment workflow finishes successfully**

Open `https://github.com/GuateGeeks/cotizador/actions`, select the run created by the `main` push, and wait until the `deploy` job is green.

Expected: every workflow step succeeds; the deployment URL appears in the job environment summary.

- [ ] **Step 3: Verify the public route and static assets**

Run after the GitHub Pages deployment is green:

```bash
curl -sS -L --max-time 30 -o /dev/null -w 'page=%{http_code} final=%{url_effective}\n' https://guategeeks.com/cotizador/
curl -sS -L --max-time 30 -o /dev/null -w 'css=%{http_code}\n' https://guategeeks.com/cotizador/costa-sur.css
curl -sS -L --max-time 30 -o /dev/null -w 'js=%{http_code}\n' https://guategeeks.com/cotizador/costa-sur.js
```

Expected: all requests return `200`; the first final URL remains `https://guategeeks.com/cotizador/`.

- [ ] **Step 4: Record the deployment outcome**

Run:

```bash
cd /Users/joaquinarredondo/Desktop/cotizador
git status --short
git remote -v
```

Expected: the working tree is clean and `origin` remains the GuateGeeks repository.
