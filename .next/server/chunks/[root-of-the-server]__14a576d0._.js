module.exports=[18622,(e,t,s)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,s)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},24361,(e,t,s)=>{t.exports=e.x("util",()=>require("util"))},44950,e=>e.a(async(t,s)=>{try{let t=await e.y("bcryptjs-ee66c2bdc904f2cf");e.n(t),s()}catch(e){s(e)}},!0),92509,(e,t,s)=>{t.exports=e.x("url",()=>require("url"))},21517,(e,t,s)=>{t.exports=e.x("http",()=>require("http"))},54799,(e,t,s)=>{t.exports=e.x("crypto",()=>require("crypto"))},49719,(e,t,s)=>{t.exports=e.x("assert",()=>require("assert"))},45706,(e,t,s)=>{t.exports=e.x("querystring",()=>require("querystring"))},874,(e,t,s)=>{t.exports=e.x("buffer",()=>require("buffer"))},6461,(e,t,s)=>{t.exports=e.x("zlib",()=>require("zlib"))},24836,(e,t,s)=>{t.exports=e.x("https",()=>require("https"))},27699,(e,t,s)=>{t.exports=e.x("events",()=>require("events"))},75096,e=>{e.v({name:"openid-client",version:"5.7.1",description:"OpenID Connect Relying Party (RP, Client) implementation for Node.js runtime, supports passportjs",keywords:["auth","authentication","basic","certified","client","connect","dynamic","electron","hybrid","identity","implicit","oauth","oauth2","oidc","openid","passport","relying party","strategy"],homepage:"https://github.com/panva/openid-client",repository:"panva/openid-client",funding:{url:"https://github.com/sponsors/panva"},license:"MIT",author:"Filip Skokan <panva.ip@gmail.com>",exports:{types:"./types/index.d.ts",import:"./lib/index.mjs",require:"./lib/index.js"},main:"./lib/index.js",types:"./types/index.d.ts",files:["lib","types/index.d.ts"],scripts:{format:"npx prettier --loglevel silent --write ./lib ./test ./certification ./types",test:"mocha test/**/*.test.js"},dependencies:{jose:"^4.15.9","lru-cache":"^6.0.0","object-hash":"^2.2.0","oidc-token-hash":"^5.0.3"},devDependencies:{"@types/node":"^16.18.106","@types/passport":"^1.0.16",base64url:"^3.0.1",chai:"^4.5.0",mocha:"^10.7.3",nock:"^13.5.5",prettier:"^2.8.8","readable-mock-req":"^0.2.2",sinon:"^9.2.4",timekeeper:"^2.3.1"},"standard-version":{scripts:{postchangelog:"sed -i '' -e 's/### \\[/## [/g' CHANGELOG.md"},types:[{type:"feat",section:"Features"},{type:"fix",section:"Fixes"},{type:"chore",hidden:!0},{type:"docs",hidden:!0},{type:"style",hidden:!0},{type:"refactor",section:"Refactor",hidden:!1},{type:"perf",section:"Performance",hidden:!1},{type:"test",hidden:!0}]}})},93695,(e,t,s)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},63021,(e,t,s)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},43793,e=>{"use strict";var t=e.i(63021);let s=globalThis.prisma??new t.PrismaClient({log:["error"]});async function r(){}e.s(["db",0,s,"ensureDatabase",()=>r])},99873,(e,t,s)=>{"use strict";Object.defineProperty(s,"__esModule",{value:!0}),s.default=function(e){return{id:"credentials",name:"Credentials",type:"credentials",credentials:{},authorize:()=>null,options:e}}},79832,e=>e.a(async(t,s)=>{try{var r=e.i(99873),a=e.i(44950),n=e.i(43793),o=t([a]);[a]=o.then?(await o)():o;let u={session:{strategy:"jwt",maxAge:2592e3},pages:{signIn:"/auth"},providers:[(0,r.default)({name:"credentials",credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"}},async authorize(e){let t=e?.email?.toString().trim().toLowerCase(),s=e?.password?.toString();if(!t||!s)return null;await (0,n.ensureDatabase)();let r=await n.db.user.findFirst({where:{email:t,status:"ACTIVE"},include:{business:!0}});return r&&r.passwordHash&&await a.default.compare(s,r.passwordHash)?{id:r.id,email:r.email,name:r.name,businessId:r.businessId,businessName:r.business.name,businessType:r.business.type,role:r.role}:null}})],callbacks:{async jwt({token:e,user:t}){if(t&&(e.businessId=t.businessId,e.businessName=t.businessName,e.businessType=t.businessType,e.role=t.role),e.businessId){let t=await n.db.business.findUnique({where:{id:e.businessId},select:{name:!0,type:!0,agentName:!0}});t&&(e.businessName=t.name,e.businessType=t.type,e.agentName=t.agentName)}return e},session:async({session:e,token:t})=>(e.user&&(e.user.id=t.sub,e.user.businessId=t.businessId,e.user.businessName=t.businessName,e.user.businessType=t.businessType,e.user.role=t.role,e.user.agentName=t.agentName),e)},secret:process.env.NEXTAUTH_SECRET||"ares-dev-secret-change-in-production"};async function i(e){return a.default.hash(e,12)}e.s(["authOptions",0,u,"hashPassword",()=>i]),s()}catch(e){s(e)}},!1),32139,e=>e.a(async(t,s)=>{try{let t=await e.y("z-ai-web-dev-sdk-55cc529b8c59a411");e.n(t),s()}catch(e){s(e)}},!0),37897,e=>{"use strict";var t=e.i(43793),s=e.i(80231);async function r(e,r){let a=await t.db.business.findUnique({where:{id:e},include:{products:{where:{status:"ACTIVE"},take:200,orderBy:{createdAt:"desc"}},knowledge:{where:{status:"ACTIVE"},take:80},orders:{orderBy:{createdAt:"desc"},take:50},customers:{take:100}}});if(!a)throw Error("Business not found");let n=(0,s.findSubtype)(a.sectorCategory,a.sectorSubtype),o=n?.systemPrompt??"You work at a business. Help customers with their questions.",i=n?.label??a.type??"business",u=a.agentName||"A.R.E.S.",l=a.ownerFirstName||"the owner",c=(a.agentInstructions||"").trim(),d=[];try{d=JSON.parse(a.agentLearnings||"[]")}catch{}let h=new Date,p=new Date(h.getFullYear(),h.getMonth(),h.getDate()),m=new Date(p.getTime()-864e5),y=new Date(p.getTime()-6048e5),g=a.orders.filter(e=>e.createdAt>=p),f=a.orders.filter(e=>e.createdAt>=m&&e.createdAt<p),w=a.orders.filter(e=>e.createdAt>=y),b=g.filter(e=>"CANCELLED"!==e.status).reduce((e,t)=>e+t.total,0),x=w.filter(e=>"CANCELLED"!==e.status).reduce((e,t)=>e+t.total,0),$=a.orders.filter(e=>"PENDING"===e.status||"CONFIRMED"===e.status),k=a.orders.filter(e=>"FULFILLED"===e.status),v=a.products.filter(e=>e.stock<=e.lowStockThreshold),N=a.customers.length;for(let e of a.orders);let A=`===== REAL-TIME BUSINESS DATA (live from database) =====
Today: ${g.length} orders, ${a.currency} ${b.toFixed(2)} revenue
Yesterday: ${f.length} orders
This week: ${w.length} orders, ${a.currency} ${x.toFixed(2)} revenue
Pending orders (need attention): ${$.length}
Fulfilled orders: ${k.length}
Total customers: ${N}
Low stock items: ${v.length}${v.length>0?` (${v.map(e=>e.name).slice(0,3).join(", ")})`:""}

When the owner asks for a summary, analysis, or "how are we doing", use THIS data. Be specific with numbers. Don't make up stats.`,E="";if(r){let e=a.customers.find(e=>e.phone===r||e.whatsappId===r);if(e){let t=a.orders.filter(t=>t.customerPhone===r||t.customerName===e.name);E=`===== THIS CUSTOMER (you remember them) =====
Name: ${e.name||"unknown"}
Phone: ${e.phone}
Previous orders: ${t.length}
Last visit: ${t[0]?new Date(t[0].createdAt).toLocaleDateString():"first time"}
Lifetime value: ${a.currency} ${(e.lifetimeValue||0).toFixed(2)}

If this is a returning customer, acknowledge that you remember them. Use their name. Make them feel special. Don't be creepy about it -- just natural, like a real employee who recognizes a regular.`}}let I=a.products.map(e=>{let t=e.attributes?JSON.parse(e.attributes):{},s=t.size||t.color?` (size: ${t.size??"--"}, color: ${t.color??"--"})`:"",r=e.imageAlt?` [visual: ${e.imageAlt}]`:"";return`• ${e.name}${s} -- ${e.currency} ${e.price.toFixed(2)} \xb7 stock: ${e.stock}${e.stock<=e.lowStockThreshold?" [LOW STOCK]":""}${r}`}).join("\n"),T=a.knowledge.map(e=>`[${e.category}] ${e.question?`Q: ${e.question} -- `:""}A: ${e.answer}`).join("\n"),O=c?`===== HOW THE OWNER WANTS YOU TO ACT =====
${c}

Follow these instructions as your personality and behavior guide.`:`===== HOW YOU TALK =====
You speak like a real human. Vary your phrasing. Use contractions. Be concise. Match the customer's energy. Light humor when it fits. Have opinions.`,S=d.length>0?`===== WHAT YOU'VE LEARNED ABOUT THIS BUSINESS (from past conversations) =====
${d.map((e,t)=>`${t+1}. ${e}`).join("\n")}

Use these learnings to give better, more informed answers. They represent real things that have come up in conversations with this business's customers.`:"",D=`You are ${u}, a real person who works at ${a.name}. You are NOT an AI assistant, a chatbot, or a virtual assistant -- you are a human employee.

${o}

${O}

${A}

${E}

${S}

===== HOW YOU TALK (always) =====
- Vary your phrasing. Never repeat the same opening twice.
- Use contractions (I'm, you're, that's, we've, don't, can't).
- NEVER say: "How may I assist you today?", "Certainly!", "Of course!", "I would be happy to help", "As an AI", "I'm here to help", "Feel free to ask."
- Don't introduce yourself every message. After the first hello, just talk.
- Be concise. Real people don't write essays in chat.
- Match the customer's energy. Light humor is welcome when it fits.
- Have opinions about products/services.
- Answer ALL questions if they ask multiple.
- Never expose internal reasoning ("based on the catalog", "let me check"). Just answer.
- Don't use emojis unless the customer uses them first.

===== WHO YOU ARE =====
Your name is "${u}". You work at ${a.name}. The owner is ${l}.
You work in the ${i} sector.

===== BUSINESS =====
Name: ${a.name}
Sector: ${i}
Country: ${a.country} \xb7 Currency: ${a.currency}

===== CATALOG (live from database) =====
${I||"(no products yet -- if asked, say you're still getting stock listed and offer to take their contact details)"}

===== KNOWLEDGE BASE =====
${T||"(none yet)"}

===== TAKING AN ORDER =====
When a customer wants to buy:
1. Confirm what they want (item, size/color, quantity).
2. Ask for their name (so you can remember them next time). "What name should I put this under?"
3. Ask pickup or delivery.
4. If delivery: ask for location, preferred time, and phone number.
5. Read the order back in plain language, including their name.
6. Wait for them to say yes.
7. Once confirmed, write a natural reply, then end with:
   ORDER_CONFIRMED: {"items":[{"productName":"Item Name","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerPhone":"","customerName":""}
   Include customerName in the JSON so the system can remember them.

===== REMEMBERING CUSTOMERS =====
If you recognize a returning customer (from the customer context above), use their name naturally -- "Hey Akosua, good to see you again!" Don't overdo it. Just be warm like a real employee who knows their regulars.
If a customer tells you their name, use it in the conversation afterward. People love hearing their own name.

===== RULES =====
1. NEVER fabricate prices, stock, or features. Only use the catalog.
2. If asked about something not in the catalog, be honest and offer alternatives.
3. Don't dump the whole catalog. Only mention relevant items.
4. If something needs owner approval (refunds), say you'll have the owner handle it.
5. Never share internal business info with a customer.
6. If you don't know something, say so honestly.

===== LEARNING (important) =====
If the customer tells you something useful about the business that you didn't know -- a new product, a price change, a policy detail, a customer preference -- make a note of it. At the end of your reply, if you learned something worth remembering, add this marker (the system will save it; the customer never sees it):
LEARNED: <one sentence describing what you learned>
Only use this when you genuinely learned something new and factual. Don't use it for opinions or small talk.`;return{business:a,subtype:n,sectorLabel:i,agentName:u,systemPrompt:D}}async function a(r){let a=await t.db.business.findUnique({where:{id:r},include:{products:{where:{status:"ACTIVE"},take:50},orders:{orderBy:{createdAt:"desc"},take:50},conversations:{where:{status:"OPEN"},take:10}}});if(!a)return"Welcome back.";let n=a.agentName||"A.R.E.S.",o=a.ownerFirstName||"there",i=new Date().getHours(),u=(0,s.findSubtype)(a.sectorCategory,a.sectorSubtype),l=u?.label??"business",c=new Date;c.setHours(0,0,0,0);let d=a.orders.filter(e=>e.createdAt>=c),h=d.filter(e=>"CANCELLED"!==e.status).reduce((e,t)=>e+t.total,0),p=a.orders.filter(e=>"PENDING"===e.status||"CONFIRMED"===e.status).length,m=a.products.filter(e=>e.stock<=e.lowStockThreshold).length,y=a.conversations.length,g=[];h>0&&g.push(`GH₵${h.toLocaleString(void 0,{maximumFractionDigits:0})} in sales today across ${d.length} order${1===d.length?"":"s"}`),p>0&&g.push(`${p} order${1===p?"":"s"} need your attention`),m>0&&g.push(`${m} product${1===m?"":"s"} are running low`),y>0&&g.push(`${y} customer conversation${1===y?"":"s"} open`);try{let t=(await e.A(21553)).default,s=await t.create(),r=["warm and casual, like a friend greeting you","brief and energetic, like a colleague who's excited to work","calm and professional, like a trusted assistant","playful with a tiny bit of personality","thoughtful and specific, referencing one concrete detail"],u=r[Math.floor(Math.random()*r.length)],c=[`Welcome back, ${o}.`,`Hey ${o}.`,`${o}, good to see you.`,`Back at it, ${o}?`,`${o} -- let's go.`],d=c[Math.floor(Math.random()*c.length)],h=await s.chat.completions.create({messages:[{role:"system",content:`You are ${n}, the AI employee at ${a.name}, a ${l}. The owner, ${o}, just logged in for the ${i<12?"morning":i<17?"afternoon":"evening"}. Generate a short, unique greeting (2-3 sentences max). Style: ${u}. Don't start with the same words every time -- vary your opening. Use their name naturally. Mention 1-2 relevant facts from the data if any exist. Be concise. No emojis. No "How may I assist you" type phrases. Never repeat the exact same greeting twice.`},{role:"user",content:`Opening suggestion (you can use or ignore): "${d}". Facts: ${g.length>0?g.join("; "):"It's a quiet day so far -- no orders yet today."}. Write a fresh greeting now.`}],temperature:.95,max_tokens:200}),p=h?.choices?.[0]?.message?.content??"";if(p&&p.length>10)return p.trim()}catch(e){}let f=`${i<12?"Good morning":i<17?"Good afternoon":"Good evening"}, ${o} -- ${n} here.`;return g.length>0?f+=` ${g.join(", ")}.`:f+=" Quiet day so far -- ready when you are.",f}e.s(["buildBusinessContext",()=>r,"generateOwnerGreeting",()=>a])},21553,e=>{e.v(e=>Promise.resolve().then(()=>e(32139)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__14a576d0._.js.map