TELETEXT DAILY — CORRECTED FLAT PACKAGE

WHAT WAS FIXED AFTER INSPECTING THE REAL GITHUB REPOSITORY
1. The actual .github/workflows/update-news.yml was already using checkout@v5, setup-node@v5 and Node 24.
2. The root WORKFLOW-update-news.yml template was still @v4. It is now synchronized to @v5/Node 24.
3. update-news.mjs was too brittle: one GDELT failure or too few results caused exit code 1.
4. GDELT queries are now simpler OR blocks matching documented query syntax.
5. Each category now retries transient failures up to 3 times.
6. Each category broadens from 36h to 72h and has a second fallback query.
7. If one category is still unavailable, the previous valid 5-story page is retained rather than failing the entire workflow.
8. GitHub logs now clearly show category, query, HTTP/non-JSON errors, candidate counts, and fallback behavior.
9. The workflow has a 10-minute timeout and an environment diagnostic step.

FLAT UPLOAD
Upload all root files in this package to your repository and replace files when GitHub asks.
The ZIP intentionally contains no folders.

THEN UPDATE THE REAL WORKFLOW
GitHub requires the executed workflow at:
.github/workflows/update-news.yml

After uploading, open root file WORKFLOW-update-news.yml, copy all its contents, then open:
.github/workflows/update-news.yml
Edit it and replace everything with the copied contents. Commit to main.

RUN
Actions > Update Teletext Daily > Run workflow.

SUCCESS
The run should end with a log similar to:
SUCCESS: generated YYYY-MM-DD. Fresh pages: 5/5. Total stories: 25.

If GDELT temporarily fails for one category, a successful run can instead say Fresh pages: 4/5 and preserve the previous valid category page.

PAGES / PHONE
Keep GitHub Pages set to main /(root).
Open the Pages URL in Chrome on Android and use INSTALL APP or Chrome > Install app.
