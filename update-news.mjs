import fs from "node:fs/promises";

const NOW=new Date();
const GEMINI_API_KEY=process.env.GEMINI_API_KEY||"";
const GEMINI_MODEL=process.env.GEMINI_MODEL||"gemini-2.5-flash";
const PAGES=["200","300","400","500","600"];
const CATS={
"200":{name:"Politics",googleQuery:'(Poland OR Polish OR Warsaw) (government OR parliament OR election OR president OR minister OR NATO OR EU) when:2d',locale:{hl:"en",gl:"PL",ceid:"PL:en"},fallbacks:["https://feeds.bbci.co.uk/news/world/europe/rss.xml","https://www.euronews.com/rss?format=mrss&level=vertical&name=my-europe"],boost:["poland","polish","warsaw","government","parliament","election","president","minister","nato","european union","eu"]},
"300":{name:"Business",googleQuery:'(Poland OR Polish OR Europe) (business OR economy OR company OR market OR investment OR inflation OR rates OR industry) when:2d',locale:{hl:"en",gl:"PL",ceid:"PL:en"},fallbacks:["https://feeds.bbci.co.uk/news/business/rss.xml","https://www.euronews.com/rss?format=mrss&level=theme&name=business"],boost:["poland","polish","business","economy","company","market","investment","inflation","rates","industry","bank"]},
"400":{name:"Energy",googleQuery:'(Poland OR Polish OR Baltic OR Europe) (energy OR electricity OR offshore wind OR nuclear OR grid OR hydrogen OR storage) when:3d',locale:{hl:"en",gl:"PL",ceid:"PL:en"},fallbacks:["https://www.euronews.com/rss?format=mrss&level=vertical&name=green","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],boost:["poland","polish","baltic","offshore","wind","grid","nuclear","energy","electricity","hydrogen","storage","pse","orlen"]},
"500":{name:"AI",googleQuery:'(OpenAI OR Anthropic OR Gemini OR Copilot OR "artificial intelligence" OR AI) (model OR agent OR software OR enterprise OR technology) when:2d',locale:{hl:"en-US",gl:"US",ceid:"US:en"},fallbacks:["https://feeds.bbci.co.uk/news/technology/rss.xml","https://www.euronews.com/rss?format=mrss&level=vertical&name=next"],boost:["openai","anthropic","google","gemini","microsoft","copilot","model","agent","enterprise","artificial intelligence","ai"]},
"600":{name:"Sports",googleQuery:'(Poland OR Polish) (football OR tennis OR volleyball OR athletics OR motorsport OR basketball OR sport) when:2d',locale:{hl:"en",gl:"PL",ceid:"PL:en"},fallbacks:["https://feeds.bbci.co.uk/sport/rss.xml","https://www.euronews.com/rss?format=mrss&level=theme&name=sport"],boost:["poland","polish","football","tennis","volleyball","athletics","motorsport","basketball","championship"]}
};

function decodeEntities(s=""){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))}
function stripHtml(s=""){return decodeEntities(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()}
function tag(block,name){const m=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i"));return m?stripHtml(m[1]):""}
function linkTag(block){const direct=tag(block,"link");if(direct)return direct;const m=block.match(/<link[^>]+href=["']([^"']+)["']/i);return m?decodeEntities(m[1]):""}
function sourceTag(block){const m=block.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i);return m?stripHtml(m[1]):""}
function domain(u=""){try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}}
function parseFeed(xml,fallbackSource=""){const blocks=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]);return blocks.map(b=>{const title=tag(b,"title"),url=linkTag(b),description=tag(b,"description")||tag(b,"summary")||tag(b,"content"),source=sourceTag(b)||fallbackSource||domain(url),publishedAt=tag(b,"pubDate")||tag(b,"published")||tag(b,"updated");return{title,url,description,source,publishedAt}}).filter(x=>x.title&&x.url)}
function normalize(t=""){return t.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function wset(t){return new Set(normalize(t).split(" ").filter(x=>x.length>3))}
function similarity(a,b){const A=wset(a),B=wset(b);if(!A.size||!B.size)return 0;let n=0;for(const w of A)if(B.has(w))n++;return n/(A.size+B.size-n)}
function ageH(v){const d=new Date(v);return isNaN(d)?96:Math.max(0,(NOW-d)/36e5)}
function cleanGoogleTitle(title,source){let t=title.trim();if(source){const e=source.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");t=t.replace(new RegExp(`\\s[-–—]\\s${e}$`,"i"),"")}return t.replace(/\s+/g," ").trim()}
function score(a,c){const text=` ${a.title} ${a.source} `.toLowerCase();let s=Math.max(0,96-ageH(a.publishedAt));for(const k of c.boost)if(text.includes(k))s+=["poland","polish"].includes(k)?22:5;return s}
function why(page,title){const t=title.toLowerCase();if(page==="400"){if(t.includes("offshore")||t.includes("wind"))return"Relevant to offshore wind capacity, infrastructure, supply chain, or market development.";if(t.includes("grid"))return"Grid capacity can determine how quickly new generation connects and reaches customers.";if(t.includes("nuclear"))return"Nuclear decisions can affect long-term generation mix, investment, and energy security.";return"Energy developments can affect investment, security of supply, infrastructure, and power prices."}if(page==="500")return"Material AI developments can affect software capability, productivity, competition, and technology spending.";if(page==="300")return"Business developments can affect investment, demand, financing conditions, and corporate decisions.";if(page==="200")return"Political decisions can change regulation, public spending, security policy, and the business environment.";return"Major sports results and events shape rankings, qualification, schedules, and public attention."}
function summary(a,c){let d=(a.description||"").trim();if(d&&normalize(d)!==normalize(a.title)&&d.length>35){d=d.replace(/\s+/g," ");if(d.length>220)d=d.slice(0,217).replace(/\s+\S*$/,"")+"...";return d}const h=Math.round(ageH(a.publishedAt)),when=h<1?"recently":h===1?"about one hour ago":`about ${Math.min(h,96)} hours ago`;return`${c.name} report from ${a.source||domain(a.url)}, published ${when}.`}
async function fetchText(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{signal:controller.signal,headers:{"User-Agent":"TeletextDailyRSS/2.0","Accept":"application/rss+xml, application/xml, text/xml, */*"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}finally{clearTimeout(timer)}}
function googleUrl(c){const p=new URLSearchParams({q:c.googleQuery,hl:c.locale.hl,gl:c.locale.gl,ceid:c.locale.ceid});return"https://news.google.com/rss/search?"+p}
function rank(all,page,c){const valid=all.filter(a=>a.title.length>=18);valid.sort((a,b)=>score(b,c)-score(a,c));const out=[],perSource=new Map();for(const a of valid){if(out.some(x=>x.url===a.url||similarity(x.title,a.title)>.58))continue;const source=a.source||domain(a.url)||"News source",n=perSource.get(source)||0;if(n>=2)continue;perSource.set(source,n+1);out.push({title:a.title,summary:summary(a,c),body:`${a.title}. Open the original publisher for the complete report.`,whyItMatters:why(page,a.title),source,url:a.url,publishedAt:a.publishedAt||"",aiSummary:false});if(out.length===5)break}console.log(`  ${c.name}: ${out.length}/5 selected from ${valid.length} RSS candidates.`);return out}
async function collect(page,c){const all=[],seen=new Set();const add=items=>{for(const a of items){if(!a.url||seen.has(a.url))continue;seen.add(a.url);a.title=cleanGoogleTitle(a.title,a.source);all.push(a)}};try{console.log(`  Google News RSS: ${c.googleQuery}`);const items=parseFeed(await fetchText(googleUrl(c)),"Google News");console.log(`  Received ${items.length} Google News RSS items.`);add(items)}catch(e){console.warn(`  Google News RSS unavailable: ${e.message}`)}let ranked=rank(all,page,c);if(ranked.length===5)return ranked;for(const url of c.fallbacks){try{console.log(`  Fallback RSS: ${url}`);const items=parseFeed(await fetchText(url),domain(url));console.log(`  Received ${items.length} fallback RSS items.`);add(items);ranked=rank(all,page,c);if(ranked.length===5)return ranked}catch(e){console.warn(`  Fallback unavailable: ${e.message}`)}}if(ranked.length<5)throw new Error(`${c.name}: only ${ranked.length}/5 suitable RSS stories`);return ranked}

function extractJson(text=""){
  const cleaned=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  try{return JSON.parse(cleaned)}catch{}
  const a=cleaned.indexOf("["),b=cleaned.lastIndexOf("]");
  if(a>=0&&b>a)return JSON.parse(cleaned.slice(a,b+1));
  throw new Error("Gemini returned no parseable JSON array");
}
async function aiSummarize(page,c,stories){
  if(!GEMINI_API_KEY){console.warn(`  ${c.name}: GEMINI_API_KEY missing; keeping RSS summaries.`);return stories;}
  const inputs=stories.map((s,i)=>({id:i+1,title:s.title,source:s.source,rssSummary:s.summary}));
  const prompt=`You are preparing an old-TV teletext daily news edition. Research and summarize these 5 CURRENT ${c.name.toUpperCase()} stories. Use Google Search grounding to verify what each headline refers to. Do not invent facts. Keep the exact story IDs.\n\nFor each item return: id; summary (2 concise factual sentences, 35-65 words total); body (3-5 concise factual sentences, 70-120 words total, with key facts, actors, numbers/dates when relevant); whyItMatters (1 concise event-specific sentence).\n\nReturn ONLY a JSON array, no markdown.\n\nStories:\n${JSON.stringify(inputs)}`;
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{
    const r=await fetch(url,{method:"POST",signal:controller.signal,headers:{"x-goog-api-key":GEMINI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.2,maxOutputTokens:5000}})});
    const raw=await r.text();
    if(!r.ok)throw new Error(`Gemini HTTP ${r.status}: ${raw.slice(0,220).replace(/\s+/g," ")}`);
    const j=JSON.parse(raw),outText=(j.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("").trim();
    const items=extractJson(outText); if(!Array.isArray(items))throw new Error("Gemini output is not an array");
    const byId=new Map(items.map(x=>[Number(x.id),x])); let applied=0;
    const merged=stories.map((s,i)=>{const x=byId.get(i+1);if(!x||typeof x.summary!=="string"||typeof x.body!=="string"||typeof x.whyItMatters!=="string")return s;applied++;return {...s,summary:x.summary.trim(),body:x.body.trim(),whyItMatters:x.whyItMatters.trim(),aiSummary:true,aiModel:GEMINI_MODEL};});
    console.log(`  ${c.name}: AI summaries applied to ${applied}/5 stories.`); return merged;
  }catch(e){console.warn(`  ${c.name}: Gemini summarization unavailable: ${e.message}`);return stories;}finally{clearTimeout(timer)}
}

async function previousCategories(){try{return JSON.parse(await fs.readFile("news.json","utf8"))?.categories||{}}catch{return{}}}

const previous=await previousCategories(),categories={},categoryStatus={};let freshPages=0,aiPages=0;
for(const page of PAGES){const c=CATS[page];console.log(`\n=== ${page} ${c.name.toUpperCase()} ===`);try{let stories=await collect(page,c);stories=await aiSummarize(page,c,stories);categories[page]=stories;categoryStatus[page]=stories.every(s=>s.aiSummary)?"fresh-ai":"fresh-rss";freshPages++;if(stories.every(s=>s.aiSummary))aiPages++}catch(e){console.error(`  ${c.name} update failed: ${e.message}`);if(Array.isArray(previous[page])&&previous[page].length===5){categories[page]=previous[page];categoryStatus[page]="previous-edition-fallback";console.warn(`  Keeping previous valid ${c.name} page.`)}else throw new Error(`${c.name} has no fresh stories and no previous valid page.`)}}
const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(NOW),get=t=>parts.find(x=>x.type===t)?.value,date=`${get("year")}-${get("month")}-${get("day")}`;
const edition=aiPages===5?"live-rss-ai-free":freshPages===5?"live-rss-partial-ai":"live-rss-ai-with-fallback";
const out={date,generatedAt:NOW.toISOString(),edition,freshPages,aiPages,categoryStatus,categories};
await fs.writeFile("news.json",JSON.stringify(out,null,2)+"\n","utf8");
console.log(`\nSUCCESS: ${date}; fresh pages ${freshPages}/5; AI pages ${aiPages}/5; total stories ${Object.values(categories).reduce((n,a)=>n+a.length,0)}.`);
