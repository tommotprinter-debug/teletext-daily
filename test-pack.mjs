import fs from "node:fs";
const github=process.argv.includes("--github");
const must=["index.html","manifest.webmanifest","sw.js","icon-192.png","icon-512.png","news.json","update-news.mjs"];
if(!github)must.push("WORKFLOW-update-news.yml","README.txt");
for(const f of must)if(!fs.existsSync(f))throw new Error("Missing "+f);
const n=JSON.parse(fs.readFileSync("news.json","utf8"));
for(const p of ["200","300","400","500","600"]){
 if(!Array.isArray(n.categories?.[p])||n.categories[p].length!==5)throw new Error(`Page ${p} requires 5 stories`);
 const urls=new Set();
 for(const s of n.categories[p]){
  for(const k of ["title","summary","body","whyItMatters","source","url","publishedAt"])if(!(k in s))throw new Error(`Missing ${k} in ${p}`);
  if(s.url&&urls.has(s.url))throw new Error(`Duplicate URL on ${p}`); if(s.url)urls.add(s.url);
 }
}
const m=JSON.parse(fs.readFileSync("manifest.webmanifest","utf8"));
if(m.display!=="standalone"||m.start_url!=="./"||m.scope!=="./")throw new Error("Manifest install configuration invalid");
const h=fs.readFileSync("index.html","utf8");
for(const s of ["news.json","INSTALL APP","101","200","300","400","500","600","990","serviceWorker"])if(!h.includes(s))throw new Error("HTML missing "+s);
const sw=fs.readFileSync("sw.js","utf8");
for(const s of ["news.json","skipWaiting","clients.claim","icon-192.png","icon-512.png"])if(!sw.includes(s))throw new Error("SW missing "+s);
console.log("Teletext pack validation passed.");
