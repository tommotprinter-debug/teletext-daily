TELETEXT DAILY — DECODER + STRICT SUMMARY QUALITY

This build fixes the specific defect seen in the live repository on 12 Aug 2026:
Google News's generic meta description was incorrectly accepted as an article extract.

FIXES
- Google News RSS URLs are decoded to publisher URLs using google-news-url-decoder 1.2.2.
- Google News pages can NEVER count as publisher article extracts.
- The exact Google News boilerplate string is explicitly rejected.
- Article evidence must be long enough before extraction.
- If decoding/fetching fails, the story uses a cross-source RSS cluster summary.
- A quality gate aborts the update if Google boilerplate appears or fewer than 20/25 summaries are substantive.

WORKFLOW
The workflow optionally installs:
google-news-url-decoder@1.2.2

If npm/decoder fails, the updater continues using RSS-cluster summaries instead of failing solely because of the decoder.

SUCCESS LOG
Expected:
meaningful summaries 20-25/25
article extracts X/25
RSS-cluster summaries Y/25
direct publisher URLs Z/25
boilerplate 0

UPLOAD
Upload all flat files to repo root.
Copy WORKFLOW-update-news.yml to .github/workflows/update-news.yml.
Run a NEW workflow from main.
