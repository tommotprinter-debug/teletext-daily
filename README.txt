TELETEXT DAILY — LOCAL SUMMARY VERSION

This version deliberately has NO external AI dependency and NO API quota.

DAILY PIPELINE
1. RSS selects the Top 5 stories in each category.
2. GitHub Actions tries to resolve/fetch each publisher page.
3. If article text or metadata is accessible, a local extractive summarizer selects the most informative sentences.
4. If the page cannot be fetched, the updater searches current RSS coverage of the same event and creates a cross-source coverage summary.
5. news.json is committed and GitHub Pages serves it to the PWA.

SUMMARY METHODS
article-extract = based on publisher page text/metadata
rss-cluster = based on multiple current RSS reports about the event
rss-basic = last-resort fallback

NO SECRETS REQUIRED
GEMINI_API_KEY is no longer used.

UPLOAD
Upload every file from this flat ZIP to your repository root.

WORKFLOW
Copy WORKFLOW-update-news.yml into:
.github/workflows/update-news.yml

RUN
Actions > Update Teletext Daily > Run workflow

PAGE 990
Shows:
- article extract coverage
- RSS cluster coverage
- direct publisher-link resolution

ANDROID
No reinstall should normally be required. Open the PWA and tap CHECK NEW EDITION.
