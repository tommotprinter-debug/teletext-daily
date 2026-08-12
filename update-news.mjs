import fs from "node:fs/promises";

const NOW=new Date();
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


let GOOGLE_DECODER=null;
async function getGoogleDecoder(){
  if(GOOGLE_DECODER!==null)return GOOGLE_DECODER;
  try{
    const mod=await import("google-news-url-decoder");
    const Cls=mod.GoogleDecoder||mod.default?.GoogleDecoder;
    GOOGLE_DECODER=Cls?new Cls():false;
  }catch(e){
    console.warn(`  Google News decoder unavailable: ${e.message}`);
    GOOGLE_DECODER=false;
  }
  return GOOGLE_DECODER;
}
async function decodeGoogleNewsStories(stories){
  const decoder=await getGoogleDecoder();
  if(!decoder)return stories;
  const targets=stories.map(s=>isGoogleNewsUrl(s.url)?s.url:null);
  const urls=targets.filter(Boolean);
  if(!urls.length)return stories;
  try{
    const results=await decoder.decodeBatch(urls);
    let j=0,resolved=0;
    const out=stories.map(story=>{
      if(!isGoogleNewsUrl(story.url))return story;
      const r=results[j++];
      const direct=r?.status?safeHttpUrl(r.decoded_url):"";
      if(direct&&!isGoogleNewsUrl(direct)){
        resolved++;
        return {...story,originalDiscoveryUrl:story.url,url:direct,publisherUrlResolved:true};
      }
      return story;
    });
    console.log(`  Publisher URL decoder: ${resolved}/${urls.length} Google News links resolved.`);
    return out;
  }catch(e){
    console.warn(`  Publisher URL decoder failed: ${e.message}`);
    return stories;
  }
}
const STOPWORDS=new Set(("the a an and or but if then else when while of to in on at by for from with as is are was were be been being has have had do does did will would should could may might can this that these those it its their his her they them we our you your i he she who which what where why how about into over after before than also more most less not no new says said report reports reported according amid among during through across per via up down out off just only other another some any all both each few many much such own same so too very".split(/\s+/)));

function htmlDecode(s=""){return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))}
function stripPageHtml(s=""){return htmlDecode(s).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function isGoogleNewsUrl(url=""){try{return new URL(url).hostname.toLowerCase().endsWith("news.google.com")}catch{return false}}
function safeHttpUrl(url=""){try{const u=new URL(url);return ["http:","https:"].includes(u.protocol)?u.href:""}catch{return""}}
function metaContent(html,key){
 const patterns=[
   new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,"i"),
   new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,"i")
 ];
 for(const p of patterns){const m=html.match(p);if(m)return stripPageHtml(m[1])}
 return"";
}
function canonicalUrl(html){
 const m=html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i)
      ||html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i);
 return m?safeHttpUrl(htmlDecode(m[1])):"";
}
function jsonLdArticleBody(html){
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
   try{
     const parsed=JSON.parse(htmlDecode(m[1]).trim());
     const stack=Array.isArray(parsed)?[...parsed]:[parsed];
     while(stack.length){
       const x=stack.pop();
       if(!x||typeof x!=="object")continue;
       if(typeof x.articleBody==="string"&&x.articleBody.trim().length>200)return stripPageHtml(x.articleBody);
       for(const v of Object.values(x))if(v&&typeof v==="object")stack.push(v);
     }
   }catch{}
 }
 return"";
}
function articleElementText(html){
 const matches=[...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(m=>stripPageHtml(m[1])).filter(t=>t.length>200);
 if(matches.length)return matches.sort((a,b)=>b.length-a.length)[0];
 return"";
}
function sentenceSplit(text=""){
 return text.replace(/\s+/g," ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“‘])/).map(x=>x.trim()).filter(x=>x.length>=35&&x.length<=450);
}
function wordList(text=""){return normalize(text).split(" ").filter(w=>w.length>3&&!STOPWORDS.has(w))}
function extractiveSentences(text,title,count){
 const sentences=sentenceSplit(text).slice(0,80);
 if(!sentences.length)return[];
 const freq=new Map();
 for(const w of wordList(text))freq.set(w,(freq.get(w)||0)+1);
 const titleWords=new Set(wordList(title));
 const scored=sentences.map((s,i)=>{
   const ws=wordList(s);
   if(!ws.length)return{s,i,score:0};
   let score=ws.reduce((n,w)=>n+(freq.get(w)||0),0)/Math.sqrt(ws.length);
   score+=ws.filter(w=>titleWords.has(w)).length*3.5;
   if(i<3)score+=4-i;
   if(/\d|%|€|\$|PLN|MW|GW|billion|million/i.test(s))score+=2;
   return{s,i,score};
 }).sort((a,b)=>b.score-a.score);
 const chosen=[];
 for(const item of scored){
   if(chosen.some(x=>similarity(x.s,item.s)>.65))continue;
   chosen.push(item);
   if(chosen.length===count)break;
 }
 return chosen.sort((a,b)=>a.i-b.i).map(x=>x.s);
}
async function fetchHtml(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
   const r=await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"User-Agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Safari/537.36","Accept":"text/html,application/xhtml+xml"}});
   if(!r.ok)throw new Error(`HTTP ${r.status}`);
   const type=r.headers.get("content-type")||"";
   if(!type.includes("text/html")&&!type.includes("application/xhtml+xml"))throw new Error(`non-HTML ${type}`);
   return{html:await r.text(),finalUrl:r.url};
 }finally{clearTimeout(timer)}
}
async function resolveAndExtract(story){
 if(isGoogleNewsUrl(story.url)){
   return{ok:false,error:"unresolved Google News URL"};
 }
 let html="",finalUrl="";
 try{
   const first=await fetchHtml(story.url);
   html=first.html;
   finalUrl=safeHttpUrl(first.finalUrl)||safeHttpUrl(story.url);
 }catch(e){
   return{ok:false,error:e.message};
 }
 if(isGoogleNewsUrl(finalUrl))return{ok:false,error:"Google News landing page rejected"};

 let resolved=finalUrl;
 const c=canonicalUrl(html),og=safeHttpUrl(metaContent(html,"og:url"));
 if(c&&!isGoogleNewsUrl(c))resolved=c;
 else if(og&&!isGoogleNewsUrl(og))resolved=og;

 const body=jsonLdArticleBody(html)||articleElementText(html);
 const meta=metaContent(html,"description")||metaContent(html,"og:description");
 const evidence=(body||meta||"").trim();
 const low=evidence.toLowerCase();

 const boilerplate=
   low.includes("comprehensive up-to-date news coverage") ||
   low.includes("aggregated from sources all over the world by google news") ||
   low.includes("google news");

 if(boilerplate)return{ok:false,error:"Google News boilerplate rejected"};
 if(evidence.length<220)return{ok:false,error:`insufficient article evidence (${evidence.length} chars)`};

 return{ok:true,url:resolved,text:body||"",meta:meta||"",evidenceChars:evidence.length};
}
function whyLocal(page,title){return why(page,title)}
function compactSentences(items,maxChars){
 let out="";
 for(const s of items){
   const clean=s.replace(/\s+/g," ").trim();
   if(!clean)continue;
   if((out+" "+clean).trim().length>maxChars)break;
   out+=(out?" ":"")+clean;
 }
 return out;
}
async function clusterSummary(story,c){
 const cleanedTitle=story.title.replace(/"/g,"").replace(/\s+/g," ").trim();
 const query=`"${cleanedTitle}" when:3d`;
 const p=new URLSearchParams({q:query,hl:c.locale.hl,gl:c.locale.gl,ceid:c.locale.ceid});
 let items=[];
 try{items=parseFeed(await fetchText("https://news.google.com/rss/search?"+p),"Google News")}catch{}
 items=items
   .filter(x=>x.title&&x.url)
   .map(x=>({...x,title:cleanGoogleTitle(x.title,x.source),description:stripHtml(x.description||"")}));

 const related=[];
 for(const x of items){
   const sim=similarity(story.title,x.title);
   if(sim<.12)continue;
   if(normalize(x.title)===normalize(story.title)&&x.source===story.source)continue;
   if(related.some(y=>similarity(y.title,x.title)>.72))continue;
   related.push(x);
   if(related.length===5)break;
 }

 const sources=[story.source,...related.map(x=>x.source)].filter(Boolean);
 const uniqueSources=[...new Set(sources)].slice(0,5);
 const relatedTitles=related.map(x=>x.title).filter(t=>t&&normalize(t)!==normalize(story.title)).slice(0,3);

 let summary;
 if(relatedTitles.length>=2){
   summary=`${story.title}. Other current reports add that ${relatedTitles[0].replace(/[.!?]+$/,"")}; ${relatedTitles[1].replace(/[.!?]+$/,"")}.`;
 }else if(relatedTitles.length===1){
   summary=`${story.title}. A separate current report adds: ${relatedTitles[0]}.`;
 }else{
   summary=`${story.title}. This item is currently reported by ${story.source}; no sufficiently distinct corroborating RSS headline was available for a fuller automated brief.`;
 }

 const evidence=[];
 const baseDesc=stripHtml(story.summary||"");
 if(baseDesc&&normalize(baseDesc)!==normalize(story.title)&&!baseDesc.toLowerCase().includes("comprehensive up-to-date news coverage"))evidence.push(baseDesc);
 for(const x of related){
   const d=stripHtml(x.description||"");
   if(d&&d.length>50&&!d.toLowerCase().includes("comprehensive up-to-date news coverage"))evidence.push(d);
 }
 relatedTitles.forEach(t=>evidence.push(t+"."));

 let body=compactSentences(evidence,1000);
 if(body.length<120){
   body=`${summary} Sources seen in current RSS coverage: ${uniqueSources.join(", ")||story.source}. Open the original source link for the publisher's complete report.`;
 }

 return{
   summary:summary.slice(0,520),
   body,
   coverageSources:uniqueSources,
   relatedReports:relatedTitles.length
 };
}
async function enrichStory(story,page,c){
 const extracted=await resolveAndExtract(story);
 if(extracted.ok){
   const evidence=(extracted.text||extracted.meta||"").trim();
   const short=extractiveSentences(evidence,story.title,2);
   const long=extractiveSentences(evidence,story.title,4);
   if(short.length&&long.length){
     const direct=extracted.url&&!isGoogleNewsUrl(extracted.url)?extracted.url:"";
     return{
       ...story,
       url:direct||story.url,
       summary:compactSentences(short,430),
       body:compactSentences(long,1000),
       whyItMatters:whyLocal(page,story.title),
       summaryMethod:"article-extract",
       publisherUrlResolved:Boolean(direct||story.publisherUrlResolved),
       extractedTextChars:evidence.length
     };
   }
 }
 const clustered=await clusterSummary(story,c);
 return{
   ...story,
   summary:clustered.summary,
   body:clustered.body,
   whyItMatters:whyLocal(page,story.title),
   summaryMethod:"rss-cluster",
   publisherUrlResolved:false,
   coverageSources:clustered.coverageSources
 };
}
async function enrichStories(stories,page,c){
 const results=await Promise.allSettled(stories.map(s=>enrichStory(s,page,c)));
 return results.map((r,i)=>r.status==="fulfilled"?r.value:{...stories[i],summaryMethod:"rss-basic"});
}

async function previousCategories(){try{return JSON.parse(await fs.readFile("news.json","utf8"))?.categories||{}}catch{return{}}}

const previous=await previousCategories(),categories={},categoryStatus={};
let freshPages=0;
for(const page of PAGES){
  const c=CATS[page];
  console.log(`\n=== ${page} ${c.name.toUpperCase()} ===`);
  try{
    let stories=await collect(page,c);
    stories=await decodeGoogleNewsStories(stories);
    stories=await enrichStories(stories,page,c);
    categories[page]=stories;
    const extractCount=stories.filter(s=>s.summaryMethod==="article-extract").length;
    const clusterCount=stories.filter(s=>s.summaryMethod==="rss-cluster").length;
    categoryStatus[page]=extractCount===5?"fresh-article-extract":extractCount>0?"fresh-mixed":"fresh-rss-cluster";
    freshPages++;
    console.log(`  ${c.name}: article extracts ${extractCount}/5; RSS-cluster summaries ${clusterCount}/5.`);
  }catch(e){
    console.error(`  ${c.name} update failed: ${e.message}`);
    if(Array.isArray(previous[page])&&previous[page].length===5){
      categories[page]=previous[page];
      categoryStatus[page]="previous-edition-fallback";
      console.warn(`  Keeping previous valid ${c.name} page.`);
    }else throw e;
  }
}
const allStories=Object.values(categories).flat();
const articleExtractStories=allStories.filter(s=>s.summaryMethod==="article-extract").length;
const rssClusterStories=allStories.filter(s=>s.summaryMethod==="rss-cluster").length;
const resolvedPublisherUrls=allStories.filter(s=>s.publisherUrlResolved===true).length;
const badBoilerplateStories=allStories.filter(s=>(s.summary||"").toLowerCase().includes("comprehensive up-to-date news coverage")).length;
const meaningfulSummaryStories=allStories.filter(s=>(s.summary||"").length>=100 && (s.body||"").length>=120).length;
if(badBoilerplateStories>0)throw new Error(`Quality gate failed: ${badBoilerplateStories} Google News boilerplate summaries`);
if(meaningfulSummaryStories<20)throw new Error(`Quality gate failed: only ${meaningfulSummaryStories}/25 meaningful summaries`);
const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(NOW);
const get=t=>parts.find(x=>x.type===t)?.value;
const date=`${get("year")}-${get("month")}-${get("day")}`;
const out={
  date,
  generatedAt:NOW.toISOString(),
  edition:"live-local-summary",
  freshPages,
  articleExtractStories,
  rssClusterStories,
  resolvedPublisherUrls,
  meaningfulSummaryStories,
  badBoilerplateStories,
  categoryStatus,
  categories
};
await fs.writeFile("news.json",JSON.stringify(out,null,2)+"\n","utf8");
console.log(`\nSUCCESS: ${date}; stories 25; meaningful summaries ${meaningfulSummaryStories}/25; article extracts ${articleExtractStories}/25; RSS-cluster summaries ${rssClusterStories}/25; direct publisher URLs ${resolvedPublisherUrls}/25; boilerplate 0.`);