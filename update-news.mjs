import fs from "node:fs/promises";

const BASE=process.env.GDELT_BASE_URL || "https://api.gdeltproject.org/api/v2/doc/doc";
const NOW=new Date();
const CATS={
 "200":{name:"Politics",query:'(Poland OR Polish OR Europe OR "European Union" OR NATO) (government OR parliament OR election OR policy OR security)',boost:["poland","polish","warsaw","government","parliament","election","minister","nato","ukraine","europe"]},
 "300":{name:"Business",query:'(Poland OR Polish OR Europe) (business OR economy OR company OR market OR investment OR inflation OR industry)',boost:["poland","polish","business","economy","market","investment","inflation","industry","bank","company"]},
 "400":{name:"Energy",query:'(Poland OR Polish OR Baltic OR Europe) (energy OR electricity OR "offshore wind" OR nuclear OR grid OR hydrogen OR storage)',boost:["poland","polish","baltic","offshore","wind","grid","nuclear","energy","electricity","hydrogen","storage","pse","orlen"]},
 "500":{name:"AI",query:'("artificial intelligence" OR OpenAI OR Anthropic OR Gemini OR Copilot) (technology OR model OR agent OR software OR enterprise)',boost:["openai","anthropic","google","gemini","microsoft","copilot","model","agent","enterprise","artificial intelligence"]},
 "600":{name:"Sports",query:'(Poland OR Polish OR Europe) (football OR tennis OR volleyball OR athletics OR motorsport OR basketball OR sport)',boost:["poland","polish","football","tennis","volleyball","athletics","motorsport","basketball","championship"]}
};
function normalize(t=""){return t.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function wset(t){return new Set(normalize(t).split(" ").filter(x=>x.length>3))}
function similarity(a,b){const A=wset(a),B=wset(b);if(!A.size||!B.size)return 0;let n=0;for(const w of A)if(B.has(w))n++;return n/(A.size+B.size-n)}
function cleanTitle(t=""){return t.replace(/\s*[-–—|]\s*[^-–—|]{2,45}$/,"").trim()}
function domain(u=""){try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}}
function parseDate(v=""){
 const s=String(v);
 if(/^\d{8}T\d{6}Z$/.test(s))return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`);
 return new Date(v);
}
function ageH(v){const d=parseDate(v);return isNaN(d)?48:Math.max(0,(NOW-d)/36e5)}
function score(a,c){
 const text=`${a.title} ${a.domain||""} ${a.sourcecountry||""}`.toLowerCase();
 let s=Math.max(0,36-ageH(a.seendate));
 for(const k of c.boost)if(text.includes(k))s+=["poland","polish"].includes(k)?18:5;
 if((a.sourcecountry||"").toLowerCase()==="poland")s+=15;
 return s;
}
function summary(a,c){
 const h=Math.round(ageH(a.seendate)),when=h<1?"recently":h===1?"about one hour ago":`about ${Math.min(h,48)} hours ago`;
 return `${c.name} report from ${a.domain}, published ${when}. Open the original source for full context.`;
}
function why(page,title){
 const t=title.toLowerCase();
 if(page==="400"){if(t.includes("offshore")||t.includes("wind"))return"Relevant to offshore wind capacity, infrastructure, supply chain, or market development.";if(t.includes("grid"))return"Grid capacity can determine how quickly new generation connects and reaches customers.";if(t.includes("nuclear"))return"Nuclear decisions can affect long-term generation mix, investment, and energy security.";return"Energy developments can affect investment, security of supply, infrastructure, and power prices."}
 if(page==="500")return"Material AI developments can affect software capability, productivity, competition, and technology spending.";
 if(page==="300")return"Business developments can affect investment, demand, financing conditions, and corporate decisions.";
 if(page==="200")return"Political decisions can change regulation, public spending, security policy, and the business environment.";
 return"Major sports results and events shape rankings, qualification, schedules, and public attention.";
}
async function fetchPage(page,c){
 const q=new URLSearchParams({query:c.query,mode:"artlist",maxrecords:"75",format:"json",sort:"datedesc",timespan:"36H"});
 const r=await fetch(`${BASE}?${q}`);
 if(!r.ok)throw new Error(`${c.name}: GDELT HTTP ${r.status}`);
 const j=await r.json(),raw=Array.isArray(j.articles)?j.articles:Array.isArray(j)?j:[];
 const valid=raw.filter(a=>a?.title&&a?.url).map(a=>({...a,title:cleanTitle(a.title),domain:a.domain||domain(a.url)})).filter(a=>a.title.length>=18&&a.domain);
 valid.sort((a,b)=>score(b,c)-score(a,c));
 const out=[],perDomain=new Map();
 for(const a of valid){
   if(out.some(x=>similarity(x.title,a.title)>.58))continue;
   const n=perDomain.get(a.domain)||0;if(n>=2)continue;perDomain.set(a.domain,n+1);
   out.push({title:a.title,summary:summary(a,c),body:`${a.title}. This daily edition ranks the story from public news metadata and links to the publisher for the complete report.`,whyItMatters:why(page,a.title),source:a.domain,url:a.url,publishedAt:a.seendate||""});
   if(out.length===5)break;
 }
 if(out.length<5)throw new Error(`${c.name}: only ${out.length} suitable distinct stories`);
 return out;
}
const categories={};
for(const [p,c] of Object.entries(CATS))categories[p]=await fetchPage(p,c);
const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(NOW);
const get=t=>parts.find(x=>x.type===t)?.value;
const date=`${get("year")}-${get("month")}-${get("day")}`;
const out={date,generatedAt:NOW.toISOString(),edition:"live-free",categories};
await fs.writeFile("news.json",JSON.stringify(out,null,2)+"\n","utf8");
console.log(`Generated ${date}: ${Object.values(categories).reduce((n,x)=>n+x.length,0)} stories.`);
