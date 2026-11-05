const APPS=window.APPS.filter(a=>a.d===window.TODAY);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- rail ---- */
const rail=document.getElementById("rail");
APPS.forEach((a,i)=>{
  const el=document.createElement("a");el.className="panel glass";el.href="app.html?id="+encodeURIComponent(a.id);el.style.setProperty("--c",a.c);
  el.innerHTML=`<div class="p-top"><span class="cap">${String(i+1).padStart(2,"0")}</span><span class="p-price">¥0<i>FREE</i></span><h3 class="p-name"></h3><span class="sample">サンプル</span></div>
    <div class="p-vis"><div class="icon"><b></b></div></div>
    <div><p class="p-line"></p><div class="p-spec"><span></span><span></span></div></div>`;
  el.querySelector(".p-name").textContent=a.n;
  if(a.b){const bt=document.createElement("span");bt.className="beta";bt.textContent="試作中";el.querySelector(".sample").after(bt);}el.querySelector(".icon b").textContent=a.n[0];el.querySelector(".p-line").textContent=a.t;
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

/* ---- hero: the apps themselves.
   Every listed app is its own icon. On load the icons fly in and settle into a slowly turning sphere
   (Fibonacci layout); today's apps carry a thin amber ring. Hover shows the name, click opens the app. ---- */
(function(){
  if(!window.THREE)return;
  const hero=document.querySelector(".hero"),cv=document.getElementById("net");
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xC9C9C8,9.0,13.6);   // icons at the back fade into the silver
  const cam=new THREE.PerspectiveCamera(32,1,0.1,100);cam.position.set(0,0,11);
  const world=new THREE.Group();scene.add(world);
  // spread apps over the sphere in a stable but mixed order, so today's are not all bunched at the top
  const hash=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const ALL=[...window.APPS].sort((a,b)=>hash(a.id)-hash(b.id));

  // icon textures drawn on a canvas: rounded tile, colour gradient, highlight, initial
  function iconTex(app){
    const S=256,c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d");
    const r=74,p=10;
    const path=()=>{g.beginPath();g.moveTo(p+r,p);g.arcTo(S-p,p,S-p,S-p,r);g.arcTo(S-p,S-p,p,S-p,r);g.arcTo(p,S-p,p,p,r);g.arcTo(p,p,S-p,p,r);g.closePath();};
    path();const lg=g.createLinearGradient(0,0,S,S);lg.addColorStop(0,"#ffffff");lg.addColorStop(0.08,app.c);lg.addColorStop(1,"#1e1e1e");
    g.fillStyle=app.c;g.fill();g.save();g.globalAlpha=0.45;g.fillStyle=lg;g.fill();g.restore();
    const hl=g.createRadialGradient(S*0.3,S*0.2,0,S*0.3,S*0.2,S*0.6);hl.addColorStop(0,"rgba(255,255,255,.75)");hl.addColorStop(1,"rgba(255,255,255,0)");
    g.save();path();g.clip();g.fillStyle=hl;g.fillRect(0,0,S,S);g.restore();
    g.lineWidth=3;g.strokeStyle="rgba(255,255,255,.55)";path();g.stroke();
    g.fillStyle="#ffffff";g.font=`700 ${S*0.42}px "Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP",sans-serif`;
    g.textAlign="center";g.textBaseline="middle";g.shadowColor="rgba(0,0,0,.25)";g.shadowBlur=10;g.shadowOffsetY=3;
    g.fillText(app.n[0],S/2,S/2+S*0.03);
    const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
  }
  function ringTex(){
    const S=256,c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d");
    const r=86,p=4,path=()=>{g.beginPath();g.moveTo(p+r,p);g.arcTo(S-p,p,S-p,S-p,r);g.arcTo(S-p,S-p,p,S-p,r);g.arcTo(p,S-p,p,p,r);g.arcTo(p,p,S-p,p,r);g.closePath();};
    g.shadowColor="rgba(233,162,59,.9)";g.shadowBlur=16;g.lineWidth=5;g.strokeStyle="rgba(233,162,59,1)";path();g.stroke();
    return new THREE.CanvasTexture(c);
  }

  const R=2.35,N=ALL.length,TILE=0.62,ring=ringTex();
  const items=ALL.map((app,i)=>{
    const y=1-2*(i+0.5)/N,rad=Math.sqrt(1-y*y),th=i*Math.PI*(3-Math.sqrt(5));     // Fibonacci sphere
    const home=new THREE.Vector3(Math.cos(th)*rad*R,y*R,Math.sin(th)*rad*R);
    const dir=home.clone().normalize(),from=dir.multiplyScalar(9+Math.random()*4).add(new THREE.Vector3((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4));
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:null,transparent:true,fog:true,depthWrite:false}));
    sp.scale.set(TILE,TILE,1);sp.userData.app=app;world.add(sp);
    let halo=null;
    if(app.d===window.TODAY){halo=new THREE.Sprite(new THREE.SpriteMaterial({map:ring,transparent:true,fog:true,depthWrite:false}));halo.scale.set(TILE*1.22,TILE*1.22,1);world.add(halo);}
    return{app,home,from,sp,halo,delay:0.15+Math.random()*1.4};
  });
  // draw textures once the web font is ready so the initials use it
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>items.forEach(it=>{it.sp.material.map=iconTex(it.app);it.sp.material.needsUpdate=true;}));

  // tooltip
  const tip=document.createElement("a");tip.className="w-tip glass";tip.hidden=true;hero.appendChild(tip);
  function showTip(it,x,y){
    tip.replaceChildren();
    const b=document.createElement("b");b.textContent=it.app.n;
    const p=document.createElement("span");p.textContent=it.app.t;
    const m=document.createElement("small");m.textContent=`${it.app.p} ・ ${it.app.g}${it.app.b?" ・ 試作中":""} ・ 詳しく見る →`;
    tip.append(b,p,m);tip.href="app.html?id="+encodeURIComponent(it.app.id);
    tip.style.transform=`translate(${Math.max(8,Math.min(x+18,hero.clientWidth-262))}px,${Math.max(70,y-24)}px)`;tip.hidden=false;
  }

  let narrow=false;const W=()=>cv.clientWidth,H=()=>cv.clientHeight;
  function size(){
    renderer.setSize(W(),H(),false);cam.aspect=W()/H();cam.updateProjectionMatrix();
    narrow=W()<860;
    const vH=2*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*cam.position.z,vW=vH*cam.aspect;
    world.position.set(narrow?0:vW*0.15,narrow?vH*0.17:-vH*0.06,0);
    world.scale.setScalar(narrow?Math.min(0.78,vW/6.6):1);
  }
  addEventListener("resize",size);size();

  // pointer: drag in any direction to turn (with inertia), hover to see the name, click/tap for details.
  // A grab area over the sphere only, so on phones the rest of the hero still scrolls the page.
  const grab=document.createElement("div");grab.className="w-grab";grab.setAttribute("aria-hidden","true");hero.appendChild(grab);
  const label=document.createElement("span");label.className="w-name";label.hidden=true;hero.appendChild(label);
  const ray=new THREE.Raycaster(),sprites=items.map(it=>it.sp);
  let px=-1,py=-1,hover=null,drag=false,lx=0,ly=0,vx=0,vy=0,moved=0;
  const qx=new THREE.Quaternion(),qy=new THREE.Quaternion(),AX=new THREE.Vector3(1,0,0),AY=new THREE.Vector3(0,1,0);
  world.quaternion.setFromEuler(new THREE.Euler(0.18,0,0));
  function turn(dx,dy){qy.setFromAxisAngle(AY,dx);qx.setFromAxisAngle(AX,dy);world.quaternion.premultiply(qy).premultiply(qx);}
  function pick(){hover=null;if(px<0)return;ray.setFromCamera({x:px/W()*2-1,y:-(py/H())*2+1},cam);
    const hit=ray.intersectObjects(sprites,false).find(h=>h.object.material.opacity>0.5);if(hit)hover=items[sprites.indexOf(hit.object)];}
  const local=e=>{const b=cv.getBoundingClientRect();px=e.clientX-b.left;py=e.clientY-b.top;};
  grab.addEventListener("pointerdown",e=>{drag=true;moved=0;lx=e.clientX;ly=e.clientY;vx=vy=0;grab.setPointerCapture(e.pointerId);local(e);});
  grab.addEventListener("pointermove",e=>{local(e);
    if(drag){const dx=e.clientX-lx,dy=e.clientY-ly;moved+=Math.abs(dx)+Math.abs(dy);vx=dx*0.006;vy=dy*0.006;turn(vx,vy);lx=e.clientX;ly=e.clientY;}});
  grab.addEventListener("pointerup",e=>{drag=false;
    if(moved<6){local(e);pick();
      if(hover){v.copy(hover.sp.position).applyMatrix4(world.matrixWorld).project(cam);showTip(hover,(v.x*.5+.5)*W(),(-v.y*.5+.5)*H());}
      else tip.hidden=true;}});
  grab.addEventListener("pointercancel",()=>{drag=false;});
  grab.addEventListener("pointerleave",()=>{if(!drag)px=-1;});

  const v=new THREE.Vector3(),t0=performance.now(),ease=k=>1-Math.pow(1-k,3);
  function frame(now){
    const t=(now-t0)/1000,mv=reduce?0:1;
    if(!drag){turn(vx+0.0016*mv,vy);vx*=0.94;vy*=0.94;}   // inertia, plus a slow idle turn
    items.forEach(it=>{
      const k=reduce?1:Math.min(1,Math.max(0,(t-it.delay)/1.6)),e=ease(k);
      it.sp.position.copy(it.from).lerp(it.home,e);
      const big=it===hover?1.18:1;
      it.sp.scale.set(TILE*big,TILE*big,1);
      it.sp.material.opacity=Math.min(1,k*1.4);
      if(it.halo){it.halo.position.copy(it.sp.position);it.halo.scale.set(TILE*1.22*big,TILE*1.22*big,1);it.halo.material.opacity=k>=1?0.7+0.3*Math.sin(t*2.2)*mv:0;}
    });
    world.updateMatrixWorld();
    if(!drag)pick();
    grab.style.cursor=hover?"pointer":(drag?"grabbing":"grab");
    if(hover&&!drag){v.copy(hover.sp.position).applyMatrix4(world.matrixWorld).project(cam);
      label.textContent=hover.app.n;label.style.transform=`translate(${(v.x*.5+.5)*W()}px,${(-v.y*.5+.5)*H()+TILE*34}px) translateX(-50%)`;label.hidden=false;}
    else label.hidden=true;
    renderer.render(scene,cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
