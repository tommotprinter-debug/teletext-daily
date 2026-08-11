import fs from "node:fs/promises";

const BASE = process.env.GDELT_BASE_URL || "https://api.gdeltproject.org/api/v2/doc/doc";
const NOW = new Date();
const RETRY_BASE_MS = Number(process.env.TELETEXT_RETRY_BASE_MS || 4000);
const PAGES = ["200","300","400","500","600"];
const CATS = {
  "200": {name:"Politics", queries:[
    '(Poland OR Polish OR Warsaw OR government OR parliament OR election OR NATO OR Ukraine)',
    '(Poland OR Polish OR Europe OR government OR parliament OR election OR security)'
  ], boost:["poland","polish","warsaw","government","parliament","election","minister","nato","ukraine","europe"]},
  "300": {name:"Business", queries:[
    '(Poland OR Polish OR business OR economy OR market OR investment OR inflation OR industry)',
    '(Poland OR Europe OR business OR economy OR company OR market OR investment)'
  ], boost:["poland","polish","business","economy","market","investment","inflation","industry","bank","company"]},
  "400": {name:"Energy", queries:[
    '(Poland OR Polish OR Baltic OR energy OR electricity OR offshore OR wind OR nuclear OR grid)',
    '(Poland OR Europe OR energy OR electricity OR wind OR nuclear OR grid OR hydrogen OR storage)'
  ], boost:["poland","polish","baltic","offshore","wind","grid","nuclear","energy","electricity","hydrogen","storage","pse","orlen"]},
  "500": {name:"AI", queries:[
    '(OpenAI OR Anthropic OR Gemini OR Copilot OR artificialintelligence OR AI)',
    '(OpenAI OR Anthropic OR GoogleAI OR MicrosoftAI OR AI OR artificialintelligence)'
  ], boost:["openai","anthropic","google","gemini","microsoft","copilot","model","agent","enterprise","artificial intelligence"," ai "]},
  "600": {name:"Sports", queries:[
    '(Poland OR Polish OR football OR tennis OR volleyball OR athletics OR motorsport OR basketball)',
    '(Poland OR Europe OR football OR tennis OR volleyball OR athletics OR motorsport OR sport)'
  ], boost:["poland","polish","football","tennis","volleyball","athletics","motorsport","basketball","championship"]}
};

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function normalize(t=""){return t.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function wset(t){return new Set(normalize(t).split(" ").filter(x=>x.length>3))}
function similarity(a,b){const A=wset(a),B=wset(b);if(!A.size||!B.size)return 0;let n=0;for(const w of A)if(B.has(w))n++;return n/(A.size+B.size-n)}
function cleanTitle(t=""){return t.replace(/\s*[-–—|]\s*[^-–—|]{2,45}$/," ").replace(/\s+/g," ").trim()}
function domain(u=""){try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}}
function parseDate(v=""){
  const s=String(v);
  if(/^\d{8}T\d{6}Z$/.test(s))return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`);
  return new Date(v);
}
function ageH(v){const d=parseDate(v);return isNaN(d)?72:Math.max(0,(NOW-d)/36e5)}
function score(a,c){
  const text=` ${a.title} ${a.domain||""} ${a.sourcecountry||""} `.toLowerCase();
  let s=Math.max(0,72-ageH(a.seendate));
  for(const k of c.boost)if(text.includes(k))s += ["poland","polish"].includes(k)?20:5;
  if((a.sourcecountry||"").toLowerCase()==="poland")s+=15;
  return s;
}
function summary(a,c){
  const h=Math.round(ageH(a.seendate));
  const when=h<1?"recently":h===1?"about one hour ago":`about ${Math.min(h,72)} hours ago`;
  return `${c.name} report from ${a.domain}, published ${when}. Open the original source for full context.`;
}
function why(page,title){
  const t=title.toLowerCase();
  if(page==="400"){
    if(t.includes("offshore")||t.includes("wind"))return "Relevant to offshore wind capacity, infrastructure, supply chain, or market development.";
    if(t.includes("grid"))return "Grid capacity can determine how quickly new generation connects and reaches customers.";
    if(t.includes("nuclear"))return "Nuclear decisions can affect long-term generation mix, investment, and energy security.";
    return "Energy developments can affect investment, security of supply, infrastructure, and power prices.";
  }
  if(page==="500")return "Material AI developments can affect software capability, productivity, competition, and technology spending.";
  if(page==="300")return "Business developments can affect investment, demand, financing conditions, and corporate decisions.";
  if(page==="200")return "Political decisions can change regulation, public spending, security policy, and the business environment.";
  return "Major sports results and events shape rankings, qualification, schedules, and public attention.";
}

async function requestArticles(query,timespan){
  const q=new URLSearchParams({query,mode:"artlist",maxrecords:"100",format:"json",sort:"datedesc",timespan});
  const url=`${BASE}?${q}`;
  let lastError;
  for(let attempt=1; attempt<=3; attempt++){
    try{
      console.log(`  GDELT request ${attempt}/3 • ${timespan} • ${query}`);
      const r=await fetch(url,{headers:{"User-Agent":"TeletextDaily/1.1 (GitHub Actions; public GDELT client)","Accept":"application/json"}});
      const text=await r.text();
      if(!r.ok)throw new Error(`HTTP ${r.status}: ${text.slice(0,180).replace(/\s+/g," ")}`);
      let j;
      try{j=JSON.parse(text)}catch{throw new Error(`non-JSON response: ${text.slice(0,180).replace(/\s+/g," ")}`)}
      const raw=Array.isArray(j?.articles)?j.articles:Array.isArray(j)?j:[];
      console.log(`  Received ${raw.length} candidate articles.`);
      return raw;
    }catch(e){
      lastError=e;
      console.warn(`  Attempt ${attempt} failed: ${e.message}`);
      if(attempt<3)await sleep(attempt*RETRY_BASE_MS);
    }
  }
  throw lastError;
}

function rankArticles(raw,page,c){
  const valid=raw.filter(a=>a?.title&&a?.url)
    .map(a=>({...a,title:cleanTitle(a.title),domain:a.domain||domain(a.url)}))
    .filter(a=>a.title.length>=18&&a.domain);
  valid.sort((a,b)=>score(b,c)-score(a,c));
  const out=[],perDomain=new Map();
  for(const a of valid){
    if(out.some(x=>x.url===a.url||similarity(x.title,a.title)>.58))continue;
    const n=perDomain.get(a.domain)||0;
    if(n>=2)continue;
    perDomain.set(a.domain,n+1);
    out.push({title:a.title,summary:summary(a,c),body:`${a.title}. This daily edition ranks the story from public news metadata and links to the publisher for the complete report.`,whyItMatters:why(page,a.title),source:a.domain,url:a.url,publishedAt:a.seendate||""});
    if(out.length===5)break;
  }
  return out;
}

async function fetchPage(page,c){
  const all=[];
  const seenUrls=new Set();
  for(const timespan of ["36h","72h"]){
    for(const query of c.queries){
      try{
        const batch=await requestArticles(query,timespan);
        for(const a of batch){ if(a?.url&&!seenUrls.has(a.url)){seenUrls.add(a.url);all.push(a);} }
        const ranked=rankArticles(all,page,c);
        console.log(`  ${c.name}: ${ranked.length}/5 suitable distinct stories after ${all.length} unique candidates.`);
        if(ranked.length===5)return ranked;
      }catch(e){
        console.warn(`  ${c.name} query failed but fallback will continue: ${e.message}`);
      }
    }
  }
  const final=rankArticles(all,page,c);
  if(final.length<5)throw new Error(`${c.name}: only ${final.length}/5 suitable stories after all fallback searches`);
  return final;
}

async function readPrevious(){
  try{
    const j=JSON.parse(await fs.readFile("news.json","utf8"));
    return j?.categories||{};
  }catch{return {};}
}

const previous=await readPrevious();
const categories={};
const status={};
let freshPages=0;
for(const p of PAGES){
  const c=CATS[p];
  console.log(`\n=== ${p} ${c.name.toUpperCase()} ===`);
  try{
    categories[p]=await fetchPage(p,c);
    status[p]="fresh";
    freshPages++;
  }catch(e){
    console.error(`  ${c.name} live update failed: ${e.message}`);
    if(Array.isArray(previous[p])&&previous[p].length===5){
      categories[p]=previous[p];
      status[p]="previous-edition-fallback";
      console.warn(`  Keeping previous valid ${c.name} page instead of failing the entire edition.`);
    }else{
      throw new Error(`${c.name} has no live results and no previous valid page to fall back to.`);
    }
  }
}

const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(NOW);
const get=t=>parts.find(x=>x.type===t)?.value;
const date=`${get("year")}-${get("month")}-${get("day")}`;
const out={date,generatedAt:NOW.toISOString(),edition:freshPages===5?"live-free":"live-free-with-fallback",freshPages,categoryStatus:status,categories};
await fs.writeFile("news.json",JSON.stringify(out,null,2)+"\n","utf8");
console.log(`\nSUCCESS: generated ${date}. Fresh pages: ${freshPages}/5. Total stories: ${Object.values(categories).reduce((n,x)=>n+x.length,0)}.`);
