TELETEXT DAILY — FREE RSS VERSION

This package is flat for easy GitHub web upload.

The daily GitHub Action uses free RSS sources:
- Google News RSS searches as primary discovery
- BBC RSS and Euronews RSS as fallbacks
No API account, API key, paid subscription, or credit card is required.

UPLOAD all files in this ZIP to the repository root.

Then update the real GitHub workflow:
1. Open WORKFLOW-update-news.yml in the root and copy all text.
2. Open .github/workflows/update-news.yml.
3. Edit it, replace all content, paste the copied workflow, and commit.

GitHub Pages:
Settings > Pages > Deploy from a branch > main > /(root)

First run:
Actions > Update Teletext Daily > Run workflow

Success:
news.json should show edition live-rss-free or live-rss-with-fallback.

Android:
Open the Pages URL in Chrome, then INSTALL APP or Chrome menu > Install app.
