/* DureReel — 두레서울 motion engine.
 * Every frame is a pure function of time, so the same code plays live on a website,
 * scrubs frame-accurately, and renders to video in headless Chrome.
 *
 * Usage:
 *   <script src="dure-reel.js"></script>
 *   const reel = DureReel.mount(document.getElementById('hero'), { text:false, hud:false, fit:'cover' });
 *
 * Options (all optional):
 *   speed     0.68   playback speed of the 15 s internal timeline (0.68 → ~22 s). Lower = slower.
 *   text      true   in-canvas typography (statements, slogan, chips, flash cards). false = ambient field only.
 *   hud       true   corner labels, timecode, chapter line, progress rule.
 *   lockup    true   closing wordmark lockup (두레서울 / WE ENGINEER SERENDIPITY.).
 *   contact   true   e-mail line inside the lockup.
 *   fit       'contain' | 'cover'   how the 16:9 composition fills the container.
 *   loop      'idle' | 'hold' | 'restart'   what happens after the timeline: keep matching forever, freeze, or restart.
 *   particles 9400   dot count (1 dot = 1,000 people). Lower on weak devices.
 *   autoplay  true
 *   maxScale  2      cap on device-pixel resolution (1.5 is plenty for a background).
 *   grain     true   film grain pass. false saves a full-screen fill per frame.
 *   ink / paper      hex overrides for the background and dot colours (e.g. ink:'#000000' to match a pure-black site).
 *   reducedMotion 'auto' | 'ignore'   'auto' shows a still frame when the OS asks for reduced motion.
 *
 * Weight: this file alone. With text/hud/lockup all false nothing is drawn as type,
 * so no web fonts are requested and no video file is needed.
 */
(function(global){
'use strict';
const W=1920,H=1080,FPS=60,INT_DUR=15;
const C={ink:'#0A0B0E',paper:'#F1ECE2',paperDim:'rgba(241,236,226,0.62)',mute:'#9AA0AB',A:'#E8542E',B:'#4C8DFF'};
const F={
  disp:'"Archivo Black", Impact, "Arial Black", sans-serif',
  mono:'"IBM Plex Mono", ui-monospace, Menlo, monospace',
  kr:'"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  krs:'"Noto Serif KR", "Apple Myungjo", "Nanum Myeongjo", serif'
};
const FONT_CSS='https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;700;900&family=Noto+Serif+KR:wght@900&display=swap';

// ---------- math ----------
const clamp01=v=>v<0?0:v>1?1:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const E={
  outExpo:t=>t>=1?1:1-Math.pow(2,-10*t),
  inExpo:t=>t<=0?0:Math.pow(2,10*(t-1)),
  outQuint:t=>1-Math.pow(1-t,5),
  inOutCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  inCubic:t=>t*t*t,
  outCubic:t=>1-Math.pow(1-t,3),
  outBack:t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)},
  outBackSoft:t=>{const c1=0.8,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)},
};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3)|0;n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return(n>>>0)/4294967296}
const pad=(n,w)=>String(n).padStart(w,'0');
function tc(frame){const f=frame%FPS,s=Math.floor(frame/FPS)%60,m=Math.floor(frame/FPS/60)%60,h=Math.floor(frame/FPS/3600);return `${pad(h,2)}:${pad(m,2)}:${pad(s,2)}:${pad(f,2)}`}
function hexToRgb(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]}
const INK_RGB=hexToRgb(C.ink),PAPER_RGB=hexToRgb(C.paper);
const mix=(a,b,k)=>`rgb(${Math.round(a[0]+(b[0]-a[0])*k)},${Math.round(a[1]+(b[1]-a[1])*k)},${Math.round(a[2]+(b[2]-a[2])*k)})`;

// ---------- Seoul model (shared per particle count) ----------
// Districts as gaussian clusters; the Han river is a channel the dots keep clear of.
const CL=[
  [900,380,150,85,1.1],[620,420,120,80,.8],[930,505,120,45,.5],[1250,515,120,60,.7],[1000,210,190,80,.6],
  [1320,300,150,80,.6],[560,240,120,70,.4],[250,620,120,80,.5],[1250,800,170,90,1.3],[1550,780,130,80,.8],
  [1750,700,110,80,.5],[560,730,160,80,.8],[850,820,140,70,.6],[1000,975,240,45,.25],[1500,150,160,60,.3],
];
const RIVER_CTRL=[[2000,540],[1650,610],[1350,650],[1050,600],[750,560],[450,530],[150,460],[-80,400]];
function catmull(pts,per){
  const out=[];
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    for(let k=0;k<per;k++){const t=k/per,t2=t*t,t3=t2*t;
      out.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}
  }
  out.push(pts[pts.length-1]);return out;
}
const RIVER=catmull(RIVER_CTRL,12);
function riverNearest(x,y){let bi=0,bd=1e18;for(let i=0;i<RIVER.length;i++){const dx=RIVER[i][0]-x,dy=RIVER[i][1]-y,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=i;}}return {x:RIVER[bi][0],y:RIVER[bi][1],d:Math.sqrt(bd)}}

const MODELS=new Map();
function model(N){
  if(MODELS.has(N))return MODELS.get(N);
  const m={N,stag:new Float32Array(N),nx:new Float32Array(N),ny:new Float32Array(N),cx:new Float32Array(N),cy:new Float32Array(N),shocks:[],slogan:null};
  const {stag,nx,ny,cx,cy}=m;
  const r=mulberry(20260914);
  const gauss=()=>{let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const totalW=CL.reduce((a,c)=>a+c[4],0);
  for(let i=0;i<N;i++){
    stag[i]=i===0?0:r();
    nx[i]=-60+r()*(W+120);ny[i]=-60+r()*(H+120);
    let w=r()*totalW,k=0;while(w>CL[k][4]){w-=CL[k][4];k++;}
    const c=CL[k];let x=c[0]+gauss()*c[2],y=c[1]+gauss()*c[3];
    const rp=riverNearest(x,y);
    if(rp.d<58){const push=58+r()*40;const dx=x-rp.x,dy=y-rp.y;const d=Math.hypot(dx,dy)||1;x=rp.x+dx/d*push;y=rp.y+dy/d*push;}
    cx[i]=x;cy[i]=y;
  }
  // matching: two real nodes, a jagged search path, a cascade of pairs, and pairs for the idle field
  const nearest=(x,y)=>{let b=-1,bd=1e18;for(let i=0;i<N;i++){const d=(cx[i]-x)**2+(cy[i]-y)**2;if(d<bd){bd=d;b=i;}}return b};
  m.nodeA=nearest(430,640);m.nodeB=nearest(1500,430);
  const A={x:cx[m.nodeA],y:cy[m.nodeA]},B={x:cx[m.nodeB],y:cy[m.nodeB]};
  const r2=mulberry(4242);const path=[A];let cur=A,guard=0;
  while(Math.hypot(B.x-cur.x,B.y-cur.y)>110&&guard++<60){
    const dcur=Math.hypot(B.x-cur.x,B.y-cur.y);const cands=[];
    for(let i=0;i<N;i++){const dx=cx[i]-cur.x,dy=cy[i]-cur.y;const dd=dx*dx+dy*dy;if(dd<45*45||dd>175*175)continue;if(Math.hypot(B.x-cx[i],B.y-cy[i])<dcur-30)cands.push(i);}
    if(!cands.length)break;
    const i=cands[Math.floor(r2()*cands.length)];cur={x:cx[i],y:cy[i]};path.push(cur);
  }
  path.push(B);m.path=path;
  m.pairs=[];let tries=0;
  while(m.pairs.length<72&&tries++<8000){const a=Math.floor(r2()*N),b=Math.floor(r2()*N);const d=Math.hypot(cx[a]-cx[b],cy[a]-cy[b]);if(d<120||d>420)continue;m.pairs.push({a,b,t0:8.0+m.pairs.length*0.012,tint:m.pairs.length%2?C.B:C.A});}
  m.idle=[];tries=0;const r3=mulberry(777);
  while(m.idle.length<64&&tries++<40000){const a=Math.floor(r3()*N),b=Math.floor(r3()*N);const d=Math.hypot(cx[a]-cx[b],cy[a]-cy[b]);if(d<200||d>560)continue;
    const ok=i=>cx[i]>720||cy[i]<540;if(!ok(a)||!ok(b))continue;m.idle.push({a,b,d});}
  m.shocks.push({t:7.9,x:(A.x+B.x)/2,y:(A.y+B.y)/2,speed:2200,w:120,amp:34,dur:0.6});
  for(const t of [11.0,11.45,11.9])m.shocks.push({t,x:960,y:540,speed:3200,w:220,amp:55,dur:0.45});
  m.shocks.push({t:12.3,x:960,y:540,speed:2600,w:200,amp:40,dur:0.6});
  m.layout=function(c,withFonts){
    if(m.slogan&&(m.slogan.withFonts||!withFonts))return;
    m.shocks=m.shocks.filter(s=>!s.slogan);
    c.font=`100px ${F.disp}`;
    const wS=c.measureText('SERENDIPITY.').width,wWE=c.measureText('WE ENGINEER').width;
    const size=Math.min(300,Math.floor(1728/Math.max(wS,wWE)*100));
    const L1=Math.round(548-0.12*size),L2=Math.round(L1+1.03*size);
    c.font=`${size}px ${F.disp}`;
    const xENG=96+c.measureText('WE ').width;
    const wWE2=c.measureText('WE').width,wENG=c.measureText('ENGINEER').width,wSER=c.measureText('SERENDIPITY.').width;
    m.slogan={size,L1,L2,xENG,withFonts:!!withFonts};
    m.shocks.push({t:4.0,x:96+wWE2/2,y:L1-size*0.36,speed:2400,w:150,amp:110,dur:0.8,slogan:true});
    m.shocks.push({t:4.5,x:xENG+wENG/2,y:L1-size*0.36,speed:2400,w:150,amp:110,dur:0.8,slogan:true});
    m.shocks.push({t:5.0,x:96+wSER/2,y:L2-size*0.36,speed:2600,w:170,amp:130,dur:0.9,slogan:true});
  };
  MODELS.set(N,m);return m;
}

// ---------- timeline facts ----------
const SHAKES=[[0.9,9],[4.0,16],[4.5,16],[5.0,19],[7.9,7],[11.0,12],[11.45,12],[11.9,12],[12.3,8]];
function shakeAt(t,frame){let x=0,y=0;for(const [t0,a] of SHAKES){const age=t-t0;if(age>=0&&age<0.4){const k=a*Math.exp(-age*12);x+=(hash(frame*3+1)-.5)*2*k;y+=(hash(frame*3+2)-.5)*2*k;}}return {x,y}}
const BLOCKS=[64,48,32,24,16,12,8,6,4,3,2];
function blockAt(t){if(t<9.2||t>=10.5)return 1;const p=seg(t,9.2,10.5);return BLOCKS[Math.min(BLOCKS.length-1,Math.floor(Math.pow(p,1.35)*BLOCKS.length))]}
function cardAt(t){if(t>=11.0&&t<11.45)return 0;if(t>=11.45&&t<11.9)return 1;if(t>=11.9&&t<12.3)return 2;return -1}
const ramp=(t,t0)=>seg(t,t0-0.015,t0+0.045);
function inv01(t){return clamp01(ramp(t,11.0)-ramp(t,11.45)+ramp(t,11.9)-ramp(t,12.3))}
function partAlpha(t){
  if(t<2.6)return lerp(0.95,0.62,seg(t,1.2,2.6));
  if(t<4.0)return 0.62;if(t<6.5)return 0.42;if(t<9.2)return 0.15;if(t<11.0)return 0.42;if(t<12.3)return 0.34;
  return lerp(0.36,0.55,seg(t,12.3,13.6));
}
function partSize(t){if(t<2.6)return 2.4;if(t<12.3)return 2.0;return lerp(2.0,2.2,seg(t,12.3,13.6))}
const CHAPTERS=[
  {t0:0,   name:'00 Seoul',            label:()=>'00  —  SEOUL, 1 NODE'},
  {t0:0.9, name:'01 Critical mass',    label:()=>'01  —  CRITICAL MASS · 9,400,000 NODES'},
  {t0:2.6, name:'02 Density',          label:()=>'02  —  DENSITY · 15,532 / km²'},
  {t0:4.0, name:'03 Slogan',           label:()=>'03  —  WE ENGINEER SERENDIPITY.'},
  {t0:6.5, name:'04 Matching',         label:()=>'04  —  HUMAN-TO-HUMAN MATCHING'},
  {t0:9.2, name:'05 Resolution',       label:t=>`05  —  RESOLUTION  ${String(blockAt(t)).padStart(2,' ')} px`},
  {t0:11.0,name:'06 Beyond automation',label:()=>'06  —  BEYOND AUTOMATION'},
  {t0:12.3,name:'07 Dure Seoul',       label:()=>'07  —  DURE SEOUL · SERENDIPITY, ONGOING'},
];
function chapterAt(t){let ch=CHAPTERS[0],i=0;for(let k=0;k<CHAPTERS.length;k++)if(t>=CHAPTERS[k].t0){ch=CHAPTERS[k];i=k;}return {ch,i}}

// ---------- text helpers ----------
function riseWords(c,text,x,y,font,size,color,t,t0,o={}){
  const stagger=o.stagger??0.08,dur=o.dur??0.45,align=o.align??'left';
  c.save();c.font=font;c.textBaseline='alphabetic';c.textAlign='left';
  const words=text.split(' ');const sp=c.measureText(' ').width;
  const widths=words.map(w=>c.measureText(w).width);
  const total=widths.reduce((a,b)=>a+b,0)+sp*(words.length-1);
  let wx=align==='center'?x-total/2:align==='right'?x-total:x;
  const ga=c.globalAlpha;
  words.forEach((w,k)=>{
    const p=E.outQuint(seg(t,t0+k*stagger,t0+k*stagger+dur));
    if(p>0){c.save();c.beginPath();c.rect(wx-6,y-size*0.98,widths[k]+12,size*1.3);c.clip();
      c.globalAlpha=ga*Math.min(1,p*2.2);c.fillStyle=color;c.fillText(w,wx,y+(1-p)*size*1.15);c.restore();}
    wx+=widths[k]+sp;
  });
  c.restore();
}
function slamRuns(c,runs,x,y,size,t,t0){
  const age=t-t0;if(age<0)return;
  c.save();c.textBaseline='alphabetic';c.textAlign='left';
  let total=0;for(const r of runs){c.font=r.font;total+=c.measureText(r.text).width;}
  const p=E.outExpo(seg(age,0,0.22));const sc=lerp(2.4,1,p);
  let sx=1,sy=1;
  if(age>0.17){const a=age-0.17;const k=Math.exp(-a*13)*Math.cos(a*38);sy=1-0.2*k;sx=1+0.1*k;}
  const cxx=x+total/2,cyy=y-size*0.36;const ga=c.globalAlpha;
  const draw=(scale,alpha)=>{
    c.save();c.translate(cxx,cyy);c.scale(scale*sx,scale*sy);c.globalAlpha=alpha;
    let rx=-total/2;for(const r of runs){c.font=r.font;c.fillStyle=r.color;c.fillText(r.text,rx,size*0.36);rx+=c.measureText(r.text).width;}
    c.restore();
  };
  if(p<1){for(let g=1;g<=3;g++)draw(sc*(1+g*0.09),ga*0.12*(1-p));}
  draw(sc,ga*Math.min(1,age*12));
  c.restore();
}
function odometer(c,value,x,y,size,color){
  c.save();c.font=`${size}px ${F.disp}`;c.textBaseline='alphabetic';c.textAlign='center';c.fillStyle=color;
  const dw=c.measureText('0').width*1.04,cw=c.measureText(',').width*1.1;
  const total=7*dw+2*cw;let xx=x-total/2;
  const cellH=size*1.0,yb=y+size*0.37;
  for(let pos=6;pos>=0;pos--){
    // each drum rests for 65% of its cycle, then flips: readable digits, quick rolls
    const v=value/Math.pow(10,pos);const col=v%10;const d=Math.floor(col);const f0=col-d;const f=f0<0.65?0:E.inOutCubic((f0-0.65)/0.35);
    c.save();c.beginPath();c.rect(xx,y-cellH/2,dw,cellH);c.clip();
    c.fillText(String(d),xx+dw/2,yb-f*cellH);c.fillText(String((d+1)%10),xx+dw/2,yb+(1-f)*cellH);
    c.restore();xx+=dw;
    if(pos===6||pos===3){c.fillText(',',xx+cw/2,yb);xx+=cw;}
  }
  c.restore();
}
const GLYPHS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/·';
function decode(text,p,seedBase,frame){
  if(p>=1)return text;let out='';
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch===' '||ch==='—'||ch==='·'){out+=ch;continue;}
    const th=(i/text.length)*0.65;const local=(p-th)/0.35;
    const g=GLYPHS[Math.floor(hash(seedBase*977+i*13+frame*7)*GLYPHS.length)];
    if(local>=1)out+=ch;else if(local<=0)out+=g;else out+=hash(seedBase*31+i*7+frame*3)<local?ch:g;}
  return out;
}
function ring(c,x,y,r,alpha,color,lw=1.5){if(alpha<=0||r<=0)return;c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=lw;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();}
function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function typed(c,text,x,y,p){const n=Math.floor(p*text.length);if(n>0)c.fillText(text.slice(0,n),x,y);return n}

// ---------- fonts ----------
let fontsPromise=null;
const KR_ALL='사람이 많다고 만남이 생기지는 않습니다. 940만 명 성수동 · 카페 창업 준비 중 필요 — 폐업을 겪어본 사람의 판단 망원동 · 폐업 3회, 재기 1회 보유 — 상권 실패 경험 11년 우연처럼 보이지만, 필연입니다. 사람과 사람 사이의 해상도를 높입니다. 범용은 자동화되고, 구체는 비싸진다. 두레서울';
function ensureFonts(){
  if(fontsPromise)return fontsPromise;
  if(!document.querySelector('link[href*="fonts.googleapis.com"][href*="Archivo+Black"]')){
    const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_CSS;document.head.appendChild(l);
  }
  const specs=[
    ['400 20px "IBM Plex Mono"','DURESEOUL INC. TC 0123456789 F / km² ° N E @gmail.com MATCH'],
    ['500 30px "IBM Plex Mono"','DURE SEOUL'],
    ['100px "Archivo Black"','WE ENGINEER SERENDIPITY. 0123456789, INTELLIGENCE AMPLIFIES THE SPECIFIC'],
    ['900 100px "Noto Sans KR"',KR_ALL],['700 30px "Noto Sans KR"',KR_ALL],['400 26px "Noto Sans KR"',KR_ALL],
    ['900 116px "Noto Serif KR"','두레서울'],
  ];
  const all=Promise.all(specs.map(([f,txt])=>document.fonts.load(f,txt).catch(()=>null))).then(()=>document.fonts.ready);
  fontsPromise=Promise.race([all,new Promise(r=>setTimeout(r,9000))]);
  return fontsPromise;
}

// ---------- sound ----------
function buildCues(){
  const c=[];const add=(t,k,o={})=>c.push({t,k,...o});
  for(let i=0;i<34;i++)add(0.05+i*0.022,'tick',{g:.18,f:7000});
  add(0.12,'blip',{f:1320,g:.5});
  add(0.9,'boom',{g:1});add(0.9,'whoosh',{d:0.9,g:.9});
  for(let i=0;i<20;i++)add(1.0+i*0.05,'tick',{g:.3,f:2500+i*120});
  add(2.1,'snap',{g:1});add(2.1,'boom',{g:.5});
  add(2.5,'whoosh',{d:0.3,g:.45});
  add(2.65,'whoosh',{d:1.3,g:.55});
  for(const t0 of [2.75,2.84,3.05,3.14,3.23])add(t0,'tick',{g:.35,f:4000});
  add(3.8,'whoosh',{d:0.25,g:.4});
  add(4.0,'slam',{g:1});add(4.5,'slam',{g:1});add(5.0,'slam',{g:1.15});add(5.0,'blip',{f:1760,g:.35});
  add(6.1,'whoosh',{d:0.45,g:.5});
  add(6.55,'blip',{f:660,g:.7});add(6.85,'blip',{f:990,g:.7});
  for(let i=0;i<24;i++)add(7.0+i*0.035,'tick',{g:.55,f:1800+i*90});
  add(7.9,'snap',{g:1.1});add(7.9,'boom',{g:.7});
  for(let i=0;i<72;i++)add(8.0+i*0.012,'tick',{g:.28,f:2600+hash(i*3)*3500});
  for(const t0 of [8.15,8.24,8.33])add(t0,'tick',{g:.3,f:4000});
  add(9.2,'glitch',{d:0.3,g:1});
  let last=1;for(let f=Math.floor(9.2*FPS);f<=10.5*FPS;f++){const t=f/FPS;const b=blockAt(t);if(b!==last){last=b;add(t,'tick',{g:.5,f:500+(64-b)*70});}}
  add(10.85,'whoosh',{d:0.22,g:.4});
  add(11.0,'slam',{g:.9});add(11.45,'slam',{g:.9});add(11.9,'slam',{g:.95});
  add(12.3,'boom',{g:.8});add(12.3,'whoosh',{d:1.4,g:.6});
  add(12.85,'whoosh',{d:.5,g:.3});add(12.9,'blip',{f:523.25,g:.4});add(13.15,'blip',{f:659.25,g:.3});
  for(let i=0;i<36;i++)add(13.35+i*0.0153,'tick',{g:.3,f:5200});
  return c.sort((a,b)=>a.t-b.t);
}
const CUES=buildCues();
function droneLevel(t){
  if(t<2.6)return 0;
  if(t<5)return 0.6*seg(t,2.6,5);
  if(t<12.3)return 0.6+0.35*seg(t,9,12.3);
  if(t<13.3)return 0.95-0.6*seg(t,12.3,13.3);
  return 0.35;
}
function droneCut(t){if(t<12.3)return 150+950*E.inCubic(seg(t,6.5,12.3));return 150+60*(1-seg(t,12.3,13.3))}
function makeSynth(actx){
  const master=actx.createGain();master.gain.value=0.9;
  const comp=actx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=8;comp.attack.value=0.002;comp.release.value=0.12;comp.knee.value=6;
  master.connect(comp);comp.connect(actx.destination);
  const nb=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate);{const d=nb.getChannelData(0);const r=mulberry(7);for(let i=0;i<d.length;i++)d[i]=r()*2-1;}
  function noise(when,dur,o){
    const s=actx.createBufferSource();s.buffer=nb;s.loop=true;
    const flt=actx.createBiquadFilter();flt.type=o.type||'bandpass';flt.Q.value=o.q??1;
    flt.frequency.setValueAtTime(Math.max(20,o.f0??1000),when);
    if(o.f1!==undefined&&o.f1!==o.f0)flt.frequency.exponentialRampToValueAtTime(Math.max(20,o.f1),when+dur);
    const gn=actx.createGain();const a=Math.min(o.a??0.004,dur*0.5);
    gn.gain.setValueAtTime(0.0001,when);gn.gain.exponentialRampToValueAtTime(Math.max(0.0002,o.g??0.5),when+a);gn.gain.exponentialRampToValueAtTime(0.0001,when+dur);
    s.connect(flt);flt.connect(gn);gn.connect(master);
    s.start(when,hash(Math.floor(when*1000))*1.5);s.stop(when+dur+0.05);
  }
  function tone(when,dur,o){
    const osc=actx.createOscillator();osc.type=o.type||'sine';
    osc.frequency.setValueAtTime(o.f0??100,when);
    if(o.f1!==undefined&&o.f1!==o.f0)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f1),when+dur*0.6);
    const gn=actx.createGain();const a=Math.min(o.a??0.003,dur*0.5);
    gn.gain.setValueAtTime(0.0001,when);gn.gain.exponentialRampToValueAtTime(Math.max(0.0002,o.g??0.5),when+a);gn.gain.exponentialRampToValueAtTime(0.0001,when+dur);
    osc.connect(gn);gn.connect(master);osc.start(when);osc.stop(when+dur+0.05);
  }
  const G=o=>o.g??1;
  const fx={
    boom:(w,o={})=>{tone(w,0.75,{f0:160,f1:36,g:0.9*G(o)});noise(w,0.4,{type:'lowpass',f0:700,f1:60,g:0.45*G(o)});},
    slam:(w,o={})=>{tone(w,0.55,{f0:240,f1:40,g:1.0*G(o)});noise(w,0.05,{type:'highpass',f0:1500,g:0.55*G(o),a:0.001});noise(w,0.45,{type:'lowpass',f0:1100,f1:90,g:0.5*G(o)});},
    snap:(w,o={})=>{noise(w,0.06,{type:'bandpass',f0:3200,q:1.4,g:0.8*G(o),a:0.001});tone(w,0.09,{f0:2000,f1:380,g:0.22*G(o)});},
    blip:(w,o={})=>{const f=o.f??880;tone(w,0.16,{f0:f,f1:f*0.985,g:0.26*G(o),a:0.003});},
    tick:(w,o={})=>{noise(w,0.022,{type:'highpass',f0:o.f??6000,g:0.22*G(o),a:0.001});},
    whoosh:(w,o={})=>{const d=o.d??0.6;noise(w,d,{type:'bandpass',f0:180,f1:4200,q:0.9,g:0.3*G(o),a:d*0.55});},
    glitch:(w,o={})=>{const d=o.d??0.25;for(let i=0;i<8;i++)noise(w+i*d/8,d/8*0.6,{type:'bandpass',f0:700+hash(i*7+1)*3200,q:3,g:0.32*G(o),a:0.001});},
  };
  const dr1=actx.createOscillator();dr1.type='sine';dr1.frequency.value=55;
  const dr2=actx.createOscillator();dr2.type='triangle';dr2.frequency.value=82.41;dr2.detune.value=5;
  const dr3=actx.createOscillator();dr3.type='sawtooth';dr3.frequency.value=110;dr3.detune.value=-7;
  const g3=actx.createGain();g3.gain.value=0.25;
  const dflt=actx.createBiquadFilter();dflt.type='lowpass';dflt.frequency.value=150;dflt.Q.value=0.8;
  const dgain=actx.createGain();dgain.gain.value=0;
  dr1.connect(dflt);dr2.connect(dflt);dr3.connect(g3);g3.connect(dflt);dflt.connect(dgain);dgain.connect(master);
  dr1.start();dr2.start();dr3.start();
  return {fx,dgain,dflt,master};
}
const DRONE_GAIN=0.16;
function wavBase64(buf){
  const n=buf.length,ch=buf.numberOfChannels,sr=buf.sampleRate;const bytes=44+n*ch*2;
  const ab=new ArrayBuffer(bytes);const v=new DataView(ab);const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,bytes-8,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*ch*2,true);
  const chans=[];for(let c=0;c<ch;c++)chans.push(buf.getChannelData(c));
  let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,chans[c][i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2;}
  const u8=new Uint8Array(ab);let bin='';for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
  return btoa(bin);
}

// grain tile (device pixels)
const grainTile=document.createElement('canvas');grainTile.width=grainTile.height=256;
(()=>{const g=grainTile.getContext('2d');const im=g.createImageData(256,256);const r=mulberry(77);for(let i=0;i<im.data.length;i+=4){const v=Math.floor(r()*255);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}g.putImageData(im,0,0);})();

// ---------- mount ----------
function mount(container,opts={}){
  const o=Object.assign({speed:15/22,text:true,hud:true,lockup:true,contact:true,fit:'contain',loop:'idle',particles:9400,autoplay:true,maxScale:2,grain:true,reducedMotion:'auto'},opts);
  const SPEED=o.speed,END=INT_DUR/SPEED;
  const MATCH_START=13.3/SPEED,MATCH_PERIOD=3.2;
  const INK=o.ink?hexToRgb(o.ink):INK_RGB,PAPER=o.paper?hexToRgb(o.paper):PAPER_RGB;
  const m=model(o.particles);const N=m.N,{stag,nx,ny,cx,cy}=m;
  const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:100%';
  canvas.setAttribute('aria-label','두레서울 모션그래픽');container.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:false});
  const scene=document.createElement('canvas');const sctx=scene.getContext('2d',{alpha:false});
  const tmp=document.createElement('canvas');const tctx=tmp.getContext('2d');
  const small=document.createElement('canvas');const smctx=small.getContext('2d');
  let dpr=1,S=1,view={scale:1,ox:0,oy:0},cw=W,ch=H,grainPat=null;
  function resize(){
    const r=container.getBoundingClientRect();cw=Math.max(2,Math.round(r.width))||W;ch=Math.max(2,Math.round(r.height))||H;
    dpr=Math.min(o.maxScale,window.devicePixelRatio||1);
    view.scale=o.fit==='cover'?Math.max(cw/W,ch/H):Math.min(cw/W,ch/H);
    view.ox=(cw-W*view.scale)/2;view.oy=(ch-H*view.scale)/2;
    canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
    S=Math.min(o.maxScale,view.scale*dpr);
    scene.width=tmp.width=Math.round(W*S);scene.height=tmp.height=Math.round(H*S);
    grainPat=null;
  }
  resize();

  // ---- particles ----
  let px=0,py=0;
  function posAt(t,i){
    const s=stag[i];const b0=0.9+s*0.3;let x,y;
    if(t<=b0){x=960;y=540;}
    else{const p=E.outBackSoft(seg(t,b0,b0+0.75));x=960+(nx[i]-960)*p;y=540+(ny[i]-540)*p;}
    const o0=2.6+s*0.35;if(t>o0){const p=E.inOutCubic(seg(t,o0,o0+0.95));x+=(cx[i]-x)*p;y+=(cy[i]-y)*p;}
    const sh=m.shocks;
    for(let k=0;k<sh.length;k++){const ev=sh[k];const age=t-ev.t;if(age<=0||age>=ev.dur)continue;
      const dx=x-ev.x,dy=y-ev.y;const d=Math.sqrt(dx*dx+dy*dy)+0.001;const R=age*ev.speed;const dd=(d-R)/ev.w;const g=Math.exp(-0.5*dd*dd);const amp=ev.amp*(1-age/ev.dur);x+=dx/d*g*amp;y+=dy/d*g*amp;}
    if(t>12.3){const z=lerp(1.10,1,E.inOutCubic(seg(t,12.3,13.6)));x=960+(x-960)*z;y=540+(y-540)*z;}
    x+=Math.sin(t*1.3+i*0.37)*0.7;y+=Math.cos(t*1.1+i*0.53)*0.7;
    px=x;py=y;
  }
  function drawParticles(c,t,FG){
    const a=partAlpha(t),s=partSize(t),h=s/2,dt=SPEED/FPS;
    c.save();c.globalAlpha=a;c.fillStyle=FG;c.strokeStyle=FG;c.lineWidth=Math.max(1.3,s*0.8);c.lineCap='round';
    let lines=0;c.beginPath();
    for(let i=0;i<N;i++){
      if(t<=0.9+stag[i]*0.3)continue;
      posAt(t,i);const x1=px,y1=py;posAt(t-dt,i);const x0=px,y0=py;
      const dx=x1-x0,dy=y1-y0;
      if(dx*dx+dy*dy>5){c.moveTo(x0,y0);c.lineTo(x1,y1);lines++;}else c.fillRect(x1-h,y1-h,s,s);
    }
    if(lines)c.stroke();
    c.restore();
  }
  function sliceWipe(c,drawFn,region,p,K=12,seed=1){
    if(p<=0){drawFn(c);return;}
    if(p>=1)return;
    tctx.setTransform(S,0,0,S,0,0);tctx.clearRect(0,0,W,H);drawFn(tctx);
    const hs=region.h/K;const ga=c.globalAlpha;
    for(let k=0;k<K;k++){
      const dir=k%2?1:-1;const spd=0.55+hash(seed*131+k*17)*0.9;const off=dir*E.inCubic(p)*W*1.15*spd;
      c.globalAlpha=ga*(1-E.inExpo(p));const sy=region.y+k*hs;
      c.drawImage(tmp,region.x*S,sy*S,region.w*S,hs*S,region.x+off,sy,region.w,hs);
    }
    c.globalAlpha=ga;
  }

  // ---- chapters ----
  function drawIntro(c,t){
    const a=1-seg(t,0.86,0.98);if(a<=0)return;
    c.save();c.globalAlpha=a;
    const pop=E.outBack(seg(t,0.08,0.3));if(pop>0)dot(c,960,540,4*pop,C.paper);
    const rp=seg(t,0.2,0.85);if(rp>0&&rp<1)ring(c,960,540,10+rp*90,1-rp,C.paper,1.5);
    if(o.text){const lbl='NODE 0000001 / 9400000';c.font=`400 20px ${F.mono}`;c.letterSpacing='3px';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle=C.paperDim;typed(c,lbl,960,602,seg(t,0.3,0.7));c.letterSpacing='0px';}
    c.restore();
  }
  function drawCounter(c,t){
    if(t<2.1){
      const v=9400000*E.outCubic(seg(t,0.9,2.0));let sy=1;if(t>2.02)sy=1-seg(t,2.02,2.1);
      c.save();c.globalAlpha=seg(t,0.9,1.0);c.translate(960,540);c.scale(1,Math.max(0.001,sy));odometer(c,v,0,0,236,C.paper);c.restore();
      c.save();c.globalAlpha=seg(t,1.25,1.55)*(1-seg(t,2.0,2.08));c.font=`400 21px ${F.mono}`;c.letterSpacing='4px';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle=C.paperDim;
      c.fillText('NODES · SEOUL METROPOLITAN CITY',960,706);c.fillText('1 DOT = 1,000 PEOPLE',960,742);c.letterSpacing='0px';c.restore();
    }else{
      const drawBig=(cc)=>{
        const p=E.outExpo(seg(t,2.1,2.32));const sc=lerp(1.32,1,p);
        cc.save();cc.translate(960,560);cc.scale(sc,sc);cc.textBaseline='alphabetic';cc.textAlign='left';
        const runs=[{text:'940',font:`300px ${F.disp}`},{text:'만',font:`900 300px ${F.kr}`},{text:' 명',font:`700 132px ${F.kr}`}];
        let total=0;for(const r of runs){cc.font=r.font;total+=cc.measureText(r.text).width;}
        let rx=-total/2;cc.fillStyle=C.paper;for(const r of runs){cc.font=r.font;cc.fillText(r.text,rx,100);rx+=cc.measureText(r.text).width;}
        cc.restore();
      };
      sliceWipe(c,drawBig,{x:200,y:300,w:1520,h:420},seg(t,2.5,2.64),8,3);
    }
  }
  function drawStatement(c,t){
    const fn=(cc)=>{
      riseWords(cc,'사람이 많다고',96,720,`900 108px ${F.kr}`,108,C.paper,t,2.75,{stagger:.09,dur:.5});
      riseWords(cc,'만남이 생기지는 않습니다.',96,850,`900 108px ${F.kr}`,108,C.paper,t,3.05,{stagger:.09,dur:.5});
    };
    sliceWipe(c,fn,{x:60,y:600,w:1560,h:300},seg(t,3.8,3.96),12,5);
  }
  function drawSlogan(c,t){
    const sl=m.slogan;if(!sl)return;const s=sl.size;const fnt=`${s}px ${F.disp}`;
    const fn=(cc)=>{
      slamRuns(cc,[{text:'WE',font:fnt,color:C.paper}],96,sl.L1,s,t,4.0);
      slamRuns(cc,[{text:'ENGINEER',font:fnt,color:C.paper}],sl.xENG,sl.L1,s,t,4.5);
      slamRuns(cc,[{text:'SERENDIPITY',font:fnt,color:C.paper},{text:'.',font:fnt,color:C.A}],96,sl.L2,s,t,5.0);
      const a=seg(t,5.55,5.85);
      if(a>0){cc.save();cc.globalAlpha*=a;cc.font=`400 21px ${F.mono}`;cc.letterSpacing='5px';cc.fillStyle=C.paperDim;cc.textAlign='left';cc.textBaseline='alphabetic';
        typed(cc,'— DURE SEOUL · A SOFTWARE STUDIO · EST. 2026',100,sl.L2+72,seg(t,5.55,5.95));cc.letterSpacing='0px';cc.restore();}
    };
    sliceWipe(c,fn,{x:40,y:sl.L1-s,w:1840,h:sl.L2-sl.L1+s+110},seg(t,6.1,6.4),16,7);
  }
  function chip(c,node,t,t0,side,color,title,sub){
    const p=E.outBack(seg(t,t0,t0+0.4));if(p<=0)return;
    const {x,y}=node;const ex=x+side*90,ey=y-92;
    c.save();c.globalAlpha*=Math.min(1,p*1.6);c.strokeStyle=color;c.lineWidth=2;
    const q=Math.min(1,p*1.2);c.beginPath();c.moveTo(x,y);c.lineTo(x+(ex-x)*q,y+(ey-y)*q);c.stroke();
    c.textBaseline='alphabetic';c.textAlign='left';
    c.font=`700 30px ${F.kr}`;const wt=c.measureText(title).width;
    c.font=`400 19px ${F.kr}`;const ws=c.measureText(sub).width;
    const bw=Math.max(wt,ws)+56,bh=106;const bx=side>0?ex:ex-bw;const by=ey-bh/2;const ax=side>0?bx:bx+bw;
    c.translate(ax,ey);c.scale(p,p);c.translate(-ax,-ey);
    c.fillStyle=C.ink;c.fillRect(bx,by,bw,bh);c.strokeRect(bx+1,by+1,bw-2,bh-2);
    c.fillStyle=color;c.fillRect(side>0?bx:bx+bw-7,by,7,bh);
    c.fillStyle=C.paper;c.font=`700 30px ${F.kr}`;c.fillText(title,bx+30,by+44);
    c.fillStyle=color;c.font=`400 19px ${F.kr}`;c.fillText(sub,bx+30,by+80);
    c.restore();
  }
  function drawMatching(c,t){
    const fo=1-seg(t,9.3,9.7);if(fo<=0)return;
    c.save();c.globalAlpha=fo;
    const A={x:cx[m.nodeA],y:cy[m.nodeA]},B={x:cx[m.nodeB],y:cy[m.nodeB]};
    for(const pr of m.pairs){const p=seg(t,pr.t0,pr.t0+0.16);if(p<=0)continue;const e=E.outCubic(p);
      c.save();c.globalAlpha*=0.75;c.strokeStyle=pr.tint;c.lineWidth=1.5;c.beginPath();c.moveTo(cx[pr.a],cy[pr.a]);c.lineTo(lerp(cx[pr.a],cx[pr.b],e),lerp(cy[pr.a],cy[pr.b],e));c.stroke();
      dot(c,cx[pr.a],cy[pr.a],2.6,pr.tint);if(p>=1)dot(c,cx[pr.b],cy[pr.b],2.6,pr.tint);c.restore();}
    if(t>=7.0){
      const q0=seg(t,7.0,7.85);const snap=E.outExpo(seg(t,7.9,8.12));
      const ux=B.x-A.x,uy=B.y-A.y;const L=Math.hypot(ux,uy);const nxv=ux/L,nyv=uy/L;
      const V=m.path.map(v=>{const dx=v.x-A.x,dy=v.y-A.y;const d=dx*nxv+dy*nyv;return {x:lerp(v.x,A.x+nxv*d,snap),y:lerp(v.y,A.y+nyv*d,snap)}});
      const segs=V.length-1;const upto=q0*segs;const full=Math.floor(upto);
      c.save();
      if(t>7.9&&t<8.7){c.shadowColor=C.paper;c.shadowBlur=lerp(26,0,seg(t,7.9,8.7));}
      c.strokeStyle=C.paper;c.lineWidth=lerp(2,3.5,snap);c.lineJoin='round';c.lineCap='round';
      c.beginPath();c.moveTo(V[0].x,V[0].y);
      for(let k=1;k<=Math.min(full,segs);k++)c.lineTo(V[k].x,V[k].y);
      if(full<segs){const f=upto-full;c.lineTo(lerp(V[full].x,V[full+1].x,f),lerp(V[full].y,V[full+1].y,f));}
      c.stroke();c.restore();
      if(snap<1)for(let k=1;k<Math.min(full+1,segs);k++){const tk=7.0+(k/segs)*0.85;const age=t-tk;if(age<0||age>0.4)continue;ring(c,V[k].x,V[k].y,6+age*90,(1-age/0.4)*(1-snap),C.paper,1.2);}
      if(t>=7.9){const a=seg(t,7.9,8.45);ring(c,A.x,A.y,8+a*110,1-a,C.A,2);ring(c,B.x,B.y,8+a*110,1-a,C.B,2);
        if(t<8.03){c.save();c.globalAlpha*=0.28*(1-seg(t,7.9,8.03));c.fillStyle=C.paper;c.fillRect(-100,-100,W+200,H+200);c.restore();}}
    }
    const pa=E.outBack(seg(t,6.55,6.9)),pb=E.outBack(seg(t,6.85,7.2));
    if(pa>0){ring(c,A.x,A.y,10+seg(t,6.55,7.1)*80,1-seg(t,6.55,7.1),C.A,1.5);c.save();c.shadowColor=C.A;c.shadowBlur=18;dot(c,A.x,A.y,7*pa,C.A);c.restore();}
    if(pb>0){ring(c,B.x,B.y,10+seg(t,6.85,7.4)*80,1-seg(t,6.85,7.4),C.B,1.5);c.save();c.shadowColor=C.B;c.shadowBlur=18;dot(c,B.x,B.y,7*pb,C.B);c.restore();}
    if(o.text){
      chip(c,A,t,6.6,1,C.A,'성수동 · 카페 창업 준비 중','필요 — 폐업을 겪어본 사람의 판단');
      chip(c,B,t,6.9,-1,C.B,'망원동 · 폐업 3회, 재기 1회','보유 — 상권 실패 경험 11년');
      riseWords(c,'우연처럼 보이지만, 필연입니다.',960,938,`900 64px ${F.kr}`,64,C.paper,t,8.15,{align:'center',stagger:.09,dur:.45});
    }
    c.restore();
  }
  function drawResolution(c,t){
    const fn=(cc)=>{
      riseWords(cc,'사람과 사람 사이의',960,500,`900 124px ${F.kr}`,124,C.paper,t,9.35,{align:'center',stagger:.07,dur:.4});
      riseWords(cc,'해상도를 높입니다.',960,660,`900 124px ${F.kr}`,124,C.paper,t,9.55,{align:'center',stagger:.07,dur:.4});
    };
    sliceWipe(c,fn,{x:160,y:370,w:1600,h:340},seg(t,10.85,11.0),10,9);
  }
  function drawCards(c,t){
    const k=cardAt(t);if(k<0)return;
    const t0=[11.0,11.45,11.9][k];const age=t-t0;const sc=lerp(1.08,1,E.outExpo(seg(age,0,0.14)));
    c.save();c.translate(960,540);c.scale(sc,sc);c.textAlign='center';c.textBaseline='middle';
    if(k===0){c.font=`900 150px ${F.kr}`;c.fillStyle=C.ink;c.fillText('범용은 자동화되고,',0,0);}
    else if(k===1){c.font=`900 150px ${F.kr}`;const a='구체',b='는 비싸진다.';const wa=c.measureText(a).width,wb=c.measureText(b).width;const x0=-(wa+wb)/2;c.textAlign='left';
      c.fillStyle=C.A;c.fillText(a,x0,0);c.fillStyle=C.paper;c.fillText(b,x0+wa,0);}
    else{c.font=`108px ${F.disp}`;c.fillStyle=C.ink;c.fillText('INTELLIGENCE AMPLIFIES',0,-66);c.fillText('THE SPECIFIC.',0,66);}
    c.restore();
  }
  // 07 — the field settles; matches keep happening; a restrained lockup lower-left
  function drawMatches(c,tReal,ti){
    if(tReal<MATCH_START||!m.idle.length)return;
    const k0=Math.floor((tReal-MATCH_START)/MATCH_PERIOD);
    for(const k of [k0-1,k0]){
      if(k<0)continue;const u=tReal-(MATCH_START+k*MATCH_PERIOD);if(u<0||u>2.9)continue;
      const pr=m.idle[k%m.idle.length];const tint=k%2?C.B:C.A;
      posAt(ti,pr.a);const ax=px,ay=py;posAt(ti,pr.b);const bx=px,by=py;
      const draw=E.outCubic(seg(u,0,0.6));const fade=1-seg(u,1.8,2.9);
      c.save();c.globalAlpha*=fade;
      c.strokeStyle=tint;c.lineWidth=1.5;c.globalAlpha*=0.85;c.beginPath();c.moveTo(ax,ay);c.lineTo(lerp(ax,bx,draw),lerp(ay,by,draw));c.stroke();c.globalAlpha=fade;
      dot(c,ax,ay,3,tint);if(draw>=1)dot(c,bx,by,3,tint);
      if(u>0.6&&u<1.3){const a=seg(u,0.6,1.3);ring(c,ax,ay,6+a*80,1-a,tint,1.3);ring(c,bx,by,6+a*80,1-a,tint,1.3);}
      if(o.hud&&draw>=1){c.font=`400 16px ${F.mono}`;c.letterSpacing='2px';c.fillStyle=C.paperDim;c.textAlign='center';c.textBaseline='alphabetic';
        const mx=(ax+bx)/2,my=(ay+by)/2;const nx2=-(by-ay),ny2=(bx-ax);const nl=Math.hypot(nx2,ny2)||1;
        c.fillText(`MATCH · ${(pr.d*0.019).toFixed(1)} km`,mx+nx2/nl*16,my+ny2/nl*16+5);c.letterSpacing='0px';}
      c.restore();
    }
  }
  function drawLockup(c,ti){
    const X=96;c.save();c.textAlign='left';c.textBaseline='alphabetic';
    c.font=`900 116px ${F.krs}`;const wm=c.measureText('두레서울').width;
    const r=E.outQuint(seg(ti,12.85,13.3));if(r>0){c.globalAlpha=0.7;c.fillStyle=C.paper;c.fillRect(X,596,wm*r,1);c.globalAlpha=1;}
    const p=E.outQuint(seg(ti,12.9,13.45));
    if(p>0){c.save();c.beginPath();c.rect(X-4,600,(wm+8)*p,130);c.clip();c.fillStyle=C.paper;c.fillText('두레서울',X,712);c.restore();}
    const q=E.outQuint(seg(ti,13.15,13.65));
    if(q>0){c.save();c.font=`34px ${F.disp}`;c.letterSpacing='2px';const w=c.measureText('WE ENGINEER SERENDIPITY.').width;c.beginPath();c.rect(X-4,735,(w+10)*q,50);c.clip();c.fillStyle=C.paper;c.fillText('WE ENGINEER SERENDIPITY.',X,770);c.restore();}
    c.font=`400 19px ${F.mono}`;c.letterSpacing='4px';c.fillStyle=C.paperDim;
    typed(c,'DURE SEOUL · SOFTWARE STUDIO · SEOUL',X,816,seg(ti,13.35,13.9));
    if(o.contact){const s2='dureseoulofficial@gmail.com';const pp=seg(ti,13.7,14.25);const n=typed(c,s2,X,852,pp);
      if(n>0&&(pp<1||Math.floor(ti*2.5)%2===0)){const cw2=c.measureText(s2.slice(0,n)).width;c.fillRect(X+cw2+6,834,10,22);}}
    c.letterSpacing='0px';c.restore();
  }
  function hud(c,tReal,ti,frame,inv){
    const dim=mix([241,236,226],[10,11,14],inv);
    c.save();c.globalAlpha=0.68;c.fillStyle=dim;c.strokeStyle=dim;c.font=`400 19px ${F.mono}`;c.letterSpacing='2px';c.textBaseline='alphabetic';
    c.textAlign='left';typed(c,'DURESEOUL INC.',64,66,seg(ti,0.05,0.45));typed(c,'SEOUL — SOFTWARE STUDIO',64,92,seg(ti,0.3,0.8));
    c.textAlign='right';c.fillText('TC '+tc(frame),1856,66);c.fillText(`F ${pad(frame,4)}`,1856,92);
    const {ch,i}=chapterAt(ti);c.textAlign='left';c.fillText(decode(ch.label(ti),seg(ti,ch.t0,ch.t0+0.45),i+1,frame),64,1024);
    c.textAlign='right';c.fillText('37.5665° N   126.9780° E',1856,998);c.fillText('605.2 km²  ·  15,532 / km²',1856,1024);
    c.letterSpacing='0px';
    c.lineWidth=1;c.globalAlpha=0.5;const mg=40,l=22;
    c.beginPath();
    c.moveTo(mg,mg+l);c.lineTo(mg,mg);c.lineTo(mg+l,mg);c.moveTo(W-mg-l,mg);c.lineTo(W-mg,mg);c.lineTo(W-mg,mg+l);
    c.moveTo(mg,H-mg-l);c.lineTo(mg,H-mg);c.lineTo(mg+l,H-mg);c.moveTo(W-mg-l,H-mg);c.lineTo(W-mg,H-mg);c.lineTo(W-mg,H-mg-l);
    c.stroke();
    c.globalAlpha=0.7;c.fillStyle=mix(PAPER,INK,inv);c.fillRect(0,H-2,W*clamp01(tReal/END),2);
    c.restore();
  }
  function vignette(c,k){const g=c.createRadialGradient(960,540,420,960,540,1250);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${0.6*k})`);c.fillStyle=g;c.fillRect(0,0,W,H);}
  function grain(c,frame,onPaper){
    if(!grainPat)grainPat=c.createPattern(grainTile,'repeat');
    c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=onPaper?0.08:0.055;c.globalCompositeOperation=onPaper?'multiply':'screen';
    const ox=Math.floor(hash(frame*11+3)*256),oy=Math.floor(hash(frame*11+5)*256);
    c.translate(-ox,-oy);c.fillStyle=grainPat;c.fillRect(0,0,canvas.width+256,canvas.height+256);c.restore();
  }

  function renderAt(tReal){
    tReal=Math.max(0,tReal);
    const ti=Math.min(INT_DUR,tReal*SPEED);const frame=Math.round(tReal*FPS);
    const inv=o.text?inv01(ti):0;
    const BG=mix(INK,PAPER,inv),FG=mix(PAPER,INK,inv);
    sctx.setTransform(S,0,0,S,0,0);sctx.fillStyle=BG;sctx.fillRect(0,0,W,H);
    const sh=shakeAt(ti,frame);sctx.translate(sh.x,sh.y);
    drawParticles(sctx,ti,FG);
    if(ti<1.0)drawIntro(sctx,ti);
    if(o.text){
      if(ti>=0.9&&ti<2.65)drawCounter(sctx,ti);
      if(ti>=2.7&&ti<3.97)drawStatement(sctx,ti);
      if(ti>=4.0&&ti<6.41)drawSlogan(sctx,ti);
    }
    if(ti>=6.5&&ti<9.75)drawMatching(sctx,ti);
    if(o.text&&ti>=9.3&&ti<11.0)drawResolution(sctx,ti);
    if(o.text)drawCards(sctx,ti);
    if(ti>=12.3){drawMatches(sctx,tReal,ti);if(o.lockup)drawLockup(sctx,ti);}
    // compose into the visible canvas
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=BG;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(view.scale*dpr,0,0,view.scale*dpr,view.ox*dpr,view.oy*dpr);
    const b=o.text?blockAt(ti):1;
    if(b>1){
      const sw=Math.ceil(W/b),shh=Math.ceil(H/b);
      if(small.width!==sw||small.height!==shh){small.width=sw;small.height=shh;}
      smctx.imageSmoothingEnabled=true;smctx.drawImage(scene,0,0,sw,shh);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,W,H);ctx.imageSmoothingEnabled=true;
    }else ctx.drawImage(scene,0,0,W,H);
    if(inv<0.5)vignette(ctx,1-inv*2);
    if(o.hud)hud(ctx,tReal,ti,frame,inv);
    if(o.grain)grain(ctx,frame,inv>0.5);
  }

  // ---- sound (live) ----
  const REAL_CUES=CUES.map(c=>Object.assign({},c,{t:c.t/SPEED}));
  for(let k=0;k<400;k++){const t=MATCH_START+k*MATCH_PERIOD;REAL_CUES.push({t:t+0.6,k:'blip',f:k%2?990:660,g:.45});REAL_CUES.push({t:t+0.6,k:'tick',f:3000,g:.3});}
  REAL_CUES.sort((a,b)=>a.t-b.t);
  let actx=null,syn=null,lastT=0,soundOn=false;
  function audioTick(t,playing){
    if(!soundOn||!syn)return;
    if(playing){
      if(t<lastT)lastT=t;
      for(const c of REAL_CUES){if(c.t>lastT&&c.t<=t)syn.fx[c.k](actx.currentTime+0.004,c);else if(c.t>t)break;}
      lastT=t;
      const ti=Math.min(INT_DUR,t*SPEED);
      syn.dgain.gain.setTargetAtTime(DRONE_GAIN*droneLevel(ti),actx.currentTime,0.05);
      syn.dflt.frequency.setTargetAtTime(droneCut(ti),actx.currentTime,0.05);
    }else syn.dgain.gain.setTargetAtTime(0,actx.currentTime,0.05);
  }
  async function renderAudio(durationReal){
    const sr=48000;const oc=new OfflineAudioContext(2,Math.ceil(sr*durationReal),sr);const S2=makeSynth(oc);
    for(const c of REAL_CUES){if(c.t<durationReal-0.05)S2.fx[c.k](c.t,c);}
    const n=Math.floor(durationReal*100);const lv=new Float32Array(n),cf=new Float32Array(n);
    for(let i=0;i<n;i++){const ti=Math.min(INT_DUR,(i/100)*SPEED);lv[i]=DRONE_GAIN*droneLevel(ti);cf[i]=droneCut(ti);}
    lv[n-1]=0;lv[n-2]=0;
    S2.dgain.gain.setValueCurveAtTime(lv,0,durationReal-0.02);S2.dflt.frequency.setValueCurveAtTime(cf,0,durationReal-0.02);
    const buf=await oc.startRendering();return wavBase64(buf);
  }

  // ---- clock & loop ----
  let playing=false,acc=0,startPerf=0,raf=0,visible=true,destroyed=false,ended=false;
  const listeners=new Set();
  const now=()=>performance.now();
  const time=()=>playing?acc+(now()-startPerf)/1000:acc;
  let loopRunning=false;
  function startLoop(){if(!loopRunning&&!destroyed){loopRunning=true;frameLoop();}}
  function play(){if(destroyed)return;if(ended&&o.loop!=='idle'){acc=0;ended=false;}if(!playing){playing=true;startPerf=now();lastT=acc;if(actx)actx.resume();}startLoop();}
  function pause(){if(playing){acc=time();playing=false;}}
  function seek(t){acc=Math.max(0,t);startPerf=now();lastT=acc;ended=false;startLoop();}
  function frameLoop(){
    if(destroyed)return;
    raf=requestAnimationFrame(frameLoop);
    if(!visible||document.hidden){if(playing){acc=time();startPerf=now();}return;}
    let t=time();
    if(!ended&&t>=END){
      if(o.loop==='hold'){ended=true;pause();acc=END;t=END;}
      else if(o.loop==='restart'){if(t>=END+3){seek(0);t=0;}}
      else ended=true;
    }
    renderAt(t);audioTick(t,playing);
    for(const cb of listeners)cb(t);
  }
  const ro=('ResizeObserver' in window)?new ResizeObserver(()=>{resize();renderAt(time());}):null;
  if(ro)ro.observe(container);else window.addEventListener('resize',()=>{resize();renderAt(time());});
  const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>{for(const e of es)visible=e.isIntersecting;},{threshold:0}):null;
  if(io)io.observe(container);

  const reduce=o.reducedMotion==='auto'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // an ambient field (no text, hud or lockup) draws no glyphs, so it never loads web fonts
  const needsFonts=!!(o.text||o.hud||o.lockup);
  const ready=(needsFonts?ensureFonts():Promise.resolve()).then(()=>{
    m.layout(sctx,needsFonts);
    if(reduce){acc=END+0.2;renderAt(acc);return;}
    if(o.autoplay)play();else renderAt(0);
  });

  return {
    canvas,ready,chapters:CHAPTERS.map(ch=>({t:ch.t0/SPEED,name:ch.name})),
    get duration(){return END},get time(){return time()},get playing(){return playing},get ended(){return ended},get sound(){return soundOn},
    play,pause,seek,replay(){seek(0);play();},
    renderAt,png(){return canvas.toDataURL('image/png')},renderAudio,
    setSound(on){
      if(on){if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();syn=makeSynth(actx);}actx.resume();lastT=time();soundOn=true;}
      else{soundOn=false;if(syn)syn.dgain.gain.setTargetAtTime(0,actx.currentTime,0.05);}
    },
    onFrame(cb){listeners.add(cb);return()=>listeners.delete(cb)},
    destroy(){destroyed=true;cancelAnimationFrame(raf);if(ro)ro.disconnect();if(io)io.disconnect();if(actx)actx.close();canvas.remove();}
  };
}
global.DureReel={mount,W,H,FPS,INT_DUR,CHAPTERS};
})(window);
