# 🔀 Daily Git Workflow (Team)

A step-by-step guide for consistent, conflict-free collaboration using Git and GitHub.

---

## Step 0 — Start the Day Clean

Always pull the latest `main` before starting any work:

```bash
git checkout main
git pull origin main
```

---

## Step 1 — Create a Feature Branch for Your Task

Use a consistent branch naming format:

| Type | Format |
|------|--------|
| New feature | `feature/<task>` |
| Bug fix | `fix/<task>` |

**Example:**

```bash
git checkout -b feature/drivers-api
```

---

## Step 2 — Work and Commit in Small Chunks

Commit often — don't wait until the end of the day:

```bash
git add backend/src/routes/drivers.js
git commit -m "Add drivers GET and POST endpoints"
```

> 💡 Small, frequent commits make code reviews easier and conflicts less painful.

---

## Step 3 — Push Your Branch to GitHub

```bash
git push -u origin feature/drivers-api
```

---

## Step 4 — Open a Pull Request (PR)

On GitHub:

1. Create a PR from `feature/drivers-api` → `main`
2. Add a short description covering:
   - **What changed**
   - **How to test it**

---

## Step 5 — Sync with `main` Before Merging

If your branch is behind `main`, sync it first to avoid conflicts:

```bash
git checkout feature/drivers-api
git pull origin main
# resolve any conflicts if they appear
git push
```

Then merge the PR on GitHub. ✅

---

## Step 6 — After Merge, Delete the Branch

Clean up to keep the repo tidy:

```bash
git checkout main
git pull origin main
git branch -d feature/drivers-api
```

> Also delete the branch on GitHub via the PR page or the **Branches** tab.

---

## .gitignore — Frontend `node_modules`

Make sure your `.gitignore` includes:

```
frontend/node_modules/
```

> Never commit `node_modules` — it's large, machine-specific, and fully reproducible via `npm install`.

---

## Quick Reference

```
morning          → git pull origin main
new task         → git checkout -b feature/<task>
save progress    → git add . && git commit -m "..."
share work       → git push -u origin feature/<task>
before merging   → git pull origin main (on your branch)
after merging    → git checkout main && git pull && git branch -d feature/<task>
```
