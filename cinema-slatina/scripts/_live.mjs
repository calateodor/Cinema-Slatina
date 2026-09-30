import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome" });
const out="C:/Users/Teo/AppData/Local/Temp/claude/D--Teo-PNL-Cinema/6ad4f308-0819-4d2f-ae4d-af473c0ad83f/scratchpad/";
const ctx = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1,
  userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
const p = await ctx.newPage(); const errs=[];
p.on("pageerror",e=>errs.push("JS "+e.message)); p.on("console",m=>m.type()==="error"&&errs.push("C "+m.text().slice(0,200)));
p.on("response",r=>{ if(r.status()>=400) errs.push("HTTP "+r.status()+" "+r.url().slice(0,120)); });
await p.goto("https://cinema-slatina-cdz2.vercel.app/",{waitUntil:"networkidle"}); await p.waitForTimeout(3000);
await p.screenshot({path:out+"live-m.png"});
console.log(errs.join("\n"));
await b.close();
