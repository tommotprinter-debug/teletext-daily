TELETEXT DAILY — RSS + AI SUMMARIES

HOW IT WORKS
1. RSS sources discover and rank the Top 5 stories in each category.
2. Gemini 3 Flash Preview uses Google Search grounding to research those selected stories.
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


CURRENT AI DESIGN
The AI stage does not use paid Google Search grounding.
Gemini 3 Flash Preview uses Google Search grounding on the five selected story URLs per category.
If an article URL is inaccessible/paywalled, that story keeps the RSS fallback text rather than inventing details.

Expected successful news.json:
"aiPages": 5
and each successfully summarized story:
"aiSummary": true
"aiContext": "url-context"


AI / LINK DIAGNOSTICS
The generated news.json now includes:
- aiStories: number of individual stories with AI summaries
- aiStoriesTotal: normally 25
- aiPages: pages containing at least one AI summary
- aiPagesFull: pages where all 5 stories have AI summaries
- resolvedPublisherUrls: stories where AI found a direct publisher article URL

Page 990 shows these values directly.

LINK BEHAVIOR
RSS discovery may initially return a Google News redirect URL.
Grounded AI attempts to identify the direct publisher article URL.
When verified, the app replaces the Google News URL with the publisher URL.
If no publisher URL can be verified, the original discovery link is retained rather than inventing a URL.
