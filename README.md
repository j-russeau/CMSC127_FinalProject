## Daily Git Workflow (Team)

### Step 0 — Start the day clean
Always pull the latest `main` before starting work:
```bash
git checkout main
git pull origin main
Step 1 — Create a feature branch for your task

Branch naming format:

feature/<task>
fix/<task>

Example:

git checkout -b feature/drivers-api
Step 2 — Work and commit in small chunks

Commit often (don’t wait until the end of the day):

git add backend/src/routes/drivers.js
git commit -m "Add drivers GET and POST endpoints"
Step 3 — Push your branch to GitHub
git push -u origin feature/drivers-api
Step 4 — Open a Pull Request (PR)

On GitHub:

Create a PR from feature/drivers-api → main
Add a short description: what changed + how to test
Step 5 — Sync with main before merging (avoid conflicts)

If your branch is behind main:

git checkout feature/drivers-api
git pull origin main
# resolve conflicts if any
git push

Then merge the PR.

Step 6 — After merge, delete the branch

Delete the branch on GitHub, and also delete it locally:

git checkout main
git pull origin main
git branch -d feature/drivers-api

add node_modules of frontend to .gitignore using:
frontend/node_modules/