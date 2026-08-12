TELETEXT DAILY — RSS + AI SUMMARIES

HOW IT WORKS
1. RSS sources discover and rank the Top 5 stories in each category.
2. Gemini 2.5 Flash-Lite uses Google Search grounding to research those selected stories.
3. Gemini writes a meaningful 2-sentence summary, a 3-5 sentence article brief, and a story-specific WHY IT MATTERS line.
4. GitHub publishes news.json. The API key never goes to the phone/PWA.

COST
Gemini has a free API tier with rate limits. This app makes only 5 Gemini requests per daily edition, one per category.
If Gemini is unavailable or the free quota is reached, the workflow keeps RSS fallback text instead of failing.

REQUIRED SECRET
Create a free Gemini API key in Google AI Studio.
In GitHub: Settings > Secrets and variables > Actions > New repository secret
Name: GEMINI_API_KEY
Value: your Gemini API key

UPLOAD
Upload all files from this ZIP to the repository root, replacing current files.
Then copy WORKFLOW-update-news.yml into .github/workflows/update-news.yml and commit.

RUN
Actions > Update Teletext Daily > Run workflow

SUCCESS
news.json should show:
"edition": "live-rss-ai-free"
"aiPages": 5

ANDROID
No reinstall should normally be needed. Open the installed PWA after the workflow finishes and tap CHECK NEW EDITION.
