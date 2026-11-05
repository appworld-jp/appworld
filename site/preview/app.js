const APPS=window.APPS.filter(a=>a.d===window.TODAY);
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

/* ---- hero: the world of apps.
   The ring is split into one arc per genre (arc length = number of listed apps).
   On load, today's apps fly in from outside and settle into their genre's arc.
   Hover/tap a glowing point to see the app; hover/tap an arc to open that genre's list. ---- */
(function(){
  if(!window.THREE)return;
  const hero=document.querySelector(".hero"),cv=document.getElementById("net");
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xC6C6C5,8.2,12.8);
  const cam=new THREE.PerspectiveCamera(34,1,0.1,100);cam.position.set(0,0,10.5);
  const world=new THREE.Group();scene.add(world);
  const n3=(x,y,z)=>Math.sin(x*1.7+y*0.6)*0.5+Math.sin(y*2.3+z*1.1+1.7)*0.3+Math.sin(z*2.9+x*1.3+0.4)*0.2;
  const TAU=Math.PI*2;

  // genres -> arcs (sorted by count), with a small gap between arcs
  const ALL=window.APPS,TODAYS=ALL.filter(a=>a.d===window.TODAY);
  const counts={};ALL.forEach(a=>counts[a.g]=(counts[a.g]||0)+1);
  const genres=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  const GAP=0.06,usable=TAU-GAP*genres.length;let acc=0;
  const arcs=genres.map(g=>{const len=usable*counts[g]/ALL.length;const a={g,n:counts[g],start:acc,end:acc+len};acc+=len+GAP;return a;});
  const arcOf=u=>arcs.find(a=>u>=a.start&&u<a.end);

  // displaced torus grid
  const U=160,V=22,R=2.55,r=0.78,P=[],UA=[];
  for(let i=0;i<U;i++)for(let j=0;j<V;j++){
    const u=i/U*TAU,v=j/V*TAU;
    let x=(R+r*Math.cos(v))*Math.cos(u),y=(R+r*Math.cos(v))*Math.sin(u),z=r*Math.sin(v);
    const d=0.42*n3(x*0.9,y*0.9,z*0.9)+0.12*n3(x*3.1,y*3.1,z*3.1);
    x*=1+d*0.12;y*=1+d*0.12;z+=d*0.55;
    x+=(Math.random()-.5)*0.06;y+=(Math.random()-.5)*0.06;z+=(Math.random()-.5)*0.06;
    P.push(new THREE.Vector3(x,y,z));UA.push(u);
  }
  const id=(i,j)=>((i+U)%U)*V+((j+V)%V);
  const keep=(a,b)=>{const m=a.clone().add(b).multiplyScalar(.5);return n3(m.x*1.4+3,m.y*1.4,m.z*1.4)>-0.12&&Math.random()>0.14;};
  const segBy=new Map(arcs.map(a=>[a.g,[]]));
  for(let i=0;i<U;i++){
    const arc=arcOf(i/U*TAU),arc2=arcOf(((i+1)%U)/U*TAU);
    if(!arc)continue;                                   // inside a gap: leave it open
    for(let j=0;j<V;j++){
      const a=P[id(i,j)],b=P[id(i+1,j)],c=P[id(i,j+1)],d=P[id(i+1,j+1)],L=segBy.get(arc.g);
      if(keep(a,c))L.push(a,c);
      if(arc2===arc){if(keep(a,b))L.push(a,b);if(keep(a,d))L.push(a,d);}
    }
  }
  const BASE=0.6;
  arcs.forEach(a=>{
    a.mat=new THREE.LineBasicMaterial({color:0x1A1B1C,transparent:true,opacity:BASE,fog:true});
    world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segBy.get(a.g)),a.mat));
  });

  function sprite(core,mid){
    const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");
    const rg=g.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,core);rg.addColorStop(0.28,mid);rg.addColorStop(1,mid.replace(/[\d.]+\)$/,"0)"));
    g.fillStyle=rg;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
  }
  world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(P.filter((p,i)=>i%2===0)),
    new THREE.PointsMaterial({size:0.045,map:sprite("rgba(26,27,28,1)","rgba(26,27,28,.5)"),transparent:true,depthWrite:false,fog:true})));

  // core
  const amberTex=sprite("rgba(255,214,140,1)","rgba(226,140,36,.85)");
  const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:sprite("rgba(40,40,40,.5)","rgba(40,40,40,.2)"),transparent:true,depthWrite:false}));
  smoke.scale.set(3.4,3.4,1);world.add(smoke);
  const core=[];for(let i=0;i<360;i++){const th=Math.random()*TAU,rr=Math.pow(Math.random(),1.7)*1.2;core.push(new THREE.Vector3(Math.cos(th)*rr,Math.sin(th)*rr,(Math.random()-.5)*1.0));}
  const coreMat=new THREE.PointsMaterial({size:0.055,map:amberTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0.9});
  world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(core),coreMat));

  // today's apps: each gets a home point on the ring inside its genre's arc
  const homes=TODAYS.map((app,k)=>{
    const arc=arcs.find(a=>a.g===app.g),sameGenre=TODAYS.filter(x=>x.g===app.g),idx=sameGenre.indexOf(app);
    const u=arc.start+(arc.end-arc.start)*(idx+1)/(sameGenre.length+1);
    const home=new THREE.Vector3((R+0.15)*Math.cos(u),(R+0.15)*Math.sin(u),0.35);
    const th=Math.random()*TAU,far=9+Math.random()*3;
    const from=new THREE.Vector3(Math.cos(th)*far,Math.sin(th)*far,(Math.random()-.5)*6);
    return{app,home,from,pos:from.clone(),delay:0.25+k*0.22};
  });
  const litGeo=new THREE.BufferGeometry();litGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(homes.length*3),3));
  const litMat=new THREE.PointsMaterial({size:0.5,map:amberTex,transparent:true,depthWrite:false});
  world.add(new THREE.Points(litGeo,litMat));
  const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(homes.length*6),3));
  const trail=new THREE.LineSegments(trailGeo,new THREE.LineBasicMaterial({color:0xE9A23B,transparent:true,opacity:0.6}));world.add(trail);

  // HTML overlay: genre labels, app labels, tooltip
  const layer=document.createElement("div");layer.className="w-layer";layer.setAttribute("aria-hidden","true");hero.appendChild(layer);
  arcs.forEach(a=>{const el=document.createElement("span");el.className="w-genre";el.textContent=a.g;const n=document.createElement("small");n.textContent=a.n;el.append(n);layer.append(el);a.el=el;});
  homes.forEach(h=>{const el=document.createElement("span");el.className="w-app";el.textContent=h.app.n;layer.append(el);h.el=el;});
  const tip=document.createElement("a");tip.className="w-tip glass";tip.hidden=true;hero.appendChild(tip);
  function showTip(h,x,y){
    tip.replaceChildren();
    const b=document.createElement("b");b.textContent=h.app.n;
    const p=document.createElement("span");p.textContent=h.app.t;
    const m=document.createElement("small");m.textContent=`${h.app.p} ・ ${h.app.g} ・ 詳しく見る →`;
    tip.append(b,p,m);tip.href="apps.html?q="+encodeURIComponent(h.app.n);
    tip.style.transform=`translate(${Math.min(x+16,hero.clientWidth-260)}px,${y-20}px)`;tip.hidden=false;
  }

  // layout
  let narrow=false;const W=()=>cv.clientWidth,H=()=>cv.clientHeight;
  function size(){
    renderer.setSize(W(),H(),false);cam.aspect=W()/H();cam.updateProjectionMatrix();
    narrow=W()<860;
    const vH=2*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*cam.position.z,vW=vH*cam.aspect;
    world.position.set(narrow?0:vW*0.13,narrow?vH*0.23:0,0);
    world.scale.setScalar(narrow?Math.min(0.62,vW/7.6):0.9);
    hero.classList.toggle("is-narrow",narrow);
  }
  addEventListener("resize",size);size();

  // pointer: which app point / which genre arc is under the pointer
  let mx=0,my=0,hoverApp=null,hoverArc=null,px=-1,py=-1;
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(),v=new THREE.Vector3(),hit=new THREE.Vector3();
  function screenOf(p){v.copy(p).applyMatrix4(world.matrixWorld).project(cam);return[(v.x*.5+.5)*W(),(-v.y*.5+.5)*H(),v.z];}
  function pick(){
    hoverApp=null;hoverArc=null;if(px<0)return;
    let best=24;homes.forEach(h=>{const[sx,sy]=screenOf(h.pos);const d=Math.hypot(sx-px,sy-py);if(d<best){best=d;hoverApp=h;}});
    if(hoverApp)return;
    const n=new THREE.Vector3(0,0,1).transformDirection(world.matrixWorld);plane.setFromNormalAndCoplanarPoint(n,world.position);
    ray.setFromCamera({x:px/W()*2-1,y:-(py/H())*2+1},cam);
    if(ray.ray.intersectPlane(plane,hit)){const l=world.worldToLocal(hit.clone());const rr=Math.hypot(l.x,l.y);
      if(rr>R-r-0.25&&rr<R+r+0.35){const u=(Math.atan2(l.y,l.x)+TAU)%TAU;hoverArc=arcOf(u)||null;}}
  }
  hero.addEventListener("pointermove",e=>{const b=cv.getBoundingClientRect();px=e.clientX-b.left;py=e.clientY-b.top;mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;});
  hero.addEventListener("pointerleave",()=>{px=-1;tip.hidden=true;});
  hero.addEventListener("click",e=>{
    if(e.target.closest("a"))return;
    const b=cv.getBoundingClientRect();px=e.clientX-b.left;py=e.clientY-b.top;pick();
    if(hoverApp){const[sx,sy]=screenOf(hoverApp.pos);showTip(hoverApp,sx,sy);}
    else if(hoverArc){location.href="apps.html?g="+encodeURIComponent(hoverArc.g);}
    else tip.hidden=true;
  });

  const t0=performance.now(),reduceM=reduce;
  const ease=t=>1-Math.pow(1-t,3);
  function frame(now){
    const t=(now-t0)/1000,mv=reduceM?0:1;
    world.rotation.z=0.25+t*0.035*mv;world.rotation.x=0.42+my*0.18;world.rotation.y=-0.32+mx*0.25;
    // gather
    const lp=litGeo.attributes.position.array,tp=trailGeo.attributes.position.array;
    homes.forEach((h,i)=>{
      const k=reduceM?1:Math.min(1,Math.max(0,(t-h.delay)/1.8)),e=ease(k);
      h.pos.copy(h.from).lerp(h.home,e);
      lp.set([h.pos.x,h.pos.y,h.pos.z],i*3);
      const back=h.from.clone().lerp(h.home,Math.max(0,e-0.12));
      tp.set(k<1&&k>0?[back.x,back.y,back.z,h.pos.x,h.pos.y,h.pos.z]:[0,0,0,0,0,0],i*6);
    });
    litGeo.attributes.position.needsUpdate=true;trailGeo.attributes.position.needsUpdate=true;
    const settled=reduceM||t>homes[homes.length-1].delay+1.8;
    litMat.size=0.46+0.08*Math.sin(t*2)*mv;
    coreMat.opacity=0.8+0.15*Math.sin(t*1.6)*mv;
    world.updateMatrixWorld();
    pick();
    arcs.forEach(a=>{a.mat.opacity=hoverArc?(a===hoverArc?0.95:0.22):BASE;});
    hero.style.cursor=(hoverApp||hoverArc)?"pointer":"";
    renderer.render(scene,cam);
    // labels
    arcs.forEach(a=>{const u=(a.start+a.end)/2;const[sx,sy]=screenOf(new THREE.Vector3((R+r+0.55)*Math.cos(u),(R+r+0.55)*Math.sin(u),0));
      a.el.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-50%)`;a.el.classList.toggle("on",a===hoverArc);a.el.style.opacity=settled?1:0;});
    homes.forEach(h=>{const[sx,sy]=screenOf(h.pos);h.el.style.transform=`translate(${sx+10}px,${sy-8}px)`;h.el.style.opacity=settled&&!narrow?1:0;h.el.classList.toggle("on",h===hoverApp);});
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
