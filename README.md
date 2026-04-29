🚀 Daily Git Workflow (Team Guide)

This guide ensures a consistent and conflict-free workflow for all team members.

🧼 Step 0 — Start the Day Clean

Always sync your local main branch before starting any work:

git checkout main
git pull origin main
🌿 Step 1 — Create a Feature Branch

Create a new branch for each task using the naming convention:

feature/<task>
fix/<task>

Example:

git checkout -b feature/drivers-api
💡 Step 2 — Work & Commit in Small Chunks

Commit frequently with clear, descriptive messages. Avoid batching large changes at the end of the day.

git add backend/src/routes/drivers.js
git commit -m "Add drivers GET and POST endpoints"
☁️ Step 3 — Push Your Branch

Push your branch to GitHub:

git push -u origin feature/drivers-api
🔀 Step 4 — Open a Pull Request (PR)

On GitHub:

Create a PR from feature/drivers-api → main
Add a short description:
What changed
How to test it
🔄 Step 5 — Sync with main Before Merging

Avoid merge conflicts by updating your branch before merging:

git checkout feature/drivers-api
git pull origin main
# Resolve conflicts if any
git push

Then proceed to merge your PR.

🧹 Step 6 — Clean Up After Merge

After your PR is merged:

Delete the branch on GitHub
Delete it locally:
git checkout main
git pull origin main
git branch -d feature/drivers-api
🚫 Ignore Unnecessary Files

Make sure to ignore node_modules in the frontend:

Add this to your .gitignore:

frontend/node_modules/
✅ Best Practices
Pull main daily before starting work
Use meaningful branch names
Commit often with clear messages
Keep PRs small and focused
Always sync before merging