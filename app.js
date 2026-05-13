/* DockSim — app.js */

'use strict';

/* ============================================================
   DATOS
============================================================ */
const MUELLE_METROS_TOTAL = 616.07;
const SEPARACION_MIN_M    = 15;
const MARGEN_BORDE_M      = 3.75;

const BITAS = [
  {num:212,pos:3.750,  cap:250},{num:211,pos:33.230, cap:150},
  {num:210,pos:62.710, cap:150},{num:209,pos:95.490, cap:150},
  {num:208,pos:124.970,cap:150},{num:207,pos:154.450,cap:150},
  {num:206,pos:187.230,cap:150},{num:205,pos:216.710,cap:150},
  {num:204,pos:246.190,cap:150},{num:203,pos:278.970,cap:150},
  {num:202,pos:308.450,cap:150},{num:201,pos:337.930,cap:250},
  {num:2,  pos:349.310,cap:55 },{num:3,  pos:381.850,cap:250},
  {num:4,  pos:414.990,cap:250},{num:5,  pos:448.130,cap:55 },
  {num:6,  pos:481.270,cap:55 },{num:7,  pos:514.410,cap:55 },
  {num:8,  pos:547.550,cap:55 },{num:9,  pos:580.690,cap:55 },
  {num:10, pos:613.820,cap:55 },
];

const TRAMOS = [
  {desde:'Borde',hasta:212,dist:3.50 },{desde:212,hasta:211,dist:28.98},
  {desde:211,hasta:210,dist:28.98},{desde:210,hasta:209,dist:32.28},
  {desde:209,hasta:208,dist:28.98},{desde:208,hasta:207,dist:28.98},
  {desde:207,hasta:206,dist:32.28},{desde:206,hasta:205,dist:28.98},
  {desde:205,hasta:204,dist:28.98},{desde:204,hasta:203,dist:32.28},
  {desde:203,hasta:202,dist:28.98},{desde:202,hasta:201,dist:28.98},
  {desde:201,hasta:2,  dist:10.88},{desde:2,  hasta:3,  dist:32.04},
  {desde:3,  hasta:4,  dist:32.64},{desde:4,  hasta:5,  dist:32.64},
  {desde:5,  hasta:6,  dist:32.64},{desde:6,  hasta:7,  dist:32.64},
  {desde:7,  hasta:8,  dist:32.64},{desde:8,  hasta:9,  dist:32.64},
  {desde:9,  hasta:10, dist:32.63},{desde:10, hasta:'Borde',dist:2.00},
];

const PALETTE = [
  '#e85555','#e87030','#d4a020','#3aaa5a',
  '#1fa8d0','#2878e8','#7050e0','#d04090',
  '#00b8a0','#e88010','#4060e0','#20b060'
];

/* ============================================================
   ESTADO
============================================================ */
let buques=[], cabos=[];
let idCounter=0, caboCounter=0;
const caboRowsOpen = new Set();

/* ============================================================
   HELPERS DOM
   El selector usa el nuevo DOM del Redesign pero mantiene
   compatibilidad con todos los IDs del script.js original.
============================================================ */
const $  = (s,r=document) => r.querySelector(s.startsWith('#')||s.startsWith('.')?s:'#'+s);
const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));

// Alias para compatibilidad (script.js usa $('#zonaBuques'), etc.)
function getEscala(){ return document.getElementById('zonaBuques').clientWidth / MUELLE_METROS_TOTAL; }

function mangaPorDefecto(m){
  m=parseFloat(m)||0;
  if(m<=120) return 25;
  if(m<=200) return 30;
  return 35;
}

/* ============================================================
   COLORES
============================================================ */
function randomPastel(){return hslToHex(Math.floor(Math.random()*360),62+Math.random()*18,48+Math.random()*14);}
function hslToHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));const hex=x=>Math.round(255*x).toString(16).padStart(2,'0');return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;}
function darken(hex,amt){const r=Math.max(0,parseInt(hex.slice(1,3),16)-amt),g=Math.max(0,parseInt(hex.slice(3,5),16)-amt),b=Math.max(0,parseInt(hex.slice(5,7),16)-amt);return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;}
function lighten(hex,amt){const r=Math.min(255,parseInt(hex.slice(1,3),16)+amt),g=Math.min(255,parseInt(hex.slice(3,5),16)+amt),b=Math.min(255,parseInt(hex.slice(5,7),16)+amt);return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;}

/* ============================================================
   BITAS
============================================================ */
function generarBitas(){
  const cont=document.getElementById('bitasContenedor');
  if(!cont) return;
  cont.innerHTML='';
  const escala=getEscala();
  BITAS.forEach(b=>{
    const cls=b.cap===250?'bita-250':b.cap===150?'bita-150':'bita-55';
    const div=document.createElement('div');
    div.className=`bita ${cls}`;
    div.dataset.num=String(b.num);
    div.dataset.pos=String(b.pos);
    div.dataset.cap=String(b.cap);
    div.style.left=(b.pos*escala)+'px';
    div.innerHTML=`<div class="bita-palo"></div><div class="bita-cabeza"></div><div class="bita-label">${b.num}</div>`;
    div.addEventListener('mouseenter',()=>mostrarInfoBita(b));
    div.addEventListener('mouseleave',ocultarInfoPanel);
    cont.appendChild(div);
  });
  // Ruler
  renderRuler();
}

function renderRuler(){
  const wrap=document.getElementById('ruler'); if(!wrap) return;
  wrap.innerHTML='';
  const escala=getEscala();
  for(let m=0;m<=MUELLE_METROS_TOTAL;m+=10){
    const tick=document.createElement('div');
    const major = m%50===0;
    tick.className='ruler-tick '+(major?'major':'minor');
    tick.style.left=(m*escala)+'px';
    wrap.appendChild(tick);
    if(major){
      const lab=document.createElement('div');
      lab.className='ruler-label';
      lab.style.left=(m*escala)+'px';
      lab.textContent=m+' m';
      wrap.appendChild(lab);
    }
  }
}


function calcularBitas(obj){
  const ini=parseFloat(obj.el.style.left), fin=ini+obj.el.offsetWidth;
  const domB=$$('.bita').map(b=>({num:b.dataset.num,x:b.offsetLeft}));
  const izq = domB.filter(b=>b.x<=ini).sort((a,b)=>b.x-a.x)[0];
  const der  = domB.filter(b=>b.x>=fin).sort((a,b)=>a.x-b.x)[0];
  obj.bitaDesde = izq ? izq.num : '–';
  obj.bitaHasta = der ? der.num : '–';
}

/* ============================================================
   PANEL INFO FLOTANTE
============================================================ */
const panelIF=document.getElementById('panelInfoFlotante');
const pifTitulo=document.getElementById('pifTitulo');
const pifIcon=document.getElementById('pifIcon');
const pifBody=document.getElementById('pifBody');
let pifTimer=null;

function mostrarInfoBuque(obj, e){
  clearTimeout(pifTimer);
  pifIcon.textContent='🚢';
  pifTitulo.textContent=obj.nombre;
  const misCabos=cabos.filter(c=>c.buqueId===obj.id);
  const cabosStr=misCabos.length===0?'Sin cabos':misCabos.map(c=>{
    const z=c.pctX<0.3?(obj.orientacion==='babor'?'Proa':'Popa'):c.pctX>0.7?(obj.orientacion==='babor'?'Popa':'Proa'):'Centro';
    return `${z} → Bita ${c.bitaNum}`;
  }).join('<br>');
  const proaLabel=obj.orientacion==='babor'?'← Proa':'Proa →';
  const popaLabel=obj.orientacion==='babor'?'Popa →':'← Popa';
  const etbRow=obj.etb?`<div class="pif-row"><span class="pif-label">ETB</span><span class="pif-value highlight">${obj.etb}</span></div>`:'';
  const etsRow=obj.ets?`<div class="pif-row"><span class="pif-label">ETS</span><span class="pif-value">${obj.ets}</span></div>`:'';
  const schedDivider=(obj.etb||obj.ets)?'<div class="pif-divider"></div>':'';
  pifBody.innerHTML=`
    <div class="pif-row"><span class="pif-label">Eslora</span><span class="pif-value">${obj.metros} m</span></div>
    <div class="pif-row"><span class="pif-label">Manga</span><span class="pif-value">${obj.manga} m</span></div>
    <div class="pif-row"><span class="pif-label">Moves</span><span class="pif-value highlight">${obj.moves||0}</span></div>
    <div class="pif-row"><span class="pif-label">Banda</span><span class="pif-value">${obj.orientacion.charAt(0).toUpperCase()+obj.orientacion.slice(1)}</span></div>
    <div class="pif-row"><span class="pif-label">Orientación</span><span class="pif-value" style="font-size:10px">${proaLabel} &nbsp;·&nbsp; ${popaLabel}</span></div>
    <div class="pif-row"><span class="pif-label">Bitas</span><span class="pif-value highlight">${obj.bitaDesde} → ${obj.bitaHasta}</span></div>
    <div class="pif-row"><span class="pif-label">Estado</span><span class="pif-value ${obj.locked?'warn':''}">${obj.locked?'🔒 Bloqueado':'🔓 Libre'}</span></div>
    ${schedDivider}${etbRow}${etsRow}
    ${obj.notas?`<div class="pif-divider"></div><div class="pif-row"><span class="pif-label">Nota</span><span class="pif-value" style="font-size:10px;line-height:1.5;white-space:normal">${obj.notas}</span></div>`:''}
    <div class="pif-divider"></div>
    <div class="pif-row"><span class="pif-label">Cabos</span><span class="pif-value" style="font-size:10px;line-height:1.6">${cabosStr}</span></div>
    <div class="pif-hint">Doble clic = editar · Ctrl+clic = amarrar</div>`;
  panelIF.classList.add('visible');
  if(e) posicionarTooltipArriba(e);
}

function mostrarInfoBita(b){
  clearTimeout(pifTimer);
  const tipo=b.cap===250?'Reforzada':b.cap===150?'Estándar':'Liviana';
  const cabosBita=cabos.filter(c=>c.bitaNum===b.num);
  const str=cabosBita.length===0?'Sin cabos':cabosBita.map(c=>{const bq=buques.find(b2=>b2.id===c.buqueId);return bq?bq.nombre:'?';}).join(', ');
  pifIcon.textContent='⚓';
  pifTitulo.textContent=`Bita ${b.num}`;
  pifBody.innerHTML=`
    <div class="pif-row"><span class="pif-label">Posición</span><span class="pif-value">${b.pos.toFixed(2)} m</span></div>
    <div class="pif-row"><span class="pif-label">Tipo</span><span class="pif-value">${tipo}</span></div>
    <div class="pif-row"><span class="pif-label">Capacidad</span><span class="pif-value">${b.cap} t</span></div>
    <div class="pif-divider"></div>
    <div class="pif-row"><span class="pif-label">Cabos</span><span class="pif-value" style="font-size:10px">${str}</span></div>`;
  panelIF.classList.add('visible');
}

function posicionarTooltipArriba(e){
  // Posiciona el tooltip arriba del cursor, nunca tapando el buque
  const w=panelIF.offsetWidth||240, h=panelIF.offsetHeight||160;
  let x=e.clientX - w/2;
  let y=e.clientY - h - 14;
  // Clamp horizontal
  x=Math.max(8, Math.min(x, window.innerWidth-w-8));
  // Si no cabe arriba, va abajo
  if(y<8) y=e.clientY+14;
  panelIF.style.left=x+'px';
  panelIF.style.top=y+'px';
}

function ocultarInfoPanel(){ pifTimer=setTimeout(()=>panelIF.classList.remove('visible'),120); }
panelIF.addEventListener('mouseenter',()=>clearTimeout(pifTimer));
panelIF.addEventListener('mouseleave',ocultarInfoPanel);

/* ============================================================
   PANEL INFO BITAS (modal)
============================================================ */
function buildTablaInfoBitas(){
  const tbody=document.getElementById('tablaInfoBody');
  if(!tbody) return;
  tbody.innerHTML='';
  const ds={};
  for(let i=0;i<TRAMOS.length-1;i++){if(TRAMOS[i].hasta!=='Borde')ds[TRAMOS[i].hasta]=TRAMOS[i+1].dist;}
  BITAS.forEach(b=>{
    const cls=b.cap===250?'250':b.cap===150?'150':'55';
    const sig=ds[b.num]!==undefined?ds[b.num].toFixed(2)+' m':'—';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="bita-num-cell bita-num-${cls}">${b.num}</td><td>${b.pos.toFixed(3)} m</td><td>${sig}</td><td><span class="cap-badge cap-${cls}">${b.cap} t</span></td>`;
    tbody.appendChild(tr);
  });
}

(function initPanelInfoModal(){
  const btn=document.getElementById('btnInfoBitas'),
        panel=document.getElementById('panelInfoBitas'),
        overlay=document.getElementById('overlayInfo'),
        close=document.getElementById('closeInfoBitas');
  buildTablaInfoBitas();
  function abrir(){overlay.style.display='block';panel.style.display='block';requestAnimationFrame(()=>{overlay.classList.add('visible');panel.classList.add('visible');});}
  function cerrar(){overlay.classList.remove('visible');panel.classList.remove('visible');setTimeout(()=>{overlay.style.display='none';panel.style.display='none';},240);}
  btn?.addEventListener('click',abrir);
  close?.addEventListener('click',cerrar);
  overlay?.addEventListener('click',cerrar);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('visible'))cerrar();});
})();

/* ============================================================
   COLISIONES
============================================================ */
function hayColision(x,ancho,excId){
  const sep=(window._SEPARACION_MIN_M??SEPARACION_MIN_M)*getEscala();
  for(const b of buques){if(b.id===excId)continue;const bx=parseFloat(b.el.style.left),bw=b.el.offsetWidth;if(x<bx+bw+sep&&x+ancho+sep>bx)return true;}
  return false;
}
function encontrarHueco(metros){
  const escala=getEscala(),ap=metros*escala,
        mp=(window._MARGEN_BORDE_M??MARGEN_BORDE_M)*escala,
        tw=document.getElementById('zonaBuques').clientWidth;
  for(let c=mp;c<=tw-mp-ap;c+=2){if(!hayColision(c,ap,null))return c;}
  return null;
}

/* ============================================================
   HTML BUQUE
============================================================ */
function buildCasillas(){
  return ['rgba(0,0,0,.22)','rgba(0,0,0,.14)','rgba(255,255,255,.13)','rgba(0,0,0,.18)','rgba(255,255,255,.07)','rgba(0,0,0,.20)']
    .map(c=>`<div class="casilla" style="background:${c}"></div>`).join('');
}

function buqueHTML(info){
  const grad=`linear-gradient(160deg,${info.color} 0%,${darken(info.color,22)} 100%)`;
  const notaHTML=info.notas?`<div class="buque-nota">📝 ${info.notas}</div>`:'';
  return `
    ${notaHTML}
    <div class="buque-casco" style="background:${grad}">
      <div class="buque-casilleria">${buildCasillas()}</div>
      <div class="buque-puente"><div class="buque-puente-ventana"></div></div>
      <div class="buque-popa-line"></div>
      <div class="buque-texto">
        <div class="buque-nombre">${info.nombre}</div>
        <div class="buque-metros">${info.metros}m · ${info.manga}m manga · ${info.moves||0} moves</div>
      </div>
    </div>
    <div class="lock-badge">🔒</div>`;
}

function crearBuqueEl(info){
  const escala=getEscala(),ap=info.metros*escala,alt=Math.max(30,Math.round(info.manga*escala));
  const el=document.createElement('div');
  el.className=`buque${info.orientacion==='babor'?' babor':''} entrando`;
  el.style.width=ap+'px'; el.style.height=alt+'px'; el.style.left=info.x+'px';
  el.dataset.id=info.id;
  el.innerHTML=buqueHTML(info);
  el.addEventListener('animationend',()=>el.classList.remove('entrando'),{once:true});
  return el;
}

/* ============================================================
   AGREGAR BUQUE
============================================================ */
function agregarBuque(nombre,metros,manga,color,orientacion,moves,notas){
  metros=parseFloat(metros); manga=parseFloat(manga); moves=parseInt(moves)||0;
  if(!nombre||isNaN(metros)||metros<70||isNaN(manga)||manga<8){mostrarToast('⚠ Datos inválidos');return false;}
  const xPx=encontrarHueco(metros);
  if(xPx===null){mostrarToast('⚠ No hay espacio libre');return false;}
  const id=++idCounter;
  const info={id,nombre:nombre.toUpperCase(),metros,manga,color,orientacion,moves,notas:notas||'',x:xPx};
  const el=crearBuqueEl(info);
  const obj={id,nombre:info.nombre,metros,manga,color,orientacion,moves,notas:notas||'',locked:false,el,bitaDesde:'–',bitaHasta:'–',leftM:xPx/getEscala()};
  buques.push(obj);
  document.getElementById('zonaBuques').appendChild(el);
  calcularBitas(obj); iniciarDrag(obj); iniciarHoverInfo(obj); iniciarPanelCabos(obj);
  actualizarTabla(); guardarEstado();
  mostrarToast(`✓ ${info.nombre} agregado`);
  return true;
}

/* ============================================================
   PERSISTENCIA
============================================================ */
function guardarEstado(){
  localStorage.setItem('docksim_buques',JSON.stringify(buques.map(b=>({id:b.id,nombre:b.nombre,metros:b.metros,manga:b.manga,color:b.color,orientacion:b.orientacion,moves:b.moves||0,locked:b.locked,leftM:b.leftM,notas:b.notas||''}))));
  localStorage.setItem('docksim_cabos',JSON.stringify(cabos.map(c=>({id:c.id,buqueId:c.buqueId,pctX:c.pctX,pctY:c.pctY,bitaNum:c.bitaNum}))));
  localStorage.setItem('docksim_counter',String(idCounter));
  localStorage.setItem('docksim_cabo_counter',String(caboCounter));
}

function cargarEstado(){
  try{
    const raw=localStorage.getItem('docksim_buques'),cnt=localStorage.getItem('docksim_counter');
    if(!raw){actualizarTabla();return;}
    const data=JSON.parse(raw);
    if(cnt)idCounter=parseInt(cnt);
    data.forEach(d=>{
      const escala=getEscala(),alt=Math.max(30,Math.round((d.manga||35)*escala)),xPx=(d.leftM||0)*escala;
      const info={...d,manga:d.manga||35,moves:d.moves||0,x:xPx};
      const el=crearBuqueEl(info); el.style.height=alt+'px';
      const obj={...info,el,bitaDesde:'–',bitaHasta:'–',moves:d.moves||0};
      buques.push(obj);
      document.getElementById('zonaBuques').appendChild(el);
      calcularBitas(obj); iniciarDrag(obj); iniciarHoverInfo(obj); iniciarPanelCabos(obj);
      if(obj.locked)obj.el.classList.add('locked');
    });
    actualizarTabla();
    const rawC=localStorage.getItem('docksim_cabos'),cntC=localStorage.getItem('docksim_cabo_counter');
    if(rawC){
      const cd=JSON.parse(rawC);
      if(cntC) caboCounter=parseInt(cntC);
      cd.forEach(c=>{
        const o=buques.find(b=>b.id===c.buqueId);
        if(!o) return;
        const id=c.id;
        const punto=document.createElement('div');
        punto.className='punto-amarre'; punto.dataset.id=id;
        punto.style.left=(c.pctX*100)+'%'; punto.style.top=(c.pctY*100)+'%';
        o.el.appendChild(punto);
        const line=document.createElementNS('http://www.w3.org/2000/svg','line');
        line.classList.add('cabo-linea'); line.dataset.id=id;
        svgCabos.appendChild(line);
        const cabo={id,buqueId:o.id,pctX:c.pctX,pctY:c.pctY,bitaNum:c.bitaNum,puntoEl:punto,lineaEl:line};
        cabos.push(cabo);
        actualizarLineaCabo(cabo,o);
        line.addEventListener('dblclick',()=>eliminarCabo(id));
        punto.addEventListener('dblclick',ev=>{ev.stopPropagation();eliminarCabo(id);});
      });
      actualizarTabla();
    }
  }catch(e){console.warn('Error:',e);actualizarTabla();}
}

/* ============================================================
   DRAG
============================================================ */
function iniciarDrag(obj){
  const el=obj.el;
  let arras=false,startX=0,startL=0;
  el.addEventListener('mousedown',e=>{
    if(e.ctrlKey)return;
    if(e.target.closest('.lock-badge,.panel-cabos-buque'))return;
    if(obj.locked)return;
    e.preventDefault(); arras=true; startX=e.clientX; startL=parseFloat(el.style.left);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp,{once:true});
  });
  el.addEventListener('touchstart',e=>{
    if(obj.locked)return; e.preventDefault();
    arras=true; startX=e.touches[0].clientX; startL=parseFloat(el.style.left);
    document.addEventListener('touchmove',onMoveT,{passive:false});
    document.addEventListener('touchend',onUp,{once:true});
  },{passive:false});

  function mover(cx){
    if(!arras)return;
    const escala=getEscala(),mp=MARGEN_BORDE_M*escala,zona=document.getElementById('zonaBuques');
    let newX=Math.max(mp,Math.min(startL+(cx-startX),zona.clientWidth-mp-el.offsetWidth));
    if(!hayColision(newX,el.offsetWidth,obj.id)){
      el.style.left=newX+'px'; obj.leftM=newX/escala;
      calcularBitas(obj); actualizarCabosBuque(obj); actualizarTabla();
    }
  }
  const onMove=e=>mover(e.clientX);
  const onMoveT=e=>{e.preventDefault();mover(e.touches[0].clientX);};
  function onUp(){arras=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('touchmove',onMoveT);calcularBitas(obj);actualizarTabla();guardarEstado();}

  el.addEventListener('dblclick',e=>{if(e.ctrlKey)return;e.stopPropagation();abrirModalEditar(obj);});
  el.addEventListener('click',e=>{if(!e.ctrlKey)return;e.preventDefault();e.stopPropagation();iniciarModoAmarre(obj,e);});
}

function iniciarHoverInfo(obj){
  const el=obj.el;
  el.addEventListener('mouseenter',e=>{clearTimeout(pifTimer);mostrarInfoBuque(obj,e);});
  el.addEventListener('mousemove',e=>{if(panelIF.classList.contains('visible'))posicionarTooltipArriba(e);});
  el.addEventListener('mouseleave',ocultarInfoPanel);
}

/* ============================================================
   MODO CTRL
============================================================ */
document.addEventListener('keydown',e=>{if(e.key==='Control')document.body.classList.add('ctrl-mode');});
document.addEventListener('keyup',  e=>{if(e.key==='Control')document.body.classList.remove('ctrl-mode');});

/* ============================================================
   SISTEMA CABOS (SVG)
============================================================ */
const svgCabos=document.getElementById('svgCabos');

function coordsBuque(obj, pctX, pctY){
  const zona=document.getElementById('zonaBuques');
  const escala=getEscala();
  const x=(obj.leftM||0)*escala + pctX*(obj.metros*escala);
  const zonaH=zona.clientHeight;
  const buqueH=Math.max(30, Math.round(obj.manga*escala));
  const y=zonaH - buqueH + pctY*buqueH;
  return {x, y};
}

function coordsBita(bitaNum){
  const bita=BITAS.find(b=>b.num===bitaNum);
  if(!bita) return null;
  const escala=getEscala();
  const zona=document.getElementById('zonaBuques');
  const x=bita.pos*escala;
  const y=zona.clientHeight+12;
  return {x, y};
}

function clientToZona(clientX, clientY){
  const zona=document.getElementById('zonaBuques');
  const r=zona.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

function clickToPct(obj, clientX, clientY){
  const elR=obj.el.getBoundingClientRect();
  return {
    pctX: Math.max(0,Math.min(1,(clientX-elR.left)/elR.width)),
    pctY: Math.max(0,Math.min(1,(clientY-elR.top)/elR.height))
  };
}

function getBitaPos(bitaNum){ return coordsBita(bitaNum); }
function getPuntoPos(obj,pctX,pctY){ return coordsBuque(obj,pctX,pctY); }

function crearCabo(obj,pctX,pctY,bitaNum,idForzado){
  const id=idForzado!==undefined?idForzado:++caboCounter;
  const punto=document.createElement('div');
  punto.className='punto-amarre'; punto.dataset.id=id;
  punto.style.left=(pctX*100)+'%'; punto.style.top=(pctY*100)+'%';
  obj.el.appendChild(punto);
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.classList.add('cabo-linea'); line.dataset.id=id;
  svgCabos.appendChild(line);
  const cabo={id,buqueId:obj.id,pctX,pctY,bitaNum,puntoEl:punto,lineaEl:line};
  cabos.push(cabo);
  actualizarLineaCabo(cabo,obj);
  line.addEventListener('dblclick',()=>eliminarCabo(id));
  punto.addEventListener('dblclick',e=>{e.stopPropagation();eliminarCabo(id);});
  actualizarPanelCabosBuque(obj);
  actualizarTabla();
  return cabo;
}

function actualizarLineaCabo(cabo,obj){
  if(!obj)obj=buques.find(b=>b.id===cabo.buqueId);
  if(!obj)return;
  const p1=getPuntoPos(obj,cabo.pctX,cabo.pctY),p2=getBitaPos(cabo.bitaNum);
  if(!p1||!p2)return;
  cabo.lineaEl.setAttribute('x1',p1.x); cabo.lineaEl.setAttribute('y1',p1.y);
  cabo.lineaEl.setAttribute('x2',p2.x); cabo.lineaEl.setAttribute('y2',p2.y);
}
function actualizarCabosBuque(obj){cabos.filter(c=>c.buqueId===obj.id).forEach(c=>actualizarLineaCabo(c,obj));}

function eliminarCabo(caboId){
  const idx=cabos.findIndex(c=>c.id===caboId);
  if(idx===-1)return;
  const cabo=cabos[idx];
  cabo.puntoEl.remove(); cabo.lineaEl.remove(); cabos.splice(idx,1);
  const obj=buques.find(b=>b.id===cabo.buqueId);
  if(obj)actualizarPanelCabosBuque(obj);
  actualizarTabla(); guardarEstado();
}

let amarreEnCurso=null;
function iniciarModoAmarre(obj,e){
  if(amarreEnCurso)cancelarAmarre();
  const pct=clickToPct(obj,e.clientX,e.clientY);
  const pctX=pct.pctX, pctY=pct.pctY;
  const p1=coordsBuque(obj,pctX,pctY);
  const lp=document.createElementNS('http://www.w3.org/2000/svg','line');
  lp.classList.add('cabo-preview'); svgCabos.appendChild(lp);
  lp.setAttribute('x1',p1.x); lp.setAttribute('y1',p1.y);
  lp.setAttribute('x2',p1.x); lp.setAttribute('y2',p1.y);
  amarreEnCurso={obj,pctX,pctY,lineaPreview:lp};
  document.body.classList.add('amarre-activo');
  mostrarToast('🎯 Clic en una bita para amarrar · ESC cancela');
  document.addEventListener('mousemove',onPreviewMove);
  document.addEventListener('click',onBitaClick,{capture:true});
  document.addEventListener('keydown',onEscAmarre);
}
function onPreviewMove(e){
  if(!amarreEnCurso)return;
  const pos=clientToZona(e.clientX,e.clientY);
  amarreEnCurso.lineaPreview.setAttribute('x2',pos.x);
  amarreEnCurso.lineaPreview.setAttribute('y2',pos.y);
}
function onBitaClick(e){
  if(!amarreEnCurso)return;
  const bitaEl=e.target.closest('.bita');
  if(!bitaEl)return;
  e.stopPropagation(); e.preventDefault();
  const{obj,pctX,pctY}=amarreEnCurso,bitaNum=parseInt(bitaEl.dataset.num);
  cancelarAmarre();
  crearCabo(obj,pctX,pctY,bitaNum);
  guardarEstado();
  mostrarToast(`✓ Cabo → Bita ${bitaNum}`);
}
function onEscAmarre(e){if(e.key==='Escape')cancelarAmarre();}
function cancelarAmarre(){
  if(!amarreEnCurso)return;
  amarreEnCurso.lineaPreview.remove();
  document.body.classList.remove('amarre-activo');
  document.removeEventListener('mousemove',onPreviewMove);
  document.removeEventListener('click',onBitaClick,{capture:true});
  document.removeEventListener('keydown',onEscAmarre);
  amarreEnCurso=null;
}

/* ============================================================
   PANEL CABOS EN BUQUE
============================================================ */
function iniciarPanelCabos(obj){ /* los cabos viven en la tabla flotante */ }
function actualizarPanelCabosBuque(obj){ actualizarTabla(); }

/* ============================================================
   TABLA FLOTANTE BUQUES
============================================================ */
function actualizarTabla(){
  const tbody=document.getElementById('tablaBody'),
        emptyEl=document.getElementById('panelEmpty'),
        tablaEl=document.getElementById('tablaBuques');
  if(!tbody)return;
  tbody.innerHTML='';
  if(buques.length===0){emptyEl.style.display='block';tablaEl.style.display='none';}
  else{emptyEl.style.display='none'; tablaEl.style.display='table';}

  buques.forEach(obj=>{
    const misCabos=cabos.filter(c=>c.buqueId===obj.id);
    const tr=document.createElement('tr');
    tr.className='fila-buque';
    tr.innerHTML=`
      <td><span class="color-dot" style="background:${obj.color}"></span></td>
      <td style="font-weight:700">${obj.nombre}</td>
      <td>${obj.orientacion.charAt(0).toUpperCase()+obj.orientacion.slice(1)}</td>
      <td>${obj.metros} m</td>
      <td>${obj.manga} m</td>
      <td>${obj.moves||0}</td>
      <td>${obj.bitaDesde} → ${obj.bitaHasta}</td>
      <td><button class="lock-btn-table" data-id="${obj.id}">${obj.locked?'🔒':'🔓'}</button></td>
      <td>
        <button class="btn-toggle-cabos" data-id="${obj.id}" title="${misCabos.length} cabo(s)">
          ⚓${misCabos.length>0?`<span class="cabo-count"> ${misCabos.length}</span>`:''}
        </button>
      </td>`;
    tbody.appendChild(tr);

    const trCabos=document.createElement('tr');
    trCabos.className='fila-cabos-wrap';
    trCabos.id=`tcr-${obj.id}`;
    const tdCabos=document.createElement('td');
    tdCabos.colSpan=9;
    const inner=document.createElement('div');
    inner.className='fila-cabos-inner';
    if(misCabos.length===0){
      inner.innerHTML='<span class="tcr-empty">Sin cabos amarrados</span>';
    } else {
      misCabos.forEach(c=>{
        const z=c.pctX<0.3?(obj.orientacion==='babor'?'Proa':'Popa'):c.pctX>0.7?(obj.orientacion==='babor'?'Popa':'Proa'):'Centro';
        const item=document.createElement('div'); item.className='tcr-item';
        item.innerHTML=`<div class="tcr-dot"></div><span>${z} → Bita ${c.bitaNum}</span><button class="tcr-eliminar" data-cabo="${c.id}">✕</button>`;
        inner.appendChild(item);
      });
    }
    tdCabos.appendChild(inner);
    trCabos.appendChild(tdCabos);
    tbody.appendChild(trCabos);
    if(caboRowsOpen.has(obj.id)) trCabos.classList.add('abierto');
  });

  // Actualizar side panel y stats
  actualizarSidePanel();
}

/* ============================================================
   SIDE PANEL (lista derecha del redesign)
============================================================ */
function actualizarSidePanel(){
  const list=document.getElementById('shipList'); if(!list) return;
  const filtro=(document.getElementById('searchInput')?.value||'').toLowerCase();

  // Ordenar por ETB — con ETB primero (más próximo), luego sin ETB
  const sorted=[...buques].sort((a,b)=>{
    if(a.etb&&b.etb) return new Date(a.etb)-new Date(b.etb);
    if(a.etb) return -1;
    if(b.etb) return 1;
    return 0;
  });

  const visible=filtro?sorted.filter(b=>b.nombre.toLowerCase().includes(filtro)||b.orientacion.toLowerCase().includes(filtro)||b.bitaDesde.toString().includes(filtro)||b.bitaHasta.toString().includes(filtro)):sorted;
  list.innerHTML='';
  visible.forEach(s=>{
    const row=document.createElement('div');
    row.className='ship-row';
    row.style.setProperty('--ship-color',s.color);
    const etbStr=s.etb?`<span style="color:var(--accent);font-weight:700">${s.etb}</span>`:'';
    row.innerHTML=`
      <div class="ship-row-color"></div>
      <div class="ship-row-info">
        <div class="ship-row-name">${s.nombre}</div>
        <div class="ship-row-meta">
          <span><b>${s.metros}</b>m</span>
          <span><b>${s.manga}</b>m</span>
          <span><b>${s.moves||0}</b> mv</span>
          ${etbStr?`<span>· ETB ${etbStr}</span>`:`<span style="color:var(--text-3)">· ${cabos.filter(c=>c.buqueId===s.id).length} cabos</span>`}
        </div>
      </div>
      <div class="ship-row-tag ${s.orientacion}">${s.orientacion==='estribor'?'EST':'BAB'}</div>`;
    row.addEventListener('click',()=>{ $$('.ship-row').forEach(r=>r.classList.remove('active')); row.classList.add('active'); mostrarInfoBuque(s); });
    row.addEventListener('dblclick',()=>abrirModalEditar(s));
    list.appendChild(row);
  });

  // Stats topbar y side
  const nBuques=buques.length;
  const totalM=buques.reduce((s,b)=>s+b.metros,0);
  const pct=Math.round(totalM/MUELLE_METROS_TOTAL*100);
  const nCabosTotal=cabos.length;
  const bitasUsadas=new Set(cabos.map(c=>c.bitaNum)).size;

  const tbB=document.getElementById('tbBuquesN');
  const tbM=document.getElementById('tbMetrosN');
  if(tbB) tbB.textContent=nBuques;
  if(tbM) tbM.textContent=`${totalM.toFixed(0)} m`;

  const sc=document.getElementById('sideCount');
  if(sc) sc.textContent=String(nBuques).padStart(2,'0');

  const sp=document.getElementById('statOcupPct');
  const sm=document.getElementById('statOcupM');
  const scn=document.getElementById('statCabosN');
  const scb=document.getElementById('statCabosBitas');
  if(sp) sp.innerHTML=`${pct}<span style="font-size:14px;color:var(--text-3)">%</span>`;
  if(sm) sm.textContent=`${totalM.toFixed(0)} / ${Math.round(MUELLE_METROS_TOTAL)} m`;
  if(scn) scn.textContent=nCabosTotal;
  if(scb) scb.textContent=`en ${bitasUsadas} bita${bitasUsadas!==1?'s':''}`;
}

// Delegación eventos tabla
document.getElementById('tablaBody').addEventListener('click',e=>{
  const lockBtn=e.target.closest('.lock-btn-table');
  if(lockBtn){
    const obj=buques.find(b=>b.id===parseInt(lockBtn.dataset.id));
    if(obj){obj.locked=!obj.locked;obj.el.classList.toggle('locked',obj.locked);actualizarTabla();guardarEstado();mostrarToast(obj.locked?`🔒 ${obj.nombre}`:`🔓 ${obj.nombre}`);}
    return;
  }
  const caboToggle=e.target.closest('.btn-toggle-cabos');
  if(caboToggle){
    const id=parseInt(caboToggle.dataset.id);
    const tr=document.getElementById(`tcr-${id}`);
    if(tr){
      const open=tr.classList.toggle('abierto');
      if(open) caboRowsOpen.add(id); else caboRowsOpen.delete(id);
    }
    return;
  }
  const elim=e.target.closest('.tcr-eliminar');
  if(elim){eliminarCabo(parseInt(elim.dataset.cabo));}
});

// Filtro side panel
document.getElementById('searchInput')?.addEventListener('input',()=>actualizarSidePanel());

/* ============================================================
   PANEL TOGGLE
============================================================ */
(function initPanel(){
  const btn=document.getElementById('panelToggle'),body=document.getElementById('panelBody');
  let col=false;
  btn.addEventListener('click',e=>{e.stopPropagation();col=!col;body.classList.toggle('collapsed',col);btn.textContent=col?'▲':'▼';});
})();

/* ============================================================
   MODAL AGREGAR
============================================================ */
(function initModalAgregar(){
  const overlay=document.getElementById('overlayAgregar'),
        modal=document.getElementById('modalAgregar'),
        segBanda=document.getElementById('seg-banda'),
        swEl=document.getElementById('colorSwatches');
  let bandaVal='estribor',mangaTocada=false;

  PALETTE.forEach(c=>{
    const s=document.createElement('div'); s.className='swatch'; s.style.background=c;
    s.addEventListener('click',()=>{document.getElementById('inp-color').value=c;$$('.swatch',swEl).forEach(x=>x.classList.remove('selected'));s.classList.add('selected');});
    swEl.appendChild(s);
  });

  function colorRandom(){document.getElementById('inp-color').value=randomPastel();$$('.swatch',swEl).forEach(x=>x.classList.remove('selected'));}
  document.getElementById('btnRandomColor').addEventListener('click',colorRandom);
  segBanda.querySelectorAll('.seg-btn').forEach(btn=>btn.addEventListener('click',()=>{segBanda.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');bandaVal=btn.dataset.val;}));
  document.getElementById('inp-manga').addEventListener('input',()=>{mangaTocada=true;});
  document.getElementById('inp-metros').addEventListener('input',()=>{if(!mangaTocada&&document.getElementById('inp-metros').value)document.getElementById('inp-manga').value=mangaPorDefecto(document.getElementById('inp-metros').value);});

  function abrir(){
    document.getElementById('inp-nombre').value='';document.getElementById('inp-metros').value='';document.getElementById('inp-manga').value='';
    mangaTocada=false; colorRandom(); bandaVal='estribor';
    segBanda.querySelectorAll('.seg-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
    overlay.style.display='block';modal.style.display='block';
    requestAnimationFrame(()=>{overlay.classList.add('visible');modal.classList.add('visible');});
    setTimeout(()=>document.getElementById('inp-nombre').focus(),230);
  }
  function cerrar(){overlay.classList.remove('visible');modal.classList.remove('visible');setTimeout(()=>{overlay.style.display='none';modal.style.display='none';},230);}

  document.getElementById('btnAgregarBuque').addEventListener('click',abrir);
  document.getElementById('closeAgregar').addEventListener('click',cerrar);
  document.getElementById('cancelAgregar').addEventListener('click',cerrar);
  overlay.addEventListener('click',cerrar);
  document.getElementById('confirmAgregar').addEventListener('click',()=>{
    const nombre=document.getElementById('inp-nombre').value.trim(),
          metros=document.getElementById('inp-metros').value,
          manga=document.getElementById('inp-manga').value,
          color=document.getElementById('inp-color').value,
          moves=document.getElementById('inp-moves').value;
    if(!nombre){document.getElementById('inp-nombre').focus();mostrarToast('⚠ Ingresá el nombre');return;}
    if(!metros||parseFloat(metros)<70){document.getElementById('inp-metros').focus();mostrarToast('⚠ Eslora mínima 70 m');return;}
    if(!manga||parseFloat(manga)<8){document.getElementById('inp-manga').focus();mostrarToast('⚠ Manga mínima 8 m');return;}
    const notas=document.getElementById('inp-notas').value.trim();
    if(agregarBuque(nombre,metros,manga,color,bandaVal,moves,notas))cerrar();
  });
  [document.getElementById('inp-nombre'),document.getElementById('inp-metros'),document.getElementById('inp-manga')].forEach(inp=>inp?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('confirmAgregar').click();}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('visible'))cerrar();});
})();

/* ============================================================
   MODAL EDITAR
============================================================ */
let objEditando=null;
let pendienteBandaChange=null;

function abrirModalConfirmBanda(nCabos){
  const modal=document.getElementById('modalConfirmBanda');
  const msg=document.getElementById('confirmBandaMsg');
  if(msg) msg.textContent=`Este buque tiene ${nCabos} cabo${nCabos!==1?'s':''} amarrado${nCabos!==1?'s':''}. Al cambiar de banda se eliminarán. ¿Continuar?`;
  modal.style.display='block';
  requestAnimationFrame(()=>modal.classList.add('visible'));
}

function cerrarModalConfirmBanda(){
  const modal=document.getElementById('modalConfirmBanda');
  modal.classList.remove('visible');
  setTimeout(()=>{ modal.style.display='none'; },230);
  pendienteBandaChange=null;
}

function aplicarCambioBanda(){
  if(!pendienteBandaChange) return;
  const {obj,nombre,metros,manga,color,banda,moves,newX,escala,ap,alt}=pendienteBandaChange;
  cabos.filter(c=>c.buqueId===obj.id).forEach(c=>{ c.puntoEl?.remove(); c.lineaEl?.remove(); });
  cabos=cabos.filter(c=>c.buqueId!==obj.id);
  obj.nombre=nombre; obj.metros=metros; obj.manga=manga; obj.color=color; obj.orientacion=banda; obj.moves=moves; obj.leftM=newX/escala;
  obj.el.className=`buque${banda==='babor'?' babor':''}${obj.locked?' locked':''}`;
  obj.el.style.width=ap+'px'; obj.el.style.height=alt+'px'; obj.el.style.left=newX+'px';
  obj.el.innerHTML=buqueHTML(obj);
  iniciarPanelCabos(obj);
  calcularBitas(obj); actualizarTabla(); guardarEstado();
  mostrarToast(`✓ ${obj.nombre} actualizado · cabos eliminados`);
  cerrarModalConfirmBanda();
}

function abrirModalEditar(obj){
  objEditando=obj;
  const overlay=document.getElementById('overlayEditar'),
        modal=document.getElementById('modalEditar'),
        segBanda=document.getElementById('seg-edit-banda');
  document.getElementById('edit-nombre').value=obj.nombre;
  document.getElementById('edit-metros').value=obj.metros;
  document.getElementById('edit-manga').value=obj.manga;
  document.getElementById('edit-color').value=obj.color;
  document.getElementById('edit-moves').value=obj.moves||0;
  document.getElementById('edit-notas').value=obj.notas||'';
  segBanda.querySelectorAll('.seg-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.val===obj.orientacion));
  overlay.style.display='block';modal.style.display='block';
  requestAnimationFrame(()=>{overlay.classList.add('visible');modal.classList.add('visible');});
}

(function initModalEditar(){
  const overlay=document.getElementById('overlayEditar'),
        modal=document.getElementById('modalEditar'),
        segBanda=document.getElementById('seg-edit-banda');
  segBanda.querySelectorAll('.seg-btn').forEach(btn=>btn.addEventListener('click',()=>{segBanda.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}));
  document.getElementById('editBtnRandom').addEventListener('click',()=>{document.getElementById('edit-color').value=randomPastel();});
  function cerrar(){overlay.classList.remove('visible');modal.classList.remove('visible');setTimeout(()=>{overlay.style.display='none';modal.style.display='none';},230);objEditando=null;}
  document.getElementById('closeEditar').addEventListener('click',cerrar);
  document.getElementById('cancelEditar').addEventListener('click',cerrar);
  overlay.addEventListener('click',cerrar);
  document.getElementById('confirmEditar').addEventListener('click',()=>{
    if(!objEditando)return;
    const obj=objEditando,
          nombre=document.getElementById('edit-nombre').value.trim(),
          metros=parseFloat(document.getElementById('edit-metros').value),
          manga=parseFloat(document.getElementById('edit-manga').value),
          color=document.getElementById('edit-color').value,
          moves=parseInt(document.getElementById('edit-moves').value)||0;
    const banda=segBanda.querySelector('.seg-btn.active')?.dataset.val||obj.orientacion;
    const notas=document.getElementById('edit-notas').value.trim();
    if(!nombre){mostrarToast('⚠ Nombre requerido');return;}
    if(isNaN(metros)||metros<70){mostrarToast('⚠ Eslora mínima 70 m');return;}
    if(isNaN(manga)||manga<8){mostrarToast('⚠ Manga mínima 8 m');return;}
    const escala=getEscala(),ap=metros*escala,alt=Math.max(30,Math.round(manga*escala));
    const zona=document.getElementById('zonaBuques'),mp=MARGEN_BORDE_M*escala;
    let newX=parseFloat(obj.el.style.left);
    if(hayColision(newX,ap,obj.id)){mostrarToast('⚠ No cabe con ese tamaño');return;}
    newX=Math.max(mp,Math.min(newX,zona.clientWidth-mp-ap));
    const cabosBuque=cabos.filter(c=>c.buqueId===obj.id);
    if(banda!==obj.orientacion&&cabosBuque.length>0){
      pendienteBandaChange={obj,nombre:nombre.toUpperCase(),metros,manga,color,banda,moves,newX,escala,ap,alt};
      cerrar();
      abrirModalConfirmBanda(cabosBuque.length);
      return;
    }
    obj.nombre=nombre.toUpperCase();obj.metros=metros;obj.manga=manga;obj.color=color;obj.orientacion=banda;obj.moves=moves;obj.notas=notas;obj.leftM=newX/escala;
    obj.el.className=`buque${banda==='babor'?' babor':''}${obj.locked?' locked':''}`;
    obj.el.style.width=ap+'px';obj.el.style.height=alt+'px';obj.el.style.left=newX+'px';
    obj.el.innerHTML=buqueHTML(obj);
    iniciarPanelCabos(obj);
    cabos.filter(c=>c.buqueId===obj.id).forEach(c=>{
      const p=document.createElement('div');p.className='punto-amarre';p.dataset.id=c.id;
      p.style.left=(c.pctX*100)+'%';p.style.top=(c.pctY*100)+'%';
      p.addEventListener('dblclick',e=>{e.stopPropagation();eliminarCabo(c.id);});
      obj.el.appendChild(p);c.puntoEl=p;
    });
    actualizarCabosBuque(obj); actualizarPanelCabosBuque(obj); calcularBitas(obj);
    actualizarTabla(); guardarEstado(); cerrar();
    mostrarToast(`✓ ${obj.nombre} actualizado`);
  });
  document.getElementById('eliminarBuque').addEventListener('click',()=>{
    if(!objEditando)return;
    const obj=objEditando; cerrar();
    cabos.filter(c=>c.buqueId===obj.id).forEach(c=>{c.puntoEl?.remove();c.lineaEl?.remove();});
    cabos=cabos.filter(c=>c.buqueId!==obj.id);
    obj.el.classList.add('saliendo');
    setTimeout(()=>{obj.el.remove();buques=buques.filter(b=>b.id!==obj.id);actualizarTabla();guardarEstado();mostrarToast(`🗑 ${obj.nombre} eliminado`);},300);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('visible'))cerrar();});
})();

(function initModalConfirmBanda(){
  const modal=document.getElementById('modalConfirmBanda');
  if(!modal) return;
  document.getElementById('confirmBandaSi')?.addEventListener('click',aplicarCambioBanda);
  document.getElementById('confirmBandaNo')?.addEventListener('click',cerrarModalConfirmBanda);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('visible')) cerrarModalConfirmBanda(); });
})();

/* ============================================================
   CONFIG IMPRESIÓN
============================================================ */
const printConfig = {
  banda: true, eslora: true, manga: true, moves: true,
  bitas: true, cabos: true,
  'diag-cabos': true, 'diag-bitas': true, 'diag-regla': true
};

(function initModalConfig(){
  const overlay=document.getElementById('overlayConfig'), modal=document.getElementById('modalConfig');
  function abrir(){
    $$('.print-col-toggle').forEach(cb=>{ cb.checked = printConfig[cb.dataset.col] !== false; });
    overlay.style.display='block'; modal.style.display='block';
    requestAnimationFrame(()=>{ overlay.classList.add('visible'); modal.classList.add('visible'); });
  }
  function cerrar(){
    $$('.print-col-toggle').forEach(cb=>{ printConfig[cb.dataset.col]=cb.checked; });
    overlay.classList.remove('visible'); modal.classList.remove('visible');
    setTimeout(()=>{ overlay.style.display='none'; modal.style.display='none'; }, 230);
  }
  document.getElementById('btnConfig')?.addEventListener('click', abrir);
  document.getElementById('closeConfig')?.addEventListener('click', cerrar);
  document.getElementById('closeConfigOk')?.addEventListener('click', cerrar);
  overlay?.addEventListener('click', cerrar);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.classList.contains('visible')) cerrar(); });
})();

/* ============================================================
   IMPRIMIR
============================================================ */
function darken2(hex,amt){return darken(hex,amt);}
function lighten2(hex,amt){return lighten(hex,amt);}

function renderizarCanvas(){
  const canvas=document.getElementById('printCanvas');
  // Usamos el ancho del muelle visual — siempre disponible independiente del tema
  const zona=document.getElementById('zonaBuques');
  const muelle=document.getElementById('muelle');
  // Forzar que la zona esté visible para que getBoundingClientRect sea correcto
  const zonaR=zona.getBoundingClientRect();
  const muelleR=muelle.getBoundingClientRect();
  const escala=getEscala();
  const alturaMaxBuque=buques.reduce((max,obj)=>Math.max(max,Math.max(30,Math.round(obj.manga*escala))),60);
  const aguaVisible=alturaMaxBuque+40;
  const muelleH=muelleR.height;
  const W=Math.round(zonaR.width);
  const DPR=2;
  canvas.width=W*DPR; canvas.height=(aguaVisible+muelleH)*DPR;
  canvas.style.width=W+'px'; canvas.style.height=(aguaVisible+muelleH)+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(DPR,DPR);
  const gradAgua=ctx.createLinearGradient(0,0,0,aguaVisible);
  gradAgua.addColorStop(0,'#e8f8fd');gradAgua.addColorStop(0.4,'#cceef8');gradAgua.addColorStop(1,'#b0e0f0');
  ctx.fillStyle=gradAgua; ctx.fillRect(0,0,W,aguaVisible);
  ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1;
  for(let y=0;y<aguaVisible;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  buques.forEach(obj=>{
    const buqueW=obj.metros*escala,buqueH=Math.max(30,Math.round(obj.manga*escala));
    const x=(obj.leftM||0)*escala,y=aguaVisible-buqueH,r=Math.min(buqueH/2,buqueW*0.12);
    ctx.shadowColor='rgba(0,0,0,0.28)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
    function cascoPath(){ctx.beginPath();if(obj.orientacion==='babor'){ctx.moveTo(x+buqueW,y);ctx.lineTo(x+r,y);ctx.arc(x+r,y+buqueH/2,r,Math.PI*1.5,Math.PI*0.5,true);ctx.lineTo(x+buqueW,y+buqueH);}else{ctx.moveTo(x,y);ctx.lineTo(x+buqueW-r,y);ctx.arc(x+buqueW-r,y+buqueH/2,r,Math.PI*1.5,Math.PI*0.5,false);ctx.lineTo(x,y+buqueH);}ctx.closePath();}
    cascoPath();
    const grad=ctx.createLinearGradient(x,y,x+buqueW,y+buqueH);
    grad.addColorStop(0,lighten(obj.color,30));grad.addColorStop(1,lighten(obj.color,10));
    ctx.fillStyle=grad;ctx.fill();
    cascoPath();ctx.strokeStyle=darken(obj.color,35);ctx.lineWidth=2.5;ctx.stroke();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.save();cascoPath();ctx.clip();
    const casW=buqueW*0.20,casX=obj.orientacion==='babor'?x+buqueW-casW-6:x+6;
    ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(casX,y+buqueH*0.15,casW,buqueH*0.7);
    const pteW=buqueW*0.09,pteX=obj.orientacion==='babor'?x+6:x+buqueW-pteW-6;
    ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(pteX,y+buqueH*0.18,pteW,buqueH*0.64);
    ctx.fillStyle='rgba(255,235,100,0.85)';ctx.fillRect(pteX+pteW*0.25,y+buqueH*0.38,pteW*0.5,buqueH*0.18);
    const fontSize=Math.max(9,Math.min(14,buqueH*0.22));
    ctx.fillStyle='rgba(255,255,255,0.95)';ctx.font=`bold ${fontSize}px Syne,Inter,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,0.45)';ctx.shadowBlur=3;
    ctx.fillText(obj.nombre,x+buqueW/2,y+buqueH/2-fontSize*0.4);
    const subSize=Math.max(7,fontSize*0.7);ctx.font=`${subSize}px "JetBrains Mono",monospace`;
    ctx.fillStyle='rgba(255,255,255,0.62)';ctx.fillText(`${obj.metros}m · ${obj.manga}m manga · ${obj.moves||0} moves`,x+buqueW/2,y+buqueH/2+subSize);
    ctx.shadowBlur=0;ctx.restore();
  });
  if(printConfig['diag-cabos']){
    ctx.strokeStyle='#ff6600';ctx.lineWidth=2;ctx.lineCap='round';ctx.shadowColor='rgba(255,100,0,0.45)';ctx.shadowBlur=5;
    cabos.forEach(cabo=>{
      const obj=buques.find(b=>b.id===cabo.buqueId);if(!obj)return;
      const bw=obj.metros*escala,bh=Math.max(30,Math.round(obj.manga*escala)),bx=(obj.leftM||0)*escala,by=aguaVisible-bh;
      const px=bx+cabo.pctX*bw,py=by+cabo.pctY*bh;
      const bitaData=BITAS.find(b=>b.num===cabo.bitaNum);if(!bitaData)return;
      const qx=bitaData.pos*escala,qy=aguaVisible+14;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(qx,qy);ctx.stroke();
      ctx.fillStyle='#ff6600';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill();
    });
    ctx.shadowBlur=0;
  }
  const my=aguaVisible;
  ctx.fillStyle='rgba(180,220,230,0.35)';ctx.fillRect(0,my,W,6);
  ctx.fillStyle='#e8e8e8';ctx.fillRect(0,my+6,W,muelleH-6);
  ctx.strokeStyle='rgba(0,0,0,0.06)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,my+6);ctx.lineTo(x,my+muelleH);ctx.stroke();}
  ctx.fillStyle='#aaa';ctx.fillRect(0,my+6,W,2);
  if(printConfig['diag-bitas']){
    BITAS.forEach(b=>{
      const bx=b.pos*escala,topY=my+10,palH=16,cr=b.cap===250?6:b.cap===150?5:4;
      const esLado212=b.num>=201&&b.num<=212,palColor=esLado212?'#b02020':'#111',headColor=esLado212?'#e04030':'#111';
      ctx.strokeStyle=palColor;ctx.lineWidth=b.cap===250?2.5:2;
      ctx.beginPath();ctx.moveTo(bx,topY);ctx.lineTo(bx,topY+palH);ctx.stroke();
      ctx.fillStyle=headColor;ctx.shadowColor='rgba(0,0,0,0.18)';ctx.shadowBlur=2;
      ctx.beginPath();ctx.arc(bx,topY+palH,cr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#111';ctx.font=`bold ${b.cap===250?10:9}px "JetBrains Mono",monospace`;
      ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(String(b.num),bx,topY+palH+cr+2);
    });
  }
  if(printConfig['diag-regla']){
    const reglaLineY=my+muelleH-10;
    ctx.strokeStyle='#444';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(0,reglaLineY);ctx.lineTo(W,reglaLineY);ctx.stroke();
    for(let m=0;m<=MUELLE_METROS_TOTAL;m+=50){
      const rx=m*escala;ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rx,reglaLineY-4);ctx.lineTo(rx,reglaLineY+4);ctx.stroke();
      ctx.fillStyle='#222';ctx.font='bold 8px "JetBrains Mono",monospace';ctx.textAlign=m===0?'left':'center';ctx.textBaseline='bottom';ctx.fillText(m+'m',rx+(m===0?2:0),reglaLineY-5);
    }
  }
}

function prepararPrintZone(){
  const now=new Date();
  const fecha=`${now.toLocaleDateString('es-UY',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} — ${now.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}`;
  const fechaCorta=`${now.toLocaleDateString('es-UY')} ${now.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}`;
  document.getElementById('pzFecha').textContent=fecha;
  document.getElementById('pzFechaFooter').textContent=fechaCorta;
  const nB=buques.length,nC=cabos.length,metros=buques.reduce((s,b)=>s+b.metros,0);
  document.getElementById('pzStats').textContent=`${nB} buque${nB!==1?'s':''} · ${nC} cabo${nC!==1?'s':''} · ${metros.toFixed(0)} m ocupados`;
  renderizarCanvas();
  const colMap={banda:2,eslora:3,manga:4,moves:5,bitas:6,cabos:7};
  const thead=document.querySelector('#pzTabla thead tr');
  if(thead){Object.entries(colMap).forEach(([key,idx])=>{const th=thead.children[idx];if(th)th.style.display=printConfig[key]?'':'none';});}
  const tbody=document.getElementById('pzTablaBody'); tbody.innerHTML='';
  buques.forEach((obj,i)=>{
    const misCabos=cabos.filter(c=>c.buqueId===obj.id);
    const cabosTags=misCabos.length===0?'<span style="color:#aaa">—</span>':misCabos.map(c=>{const z=c.pctX<0.3?(obj.orientacion==='babor'?'Proa':'Popa'):c.pctX>0.7?(obj.orientacion==='babor'?'Popa':'Proa'):'Centro';return `<span class="pz-cabo-tag">${z} → ${c.bitaNum}</span>`;}).join('');
    const tr=document.createElement('tr');
    tr.innerHTML=[
      `<td style="color:#888;font-size:9px">${i+1}</td>`,
      `<td><span class="pz-color-dot" style="background:${obj.color}"></span><strong>${obj.nombre}</strong></td>`,
      `<td style="display:${printConfig.banda?'':'none'}">${obj.orientacion.charAt(0).toUpperCase()+obj.orientacion.slice(1)}</td>`,
      `<td style="display:${printConfig.eslora?'':'none'}">${obj.metros} m</td>`,
      `<td style="display:${printConfig.manga?'':'none'}">${obj.manga} m</td>`,
      `<td style="display:${printConfig.moves?'':'none'}">${obj.moves||0}</td>`,
      `<td style="display:${printConfig.bitas?'':'none'}">${obj.bitaDesde} → ${obj.bitaHasta}</td>`,
      `<td style="display:${printConfig.cabos?'':'none'}">${cabosTags}</td>`
    ].join('');
    tbody.appendChild(tr);
  });
}

(function initImprimir(){
  function imprimir(){
    mostrarToast('🖨️ Preparando...');
    setTimeout(()=>{
      prepararPrintZone();
      // Breve delay para que el canvas renderice antes del print dialog
      setTimeout(()=>window.print(), 500);
    },200);
  }
  document.getElementById('btnImprimir')?.addEventListener('click',imprimir);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();imprimir();}});
})();

/* ============================================================
   TOAST
============================================================ */
let toastTimer=null;
function mostrarToast(msg){
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),2800);
}

/* ============================================================
   RESIZE
============================================================ */
window.addEventListener('resize',()=>{
  const escala=getEscala(),zona=document.getElementById('zonaBuques'),
        mp=(window._MARGEN_BORDE_M??MARGEN_BORDE_M)*escala;
  buques.forEach(obj=>{
    const ap=obj.metros*escala,alt=Math.max(30,Math.round(obj.manga*escala));
    let newX=Math.max(mp,Math.min((obj.leftM||0)*escala,zona.clientWidth-mp-ap));
    obj.el.style.width=ap+'px';obj.el.style.height=alt+'px';obj.el.style.left=newX+'px';
    calcularBitas(obj); actualizarCabosBuque(obj);
  });
  generarBitas(); actualizarTabla();
});

/* ============================================================
   TWEAKS: temas + realista (teclas rápidas)
============================================================ */
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if(e.key==='r'||e.key==='R'){
    const cur=document.body.dataset.realistic==='true';
    document.body.dataset.realistic=String(!cur);
    mostrarToast(cur?'Vista plana':'Vista realista');
  }
  if(e.key==='t'||e.key==='T'){
    const themes=['console','carta','schematic'];
    const i=themes.indexOf(document.body.dataset.theme);
    document.body.dataset.theme=themes[(i+1)%3];
    mostrarToast(`Tema: ${document.body.dataset.theme}`);
  }
});

function applyTweaks(t){
  document.body.dataset.theme=t.theme;
  document.body.dataset.realistic=String(t.realistic);
  document.body.dataset.density=t.density;
  document.body.dataset.showRuler=String(t.show_ruler);
}
window.addEventListener('message',(e)=>{
  const d=e.data;
  if(d&&d.__tweaks){ applyTweaks(d.__tweaks); }
});

/* ============================================================
   API GLOBAL — usada por firebase.js
============================================================ */
window.DockSim = {
  getSnapshot() {
    return {
      buques: buques.map(b=>({id:b.id,nombre:b.nombre,metros:b.metros,manga:b.manga,color:b.color,orientacion:b.orientacion,moves:b.moves||0,locked:b.locked,leftM:b.leftM})),
      cabos:  cabos.map(c=>({id:c.id,buqueId:c.buqueId,pctX:c.pctX,pctY:c.pctY,bitaNum:c.bitaNum})),
      contadores: { idCounter, caboCounter }
    };
  },
  cargarSnapshot(data) {
    ['overlayEditar','modalEditar','overlayAgregar','modalAgregar',
     'overlaySesiones','modalSesiones','overlayConfig','modalConfig'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){ el.classList.remove('visible'); el.style.display='none'; }
    });
    objEditando=null;
    buques.forEach(b=>{ b.el?.remove(); });
    cabos.forEach(c=>{ c.puntoEl?.remove(); c.lineaEl?.remove(); });
    buques=[]; cabos=[];
    idCounter   = data.contadores?.idCounter   || 0;
    caboCounter = data.contadores?.caboCounter || 0;
    data.buques.forEach(d=>{
      const escala=getEscala(),xPx=(d.leftM||0)*escala;
      const info={...d,manga:d.manga||35,moves:d.moves||0,x:xPx};
      const el=crearBuqueEl(info);
      const obj={...info,el,bitaDesde:'–',bitaHasta:'–'};
      buques.push(obj);
      document.getElementById('zonaBuques').appendChild(el);
      if(d.locked){obj.locked=true;el.classList.add('locked');}
      calcularBitas(obj); iniciarDrag(obj); iniciarHoverInfo(obj); iniciarPanelCabos(obj);
    });
    generarBitas(); actualizarTabla();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      data.cabos.forEach(d=>{
        const obj=buques.find(b=>b.id===d.buqueId);if(!obj)return;
        const bitaData=BITAS.find(b=>b.num===d.bitaNum);if(!bitaData)return;
        crearCabo(obj,d.pctX,d.pctY,d.bitaNum,d.id);
      });
      actualizarTabla();
      mostrarToast('✅ Sesión cargada');
    }));
  }
};

/* ============================================================
   SESIONES — modales y lógica UI
============================================================ */
(function initSesiones(){
  function abrirModal(ovId,modId){
    const ov=document.getElementById(ovId),mo=document.getElementById(modId);
    ov.style.display='block';mo.style.display='block';
    requestAnimationFrame(()=>{ov.classList.add('visible');mo.classList.add('visible');});
  }
  function cerrarModal(ovId,modId){
    const ov=document.getElementById(ovId),mo=document.getElementById(modId);
    ov.classList.remove('visible');mo.classList.remove('visible');
    setTimeout(()=>{ov.style.display='none';mo.style.display='none';},230);
  }

  document.getElementById('btnGuardarSesion')?.addEventListener('click',()=>{
    if(buques.length===0){mostrarToast('⚠ No hay buques para guardar');return;}
    const now=new Date();
    document.getElementById('inp-nombre-sesion').value=`${now.toLocaleDateString('es-UY')} ${now.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}`;
    abrirModal('overlayGuardarSesion','modalGuardarSesion');
    setTimeout(()=>document.getElementById('inp-nombre-sesion').focus(),250);
  });
  document.getElementById('closeGuardarSesion')?.addEventListener('click',()=>cerrarModal('overlayGuardarSesion','modalGuardarSesion'));
  document.getElementById('cancelGuardarSesion')?.addEventListener('click',()=>cerrarModal('overlayGuardarSesion','modalGuardarSesion'));
  document.getElementById('confirmGuardarSesion')?.addEventListener('click',async()=>{
    const nombre=document.getElementById('inp-nombre-sesion').value.trim();
    if(!nombre){document.getElementById('inp-nombre-sesion').focus();return;}
    const btn=document.getElementById('confirmGuardarSesion');
    btn.disabled=true;btn.textContent='Guardando...';
    try{
      const fs=window.FirebaseSesiones;
      if(!fs){mostrarToast('⚠ Firebase no disponible');return;}
      const id=await fs.guardarSesion(nombre);
      cerrarModal('overlayGuardarSesion','modalGuardarSesion');
      const link=`${location.origin}${location.pathname}?sesion=${id}`;
      document.getElementById('linkSesionText').textContent=link;
      abrirModal('overlayLinkSesion','modalLinkSesion');
    }catch(e){mostrarToast('❌ Error al guardar: '+e.message);}
    finally{btn.disabled=false;btn.textContent='Guardar';}
  });

  document.getElementById('closeLinkSesion')?.addEventListener('click',()=>cerrarModal('overlayLinkSesion','modalLinkSesion'));
  document.getElementById('closeLinkSesionOk')?.addEventListener('click',()=>cerrarModal('overlayLinkSesion','modalLinkSesion'));
  document.getElementById('btnCopyLink')?.addEventListener('click',()=>{
    navigator.clipboard.writeText(document.getElementById('linkSesionText').textContent).then(()=>mostrarToast('✅ Link copiado'));
  });

  let hayMas=false,cargando=false,sesionesCache=[],filtroNombre='',filtroFecha='';

  async function cargarPagina(reset=false){
    if(cargando)return;
    const fs=window.FirebaseSesiones;
    if(!fs){document.getElementById('sesionesLista').innerHTML='<div class="sesiones-loading">Firebase no disponible, esperá...</div>';return;}
    cargando=true;
    const btnMas=document.getElementById('btnCargarMas');
    if(btnMas){btnMas.disabled=true;btnMas.textContent='Cargando...';}
    try{
      const res=reset?await fs.primeraPagina():await fs.siguientePagina();
      if(reset) sesionesCache=[];
      sesionesCache=sesionesCache.concat(res.sesiones);
      hayMas=res.hayMas;
      renderLista();
    }catch(e){document.getElementById('sesionesLista').innerHTML=`<div class="sesiones-loading">Error: ${e.message}</div>`;}
    finally{cargando=false;}
  }

  function filtradas(){
    return sesionesCache.filter(s=>{
      const okNombre=!filtroNombre||s.nombre?.toLowerCase().includes(filtroNombre.toLowerCase())||(s.buquesNombres||[]).some(n=>n.includes(filtroNombre.toLowerCase()))||(s.buques||[]).some(b=>b.nombre?.toLowerCase().includes(filtroNombre.toLowerCase()));
      const okFecha=!filtroFecha||(s.fechaYMD&&s.fechaYMD===filtroFecha);
      return okNombre&&okFecha;
    });
  }

  function renderLista(){
    const lista=document.getElementById('sesionesLista');
    const visible=filtradas();
    if(visible.length===0&&!hayMas){lista.innerHTML='<div class="sesiones-loading">Sin resultados.</div>';return;}
    lista.innerHTML=visible.map(s=>`
      <div class="sesion-item" data-id="${s.id}">
        <div class="sesion-info">
          <span class="sesion-nombre">${s.nombre}</span>
          <span class="sesion-meta">${s.fechaStr} · ${s.buques?.length||0} buque${s.buques?.length!==1?'s':''}</span>
          <span class="sesion-buques">${(s.buques||[]).map(b=>`<span class="sesion-badge" style="border-color:${b.color};background:${b.color}22">${b.nombre} · ${b.metros}m · ${b.moves||0} mov</span>`).join('')}</span>
        </div>
        <div class="sesion-acciones">
          <button class="btn-sesion-cargar" data-id="${s.id}">Cargar</button>
          <button class="btn-sesion-link" data-id="${s.id}" title="Copiar link">🔗</button>
          <button class="btn-sesion-eliminar" data-id="${s.id}" data-nombre="${s.nombre}" title="Eliminar">🗑</button>
        </div>
      </div>`).join('');
    if(hayMas&&!filtroNombre&&!filtroFecha){
      lista.insertAdjacentHTML('beforeend',`<div class="sesiones-cargar-mas"><button id="btnCargarMas" class="btn-cargar-mas">Cargar más sesiones</button></div>`);
      document.getElementById('btnCargarMas')?.addEventListener('click',()=>cargarPagina(false));
    }
    lista.querySelectorAll('.btn-sesion-cargar').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        btn.disabled=true;btn.textContent='...';
        try{const data=await window.FirebaseSesiones.cargarSesionPorId(btn.dataset.id);cerrarModal('overlaySesiones','modalSesiones');window.DockSim.cargarSnapshot(data);}
        catch(e){mostrarToast('❌ '+e.message);}
        finally{btn.disabled=false;btn.textContent='Cargar';}
      });
    });
    lista.querySelectorAll('.btn-sesion-link').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const link=`${location.origin}${location.pathname}?sesion=${btn.dataset.id}`;
        navigator.clipboard.writeText(link).then(()=>mostrarToast('✅ Link copiado'));
      });
    });
    lista.querySelectorAll('.btn-sesion-eliminar').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const id=btn.dataset.id,nombre=btn.dataset.nombre;
        const item=btn.closest('.sesion-item');
        item.innerHTML=`<div class="sesion-confirm-eliminar"><span>¿Eliminar <strong>${nombre}</strong>?</span><div class="sesion-confirm-btns"><button class="btn-danger-sm btn-confirm-si" data-id="${id}">Sí, eliminar</button><button class="btn-cancel-sm btn-confirm-no">Cancelar</button></div></div>`;
        item.querySelector('.btn-confirm-no').addEventListener('click',renderLista);
        item.querySelector('.btn-confirm-si').addEventListener('click',async()=>{
          try{await window.FirebaseSesiones.eliminarSesion(id);sesionesCache=sesionesCache.filter(s=>s.id!==id);mostrarToast('🗑 Sesión eliminada');renderLista();}
          catch(e){mostrarToast('❌ '+e.message);}
        });
      });
    });
  }

  document.getElementById('sesion-buscar-nombre')?.addEventListener('input',e=>{filtroNombre=e.target.value.trim();renderLista();});
  document.getElementById('sesion-buscar-fecha')?.addEventListener('change',e=>{filtroFecha=e.target.value;renderLista();});
  document.getElementById('sesion-limpiar-fecha')?.addEventListener('click',()=>{document.getElementById('sesion-buscar-fecha').value='';filtroFecha='';renderLista();});

  document.getElementById('btnSesiones')?.addEventListener('click',()=>{
    filtroNombre='';filtroFecha='';
    if(document.getElementById('sesion-buscar-nombre'))document.getElementById('sesion-buscar-nombre').value='';
    if(document.getElementById('sesion-buscar-fecha'))document.getElementById('sesion-buscar-fecha').value='';
    abrirModal('overlaySesiones','modalSesiones');
    cargarPagina(true);
  });
  document.getElementById('closeSesiones')?.addEventListener('click',()=>cerrarModal('overlaySesiones','modalSesiones'));
  document.getElementById('cancelSesiones')?.addEventListener('click',()=>cerrarModal('overlaySesiones','modalSesiones'));

  // Cargar sesión desde URL
  const urlId=new URLSearchParams(location.search).get('sesion');
  if(urlId){
    window.addEventListener('load',()=>{
      let intentos=0;
      const esperar=setInterval(async()=>{
        intentos++;
        if(window.FirebaseSesiones||intentos>20){
          clearInterval(esperar);
          if(!window.FirebaseSesiones){mostrarToast('⚠ Firebase no disponible');return;}
          try{mostrarToast('⏳ Cargando sesión compartida...');const data=await window.FirebaseSesiones.cargarSesionPorId(urlId);window.DockSim.cargarSnapshot(data);}
          catch(e){mostrarToast('❌ Sesión no encontrada: '+urlId);}
        }
      },300);
    });
  }
})();

/* ============================================================
   INIT
============================================================ */
window.addEventListener('load',()=>{
  generarBitas();
  cargarEstado();
  requestAnimationFrame(()=>{
    cabos.forEach(c=>{
      const obj=buques.find(b=>b.id===c.buqueId);
      if(obj) actualizarLineaCabo(c,obj);
    });
  });
});

(function initTweaks(){
  const hd=document.getElementById('twkHd'),
        body=document.getElementById('twkBody'),
        arrow=document.getElementById('twkArrow');
  let open=false;

  hd.addEventListener('click',()=>{
    open=!open;
    body.classList.toggle('collapsed',!open);
    arrow.textContent=open?'▼':'▲';
  });

  function applyAll(){
    const theme=document.getElementById('twkTheme').value;
    const realistic=document.getElementById('twkReal').classList.contains('on');
    const density=['compact','cozy','comfortable'].find(v=>
      document.getElementById('twk'+v.charAt(0).toUpperCase()+v.slice(1))?.classList.contains('on')
    )||'cozy';
    const ruler=document.getElementById('twkRuler').classList.contains('on');
    const tabla=document.getElementById('twkTabla').classList.contains('on');
    const hint=document.getElementById('twkHint').classList.contains('on');
    const sepBorde=parseInt(document.getElementById('twkSepBorde').value);
    const sepBuques=parseInt(document.getElementById('twkSepBuques').value);

    // Tema y visuales
    document.body.dataset.theme=theme;
    document.body.dataset.realistic=String(realistic);
    document.body.dataset.density=density;
    document.body.dataset.showRuler=String(ruler);

    // Tabla flotante buques
    const panelFlotante=document.getElementById('panelFlotante');
    if(panelFlotante) panelFlotante.style.display=tabla?'':'none';

    // Hint Ctrl+clic
    const hintEl=document.getElementById('hintWind');
    if(hintEl) hintEl.style.display=hint?'':'none';

    // Separaciones — sobreescriben las constantes del script principal
    window._MARGEN_BORDE_M=sepBorde;
    window._SEPARACION_MIN_M=sepBuques;

    window.dispatchEvent(new Event('resize'));
  }

  // Tema
  document.getElementById('twkTheme').addEventListener('change',applyAll);

  // Segs realista
  ['twkFlat','twkReal'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>{
      ['twkFlat','twkReal'].forEach(x=>document.getElementById(x)?.classList.remove('on'));
      document.getElementById(id).classList.add('on');
      applyAll();
    });
  });

  // Segs densidad
  ['twkCompact','twkCozy','twkComfy'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>{
      ['twkCompact','twkCozy','twkComfy'].forEach(x=>document.getElementById(x)?.classList.remove('on'));
      document.getElementById(id).classList.add('on');
      applyAll();
    });
  });

  // Toggles
  ['twkRuler','twkTabla','twkHint'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>{
      document.getElementById(id).classList.toggle('on');
      applyAll();
    });
  });

  // Sliders separación
  document.getElementById('twkSepBorde').addEventListener('input',function(){
    document.getElementById('twkSepBordeVal').textContent=this.value+' m';
    applyAll();
  });
  document.getElementById('twkSepBuques').addEventListener('input',function(){
    document.getElementById('twkSepBuquesVal').textContent=this.value+' m';
    applyAll();
  });
})();
