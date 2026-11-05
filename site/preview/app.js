const NAMES=["App World","AppSphere","Appland","Daily Apps","Newborn","Hello App","Appear"];
const namesEl=document.getElementById("names");
NAMES.forEach((n,i)=>{const b=document.createElement("button");b.type="button";b.textContent=n;b.setAttribute("aria-pressed",i===0?"true":"false");
  b.onclick=()=>{document.querySelectorAll(".js-name").forEach(e=>e.textContent=n);namesEl.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));document.title=n+" 見本";};
  namesEl.appendChild(b);namesEl.append(" ");});

const APPS=[
  {n:"こんだてAI",t:"冷蔵庫の写真から、今夜の献立を3つ提案",p:"Web",a:"Claude Code",c:"#D9775A"},
  {n:"積読ゼロ",t:"買ったまま読んでいない本を、1日10分ずつ消化",p:"iPhone",a:"Cursor",c:"#3E8C84"},
  {n:"ジムメモ",t:"セット間の休憩中に、片手で記録できる筋トレメモ",p:"Android",a:"Codex",c:"#4C6FD1"},
  {n:"レビュー下書き",t:"プルリクの差分から、レビューの観点を自動で下書き",p:"Web",a:"Claude Code",c:"#6A6F7A"},
  {n:"えほんメーカー",t:"子どもの好きなものから、寝る前のお話を作る",p:"Web",a:"v0",c:"#B9567E"},
  {n:"シフト交換板",t:"バイト仲間どうしで、シフトの交換相手をすぐ探せる",p:"Web",a:"Lovable",c:"#8A64C8"},
  {n:"ひとこと漢字",t:"通勤の1駅で1問、大人の読めそうで読めない漢字",p:"iPhone",a:"Replit",c:"#C9A13A"}
];
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- rail ---- */
const rail=document.getElementById("rail");
APPS.forEach((a,i)=>{
  const el=document.createElement("a");el.className="panel glass";el.href="#shelf";el.style.setProperty("--c",a.c);
  el.innerHTML=`<div class="p-top"><span class="cap">${String(i+1).padStart(2,"0")}</span><span class="p-price">¥0<i>FREE</i></span><h3 class="p-name"></h3><span class="sample">サンプル</span></div>
    <div class="p-vis"><div class="icon"><b></b></div></div>
    <div><p class="p-line"></p><div class="p-spec"><span></span><span></span></div></div>`;
  el.querySelector(".p-name").textContent=a.n;el.querySelector(".icon b").textContent=a.n[0];el.querySelector(".p-line").textContent=a.t;
  const sp=el.querySelectorAll(".p-spec span");sp[0].textContent=a.p;sp[1].textContent=a.a;
  rail.appendChild(el);
});
const prog=document.getElementById("prog");
function upd(){const m=rail.scrollWidth-rail.clientWidth;const f=m>0?rail.scrollLeft/m:1;const vis=Math.min(1,rail.clientWidth/rail.scrollWidth);prog.style.width=(vis*100)+"%";prog.style.left=(f*(1-vis)*100)+"%";}
rail.addEventListener("scroll",upd,{passive:true});addEventListener("resize",upd);upd();
let down=false,sx=0,sl=0,moved=false;
rail.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;down=true;moved=false;sx=e.clientX;sl=rail.scrollLeft;rail.classList.add("dragging");});
addEventListener("pointermove",e=>{if(!down)return;const dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;rail.scrollLeft=sl-dx;});
addEventListener("pointerup",()=>{if(!down)return;down=false;rail.classList.remove("dragging");});
rail.addEventListener("click",e=>{if(moved){e.preventDefault();moved=false;}},true);
rail.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&rail.scrollWidth>rail.clientWidth){const b=rail.scrollLeft;rail.scrollLeft+=e.deltaY;if(rail.scrollLeft!==b)e.preventDefault();}},{passive:false});

/* ---- hero: a crumpled, eroded wire-mesh torus with an amber core ---- */
(function(){
  if(!window.THREE)return;
  const cv=document.getElementById("net");
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0xC6C6C5,8.2,12.8);              // far side fades into the silver
  const cam=new THREE.PerspectiveCamera(34,1,0.1,100);cam.position.set(0,0,10.5);
  const world=new THREE.Group();scene.add(world);

  // smooth pseudo-noise from layered sines (no dependency)
  const n3=(x,y,z)=>Math.sin(x*1.7+y*0.6)*0.5+Math.sin(y*2.3+z*1.1+1.7)*0.3+Math.sin(z*2.9+x*1.3+0.4)*0.2;

  // torus grid, displaced by noise
  const U=150,V=22,R=2.55,r=0.78,P=[];
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){
    const u=i/U*Math.PI*2,v=j/V*Math.PI*2;
    let x=(R+r*Math.cos(v))*Math.cos(u),y=(R+r*Math.cos(v))*Math.sin(u),z=r*Math.sin(v);
    const d=0.42*n3(x*0.9,y*0.9,z*0.9)+0.12*n3(x*3.1,y*3.1,z*3.1);
    const k=1+d*0.32/ (R+r);
    x*=1+d*0.12;y*=1+d*0.12;z+=d*0.55;
    x+= (Math.random()-.5)*0.06;y+=(Math.random()-.5)*0.06;z+=(Math.random()-.5)*0.06;
    P.push(new THREE.Vector3(x,y,z));
  }
  const id=(i,j)=>((i+U)%U)*V+((j+V)%V);
  // triangulated wireframe, eroded where the noise is low (holes like the reference)
  const keep=(a,b)=>{const m=a.clone().add(b).multiplyScalar(.5);return n3(m.x*1.4+3,m.y*1.4,m.z*1.4)>-0.12&&Math.random()>0.14;};
  const seg=[];
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){
    const a=P[id(i,j)],b=P[id(i+1,j)],c=P[id(i,j+1)],d=P[id(i+1,j+1)];
    if(keep(a,b))seg.push(a,b);if(keep(a,c))seg.push(a,c);if(keep(a,d))seg.push(a,d);
  }
  const lineMat=new THREE.LineBasicMaterial({color:0x1A1B1C,transparent:true,opacity:0.62,fog:true});
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg),lineMat));

  function sprite(core,mid){
    const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");
    const rg=g.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,core);rg.addColorStop(0.28,mid);rg.addColorStop(1,mid.replace(/[\d.]+\)$/,"0)"));
    g.fillStyle=rg;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;
  }
  const dotTex=sprite("rgba(26,27,28,1)","rgba(26,27,28,.5)");
  const vtx=P.filter((p,i)=>i%2===0);
  world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(vtx),new THREE.PointsMaterial({size:0.045,map:dotTex,transparent:true,depthWrite:false,fog:true})));

  // amber: sparks clustered toward the lower-right of the core, a few on the mesh
  const amberTex=sprite("rgba(255,214,140,1)","rgba(226,140,36,.85)");
  const glowTex=sprite("rgba(255,196,110,.7)","rgba(226,140,36,.25)");
  const smokeTex=sprite("rgba(40,40,40,.55)","rgba(40,40,40,.22)");
  const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false}));smoke.position.set(0.2,-0.2,-0.3);smoke.scale.set(3.6,3.6,1);world.add(smoke);
  function sparks(count,spread,size,opacity){
    const pts=[];
    for(let i=0;i<count;i++){
      const th=-0.9+Math.random()*2.4,rr=0.25+Math.pow(Math.random(),1.6)*spread;
      pts.push(new THREE.Vector3(Math.cos(th)*rr*1.05+0.2,-Math.sin(th)*rr*0.95-0.1,(Math.random()-.5)*1.3));
    }
    for(let i=0;i<count*0.25;i++){const p=P[(Math.random()*P.length)|0];if(Math.atan2(p.y,p.x)<0.2&&Math.atan2(p.y,p.x)>-1.8)pts.push(p.clone());}
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const m=new THREE.Points(geo,new THREE.PointsMaterial({size,map:amberTex,transparent:true,depthWrite:false,opacity,blending:THREE.AdditiveBlending}));
    world.add(m);return m;
  }
  const s1=sparks(420,1.35,0.06,1),s2=sparks(90,1.1,0.16,0.9);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0.3}));
  glow.position.set(0.55,-0.45,0);glow.scale.set(2.2,2.2,1);world.add(glow);
  // filaments: short bright strokes through the core
  const fil=[];for(let i=0;i<40;i++){const a=new THREE.Vector3(0.1+Math.random()*1.2,-0.3-Math.random()*1.2,(Math.random()-.5)*.6);const b=a.clone().add(new THREE.Vector3((Math.random()-.5)*0.7,(Math.random()-.3)*0.8,(Math.random()-.5)*.3));fil.push(a,b);}
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fil),new THREE.LineBasicMaterial({color:0xFFC765,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending})));

  world.rotation.set(0.42,-0.32,0.1);
  let mx=0,my=0,drag=false,lx=0,spin=0,narrow=false;
  addEventListener("pointermove",e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;if(drag){spin+=(e.clientX-lx)*0.005;lx=e.clientX;}});
  cv.parentElement.addEventListener("pointerdown",e=>{if(e.target.closest("a"))return;drag=true;lx=e.clientX;});
  addEventListener("pointerup",()=>drag=false);
  function size(){
    const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
    narrow=w<860;
    const vH=2*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*cam.position.z,vW=vH*cam.aspect;
    world.position.set(narrow?0:vW*0.13,narrow?vH*0.23:0,0);
    world.scale.setScalar(narrow?Math.min(0.62,vW/7.6):0.9);
  }
  addEventListener("resize",size);size();
  const t0=performance.now();
  function frame(now){
    const t=(now-t0)/1000,mv=reduce?0:1;
    world.rotation.z=0.1+t*0.045*mv+spin;
    world.rotation.x=0.42+my*0.22+Math.sin(t*0.25)*0.05*mv;
    world.rotation.y=-0.32+mx*0.3;
    s1.material.opacity=0.85+0.15*Math.sin(t*1.7*mv);
    s2.material.opacity=0.7+0.25*Math.sin(t*2.3*mv+1);
    glow.material.opacity=0.26+0.08*Math.sin(t*1.1*mv);
    renderer.render(scene,cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
