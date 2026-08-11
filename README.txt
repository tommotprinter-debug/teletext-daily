TELETEXT DAILY — FLAT UPLOAD + FREE SCHEDULED WORKFLOW

UPLOAD THESE FILES DIRECTLY TO THE GITHUB REPOSITORY ROOT:
index.html
manifest.webmanifest
sw.js
icon-192.png
icon-512.png
news.json
update-news.mjs
test-pack.mjs
WORKFLOW-update-news.yml
README.txt

IMPORTANT
GitHub itself requires Actions workflow files to be stored at:
.github/workflows/update-news.yml

You do NOT need to upload a folder.
After uploading the flat package:
1. GitHub > Add file > Create new file.
2. In the filename box type exactly:
   .github/workflows/update-news.yml
3. Open WORKFLOW-update-news.yml from this flat package and copy all its text.
4. Paste into the new GitHub file and Commit changes.
GitHub creates the required folders automatically.

COST
No API account or API key is required.
The workflow uses the public GDELT DOC API and local ranking logic.
Use a public GitHub repository to keep GitHub Pages and Actions within the free public-repository model.

PAGES
Settings > Pages > Source: Deploy from a branch
Branch: main
Folder: /(root)
Save.

FIRST NEWS RUN
Actions > Update Teletext Daily > Run workflow.
After it succeeds, news.json should show edition "live-free".

ANDROID INSTALL
Open your GitHub Pages URL in Chrome.
Tap INSTALL APP if offered, otherwise Chrome menu > Install app / Add to Home screen.
