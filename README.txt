TELETEXT DAILY — LINK-VALIDATED FINAL

This version fixes the remaining live defect: decoded publisher links could be
associated with the wrong RSS headline.

WHAT CHANGED
1. Each Google News URL is decoded individually.
2. The publisher page title is extracted.
3. The page title is compared with the RSS headline.
4. A publisher page is accepted only when the title match is strong enough.
5. Mismatched pages fall back to the RSS-cluster summary.
6. Google News boilerplate remains explicitly rejected.
7. The workflow refuses to publish any accepted headline/page mismatch.
8. At least 20/25 stories must have substantive summaries.

SUCCESS TARGET
meaningful summaries >= 20/25
mismatched extracts = 0
boilerplate = 0

INSTALL
Upload all flat files to repository root.
Copy WORKFLOW-update-news.yml into .github/workflows/update-news.yml.
Run a NEW workflow from main.
