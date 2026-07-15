import { chromium } from 'playwright'; import { spawn } from 'node:child_process';
const PORT=3160, BASE=`http://localhost:${PORT}`;
const server=spawn('npx',['vite','--port',String(PORT),'--strictPort'],{stdio:'ignore'});
process.on('exit',()=>server.kill('SIGTERM'));
for(let i=0;i<80;i++){try{if((await fetch(BASE)).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}});
async function chart(fields){
  for(const [id,v] of fields) await p.fill('#'+id,v);
  await p.click('.quick-city-btn[data-city="istanbul"]'); await p.waitForTimeout(400);
  await p.click('#calculateBtn'); await p.waitForTimeout(2500);
}
await p.goto(BASE,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
// Kullanıcının gösterdiği: 13 Kas 1993 16:59 Istanbul
await chart([['birthDay','13'],['birthMonth','11'],['birthYear','1993'],['birthHour','16'],['birthMinute','59']]);
await p.locator('#natalChartCanvas').screenshot({path:'/tmp/sf/kisiB.png'});
// Serra (SolarFire referansı elimde)
await p.click('#clearFormBtn'); await p.waitForTimeout(500);
await chart([['birthDay','6'],['birthMonth','8'],['birthYear','1998'],['birthHour','14'],['birthMinute','37']]);
// Antalya için şehir aramasını değiştir
await p.fill('#citySearch','Antalya'); await p.waitForTimeout(1000);
await p.click('.city-option'); await p.waitForTimeout(300);
await p.click('#calculateBtn'); await p.waitForTimeout(2500);
await p.locator('#natalChartCanvas').screenshot({path:'/tmp/sf/serra.png'});
await b.close(); server.kill('SIGTERM'); process.exit(0);
