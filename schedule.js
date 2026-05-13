/* DockSim — schedule.js */

/* ─── CONSTANTES ─── */
const MUELLE_M=616, NUEVO_M=350;
const BLK_H=36;
const PAST_H=48, FUT_H=96;
const MUELLE_H_PX=20;

// px por hora — escala con la granularidad
// granH=2 → 35px/h, granH=4 → 45px/h, granH=24 → 8px/h
function getPxH(){ return Math.max(6, Math.round(70/granH)); }

/* ─── ESTADO ─── */
let buques=[], mPos={}, semana=19, granH=4;
let dragRow=null, editTgt=null;
let pool=['#1D9E75','#D85A30','#7F77DD','#BA7517','#E24B4A','#378ADD','#639922','#D4537E','#0F6E56','#993C1D','#EF9F27','#7B2D8B'];
let ci=0;
function nc(){ return pool[ci++%pool.length]; }

/* ─── HELPERS ─── */
const pad=n=>String(n).padStart(2,'0');
function fDT(d){ if(!d||isNaN(d)) return '–'; return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fH(d){ if(!d||isNaN(d)) return ''; return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function toLoc(d){
  if(!d||isNaN(d)) return '';
  const y=d.getFullYear(), mo=pad(d.getMonth()+1), dd=pad(d.getDate());
  const hh=pad(d.getHours()), mm=pad(d.getMinutes());
  return `${y}-${mo}-${dd}T${hh}:${mm}`;
}
function toDateVal(d){ if(!d||isNaN(d)) return ''; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toTimeVal(d){ if(!d||isNaN(d)) return ''; return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fromParts(dateVal, timeVal){
  if(!dateVal) return null;
  const t=timeVal||'00:00';
  const [y,mo,dd]=dateVal.split('-').map(Number);
  const [hh,mm]=t.split(':').map(Number);
  return new Date(y,mo-1,dd,hh,mm,0,0);
}
function fromLoc(s){ return s?new Date(s):null; }
function toast(msg,dur=2500){ const e=$('tst'); e.textContent=msg; e.classList.add('vis'); clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('vis'),dur); }
const $=id=>document.getElementById(id);

/* ─── GEOMETRÍA ─── */
// innerH total del scroll (futuro + pasado)
function innerH(){ return (PAST_H+FUT_H)*getPxH(); }

// Posición Y del NOW dentro del scroll-inner
// NOW está a FUT_H*PX_H desde el tope (futuro arriba, pasado abajo)
function nowY(){ return FUT_H*getPxH(); }

// Convierte una fecha a Y dentro del scroll-inner
// Fechas futuras → menor Y (arriba), pasadas → mayor Y (abajo)
function dateToY(date){
  const ahora=new Date();
  const diffH=(date-ahora)/3600000;
  return nowY() - diffH*getPxH();
}

// Devuelve la altura del área de agua (sin muelle)
function areaH(){
  return ($('mO').clientHeight||500) - MUELLE_H_PX;
}

/* ─── IMPORTAR ─── */
$('bImp').addEventListener('click',()=>$('fExcel').click());
$('fExcel').addEventListener('change',e=>{ const f=e.target.files?.[0]; if(f){leerExcel(f);e.target.value='';} });

function leerExcel(file){
  if(!window.XLSX){ toast('⚠ Librería cargando...'); return; }
  const r=new FileReader();
  r.onload=ev=>{
    const wb=XLSX.read(ev.target.result,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    // raw:true para leer valores sin conversión automática de fechas
    const raw=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
    parsear(raw);
  };
  r.readAsArrayBuffer(file);
}

// Parsea fechas de Excel: puede ser serial numérico o string dd/mm/yyyy hh:mm
function parseExcelDate(v){
  if(!v && v!==0) return null;
  if(typeof v==='number'){
    // Serial de Excel → fecha local
    // Redondeamos a minuto para evitar errores de punto flotante (ej. 07:59:59 en vez de 08:00)
    const ms=Math.round((v-25569)*86400)*1000;
    const utcDate=new Date(ms);
    return new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      0, 0
    );
  }
  const s=String(v).trim();
  if(!s) return null;
  const m1=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if(m1) return new Date(+m1[3],+m1[2]-1,+m1[1],+m1[4],+m1[5],0,0);
  const m2=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m2) return new Date(+m2[3],+m2[2]-1,+m2[1],0,0,0,0);
  const t=Date.parse(s);
  return isNaN(t)?null:new Date(t);
}

function parsear(rows){
  buques=[]; ci=0; mPos={};
  let tipo=null;
  for(const row of rows){
    const c0=String(row[0]||'').trim(), c1=String(row[1]||'').trim();
    if(c0==='WEEK'&&c1==='BARGE'){tipo='BCZA';continue;}
    if(c0==='WEEK'&&c1==='VESSEL'){tipo='BQ';continue;}
    if(!tipo||!c0||isNaN(parseInt(c0))) continue;
    const nombre=c1.toUpperCase(); if(!nombre) continue;
    buques.push({
      sem:parseInt(c0), nombre, tipo, service:String(row[2]||'').trim(),
      eta:parseExcelDate(row[3]),
      etb:parseExcelDate(row[4]),
      ets:parseExcelDate(row[5]),
      moves:parseInt(row[6])||0,
      metros:Math.round((parseFloat(row[7])||0)/100),
      notas:String(row[8]||'').trim(),
      color:nc(),
      locked:true
    });
  }
  const semsEtb=buques.filter(b=>b.etb).map(b=>b.sem);
  if(semsEtb.length) semana=Math.min(...semsEtb);
  toast(`✅ ${buques.length} buques importados`);
  render();
  sincronizarConFirebase();
}

/* ─── TABLA ─── */
function semAct(){ return buques.filter(b=>b.sem===semana); }

function renderTabla(){
  const lista=semAct(), con=lista.filter(b=>b.etb), sin=lista.filter(b=>!b.etb);
  $('lConEtb').textContent=`Con ETB — ${con.length} buque${con.length!==1?'s':''}`;
  $('lSinEtb').textContent=`Sin ETB — ${sin.length} buque${sin.length!==1?'s':''}`;
  renderRows('lConEtbList',con,false);
  renderRows('lSinEtbList',sin,true);
}

function renderRows(cid,lista,sinEtb){
  const el=$(cid); el.innerHTML='';
  lista.forEach(b=>{
    const enM=mPos[b.nombre]?.colocado;
    const div=document.createElement('div');
    div.className=`barr${sinEtb?' se':''}${enM?' em':''}`;
    div.style.cursor=sinEtb?'default':'grab';
    div.innerHTML=`
      <div class="cd" style="background:${b.color}"></div>
      <div class="bi2">
        <div class="bn2">${b.nombre}</div>
        <div class="bm">${b.metros}m · ${b.moves} mov · ${b.service||'–'}</div>
        ${b.comentario?`<div class="bm" style="color:var(--ac)">💬 ${b.comentario}</div>`:''}
      </div>
      <span class="tt">${b.tipo}</span>
      ${b.etb?`<span class="te">${fH(b.etb)}</span>`:''}
      ${enM?`<button class="arr-go" title="Ir al buque en el timeline">🚢</button>`:''}`;
    if(!sinEtb&&!enM){
      div.draggable=true;
      div.addEventListener('dragstart',e=>{ dragRow=b; div.classList.add('dg'); e.dataTransfer.setData('text/plain',b.nombre); $('dHint').classList.add('vis'); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dg'); dragRow=null; $('dHint').classList.remove('vis'); });
    }
    // Doble click siempre abre el modal — para todos los buques incluso sin ETB
    div.addEventListener('dblclick',e=>{ e.stopPropagation(); abrirEditar(b); });
    if(enM){
      div.querySelector('.arr-go')?.addEventListener('click',e=>{ e.stopPropagation(); scrollToBuque(b); });
    }
    el.appendChild(div);
  });
}

/* ─── TIMELINE ─── */
function render(){
  renderTabla();
  if(panelEstado==='full') renderTablaCopleta();
  const s=$('aScroll');
  if(s) delete s._ok;
  renderTimeline();
  actuFecha();
  $('semLbl').textContent=`Semana ${semana}`;
}

function renderTimeline(){
  const outerW=$('mO').clientWidth||800;
  const IH=innerH();
  const AH=areaH();

  // Scroll setup
  const scroll=$('aScroll');
  scroll.style.cssText=`position:absolute;left:0;right:0;top:0;height:${AH}px;overflow-y:scroll;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--bd2) transparent;`;

  // Scroll: centrar NOW en el CENTRO del área visible
  const targetScroll=Math.max(0, nowY()-AH/2);
  if(!scroll._ok){
    scroll.scrollTop=targetScroll;
    scroll._ok=true;
  }

  // Zona futura (agua celeste)
  const fut=$('aFut');
  fut.style.cssText=`position:absolute;left:0;right:0;top:0;height:${nowY()}px;background:var(--bg);`;

  // Zona pasada (rayas)
  const pas=$('aPas');
  pas.style.cssText=`position:absolute;left:0;right:0;top:${nowY()}px;height:${PAST_H*getPxH()}px;background:repeating-linear-gradient(45deg,rgba(100,130,160,.05) 0px,rgba(100,130,160,.05) 2px,transparent 2px,transparent 10px);`;

  // Muelle fijo: ocupa desde AH hasta AH+MUELLE_H_PX
  const nuevoW=Math.round(outerW*NUEVO_M/MUELLE_M);
  $('mNuevo').style.width=nuevoW+'px';

  // Labels
  $('mLN').style.cssText=`position:absolute;left:4px;bottom:${MUELLE_H_PX+3}px;font-size:7px;font-family:var(--fmono);color:rgba(70,45,5,.5);font-weight:700;letter-spacing:.05em;pointer-events:none;z-index:31;`;
  $('mLV').style.cssText=`position:absolute;left:${nuevoW+6}px;bottom:${MUELLE_H_PX+3}px;font-size:7px;font-family:var(--fmono);color:rgba(70,45,5,.5);font-weight:700;letter-spacing:.05em;pointer-events:none;z-index:31;`;

  // Escala metros
  const escEl=$('mEsc');
  escEl.style.cssText=`position:absolute;left:0;right:0;bottom:${MUELLE_H_PX+1}px;z-index:32;pointer-events:none;`;
  escEl.innerHTML='';
  [0,100,200,300,400,500,616].forEach(m=>{
    const s=document.createElement('span');
    s.style.cssText=`position:absolute;left:${(m/MUELLE_M*100).toFixed(1)}%;font-size:7px;font-family:var(--fmono);color:rgba(70,45,5,.4);`;
    s.textContent=m+'m';
    escEl.appendChild(s);
  });

  // Limpiar contenido dinámico del scroll
  // Removemos solo los elementos generados (grillas, now, bloques, sombras)
  scroll.querySelectorAll('.hg,.now,.blk,.sf,.sp,.rh-ets-handle').forEach(e=>e.remove());

  const ahora=new Date();

  // Grillas hora + eje
  const ejeEl=$('ejeI');
  ejeEl.style.height=IH+'px';
  ejeEl.innerHTML='';

  for(let h=-PAST_H; h<=FUT_H; h+=granH){
    const fecha=new Date(ahora.getTime()+h*3600000);
    const y=dateToY(fecha);
    if(y<0||y>IH+10) continue;

    // Grilla
    const g=document.createElement('div');
    g.className='hg';
    g.style.top=y+'px';
    scroll.appendChild(g);

    // Eje
    const esNow=Math.abs(h)<granH*0.3;
    const tick=document.createElement('div');
    tick.style.cssText=`position:absolute;left:0;right:0;top:${y}px;height:.5px;background:${esNow?'var(--dg)':'var(--bd)'};opacity:${esNow?.6:.5};`;
    ejeEl.appendChild(tick);
    const lbl=document.createElement('div');
    lbl.style.cssText=`position:absolute;right:4px;top:${y}px;transform:translateY(-50%);font-size:8px;font-family:var(--fmono);white-space:nowrap;color:${esNow?'var(--dg)':'var(--tx3)'};font-weight:${esNow?700:400};`;
    lbl.textContent=`${pad(fecha.getDate())}/${pad(fecha.getMonth()+1)} ${pad(fecha.getHours())}:00`;
    ejeEl.appendChild(lbl);
  }

  // Línea NOW
  const nLine=document.createElement('div');
  nLine.className='now';
  nLine.style.top=nowY()+'px';
  nLine.innerHTML=`<div class="nowt">NOW · ${fH(ahora)}</div>`;
  scroll.appendChild(nLine);

  // Buques
  renderBuques(IH, outerW, AH);

  // Sync eje con scroll
  const syncEje=()=>{ ejeEl.style.top=(-scroll.scrollTop)+'px'; };
  scroll.onscroll=syncEje;
  syncEje();
}

function renderBuques(IH, outerW, AH){
  const scroll=$('aScroll');
  const ahora=new Date();

  // Timeline muestra TODOS los buques colocados (todas las semanas)
  buques.filter(b=>b.etb && mPos[b.nombre]?.colocado).forEach(b=>{

    const left=mPos[b.nombre].leftPct;
    const wPct=(b.metros/MUELLE_M)*100;
    const etbY=dateToY(b.etb);
    const etsY=b.ets?dateToY(b.ets):etbY-getPxH()*6;
    const nowYv=nowY();
    const yaAmarrado=etbY>=nowYv; // ETB en el pasado (Y más grande = más abajo = más pasado)

    // ── Sombra futura (ETS → bloque) — handle de resize como elemento separado ──
    if(!yaAmarrado){
      const futBot=etbY-BLK_H;
      const futTop=Math.min(etsY, futBot-2);
      if(futBot>futTop+2){
        const sf=document.createElement('div');
        sf.className='sf'; sf.dataset.buque=b.nombre;
        sf.style.cssText=`left:${left}%;width:${wPct}%;top:${futTop}px;height:${futBot-futTop}px;background:${b.color};opacity:.16;border:0.5px dashed ${b.color};border-radius:4px 4px 0 0;`;
        scroll.appendChild(sf);

        // Handle ETS: elemento separado posicionado en el borde superior de la sombra
        if(!b.locked){
          const rhEts=document.createElement('div');
          rhEts.className='rh-ets-handle';
          rhEts.dataset.buque=b.nombre;
          rhEts.style.cssText=`position:absolute;left:${left}%;width:${wPct}%;top:${futTop-3}px;height:8px;cursor:ns-resize;z-index:25;background:transparent;border-radius:4px 4px 0 0;`;
          // Label de fecha ETS
          const etsLabel=document.createElement('div');
          etsLabel.style.cssText=`position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:8px;font-family:var(--fmono);background:rgba(8,30,50,.85);color:#ddf4ff;padding:2px 6px;border-radius:3px;white-space:nowrap;pointer-events:none;display:none;`;
          etsLabel.textContent=fDT(b.ets);
          rhEts.appendChild(etsLabel);
          rhEts.addEventListener('mouseenter',()=>{ rhEts.style.background=`${b.color}55`; etsLabel.style.display='block'; });
          rhEts.addEventListener('mouseleave',()=>{ rhEts.style.background='transparent'; etsLabel.style.display='none'; });
          rhEts.addEventListener('mousedown',e2=>{
            e2.preventDefault(); e2.stopPropagation();
            const startY2=e2.clientY;
            const startEts2=b.ets?new Date(b.ets):new Date(b.etb.getTime()+4*3600000);
            etsLabel.style.display='block';
            const onMove2=ev=>{
              const dy=ev.clientY-startY2;
              const dH=(-dy)/getPxH();
              const newEts=new Date(startEts2.getTime()+dH*3600000);
              if(newEts>b.etb){
                b.ets=newEts;
                etsLabel.textContent=fDT(b.ets);
                const newEtsY=dateToY(b.ets);
                const newFutTop=Math.min(newEtsY, futBot-2);
                const newH=futBot-newFutTop;
                if(newH>2){
                  sf.style.top=newFutTop+'px';
                  sf.style.height=newH+'px';
                  rhEts.style.top=(newFutTop-3)+'px';
                }
              }
            };
            const onUp2=()=>{
              etsLabel.style.display='none';
              document.removeEventListener('mousemove',onMove2);
              document.removeEventListener('mouseup',onUp2);
              const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
              render(); s.scrollTop=sv;
            };
            document.addEventListener('mousemove',onMove2);
            document.addEventListener('mouseup',onUp2);
          });
          scroll.appendChild(rhEts);
        }
      }
    } else {
      if(etsY<nowYv){
        const futTop=Math.max(0,etsY);
        const futBot=nowYv-BLK_H;
        if(futBot>futTop+2){
          const sf=document.createElement('div');
          sf.className='sf'; sf.dataset.buque=b.nombre;
          sf.style.cssText=`left:${left}%;width:${wPct}%;top:${futTop}px;height:${futBot-futTop}px;background:${b.color};opacity:.16;border:0.5px dashed ${b.color};border-radius:4px 4px 0 0;`;
          scroll.appendChild(sf);

          if(!b.locked){
            const rhEts=document.createElement('div');
            rhEts.style.cssText=`position:absolute;left:${left}%;width:${wPct}%;top:${futTop-3}px;height:8px;cursor:ns-resize;z-index:25;background:transparent;`;
            rhEts.addEventListener('mouseenter',()=>{ rhEts.style.background=`${b.color}55`; });
            rhEts.addEventListener('mouseleave',()=>{ rhEts.style.background='transparent'; });
            rhEts.addEventListener('mousedown',e2=>{
              e2.preventDefault(); e2.stopPropagation();
              const startY2=e2.clientY;
              const startEts2=b.ets?new Date(b.ets):new Date(b.etb.getTime()+4*3600000);
              const onMove2=ev=>{
                const dy=ev.clientY-startY2;
                const dH=(-dy)/getPxH();
                const newEts=new Date(startEts2.getTime()+dH*3600000);
                if(newEts>b.etb){
                  b.ets=newEts;
                  const newEtsY=dateToY(b.ets);
                  const newFutTop=Math.max(0,newEtsY);
                  const newH=futBot-newFutTop;
                  if(newH>2){
                    sf.style.top=newFutTop+'px';
                    sf.style.height=newH+'px';
                    rhEts.style.top=(newFutTop-3)+'px';
                  }
                }
              };
              const onUp2=()=>{
                document.removeEventListener('mousemove',onMove2);
                document.removeEventListener('mouseup',onUp2);
                const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
                render(); s.scrollTop=sv;
              };
              document.addEventListener('mousemove',onMove2);
              document.addEventListener('mouseup',onUp2);
            });
            scroll.appendChild(rhEts);
          }
        }
      }
    }

    // ── Bloque sólido ──
    // Si ya amarrado: pegado al muelle (nowY - BLK_H)
    // Si futuro: flotando en etbY - BLK_H
    const blkTop = yaAmarrado ? nowYv-BLK_H : etbY-BLK_H;
    const blk=document.createElement('div');
    blk.className='blk';
    blk.dataset.nombre=b.nombre;
    blk.style.cssText=`left:${left}%;width:${wPct}%;top:${blkTop}px;height:${BLK_H}px;background:${b.color};`;
    blk.innerHTML=`
      <button class="lock" data-n="${b.nombre}" title="${b.locked?'Duración bloqueada':'Duración libre'}">${b.locked?'🔒':'🔓'}</button>
      <div class="bll">${b.tipo} · ${b.nombre}</div>
      <div class="bls">${b.metros}m · ${b.moves} mov</div>
      <button class="quit" data-n="${b.nombre}">✕</button>
      <div class="rh-bot${b.locked?' hidden':''}" data-n="${b.nombre}"></div>`;
    scroll.appendChild(blk);

    // ── Sombra pasada — desde NOW hacia abajo hasta ETB ──
    // etbY > nowYv porque ETB está en el pasado (más abajo en el DOM)
    if(yaAmarrado){
      const spTop=nowYv;   // arriba: NOW
      const spBot=etbY;    // abajo: ETB (más grande = más en el pasado)
      if(spBot>spTop+2){
        const sp=document.createElement('div');
        sp.className='sp'; sp.dataset.buque=b.nombre;
        sp.style.cssText=`left:${left}%;width:${wPct}%;top:${spTop}px;height:${spBot-spTop}px;background:repeating-linear-gradient(45deg,${b.color}55,${b.color}55 2px,transparent 2px,transparent 9px);border-left:1px dashed ${b.color}80;border-right:1px dashed ${b.color}80;border-bottom:1px solid ${b.color}80;border-radius:0 0 4px 4px;`;
        scroll.appendChild(sp);
      }
    }

    // ── Drag horizontal y vertical ──
    let dragMode=null, startX=0, startY=0, startLeft=0, startEtb=null, startEts=null;

    blk.addEventListener('mousedown',e=>{
      if(e.target.classList.contains('quit')) return;
      if(e.target.classList.contains('lock')) return;
      if(e.target.classList.contains('rh-bot')) return;
      if(e.detail===2) return;
      e.preventDefault();

      startX=e.clientX; startY=e.clientY;
      startLeft=mPos[b.nombre]?.leftPct??0;
      startEtb=new Date(b.etb); startEts=b.ets?new Date(b.ets):null;
      const durMs=startEts?startEts-startEtb:0;
      // Margen 15m a cada extremo
      const margenPct=(MARGEN_EXTREMO/MUELLE_M)*100;
      const maxLeft=100-margenPct-(b.metros/MUELLE_M)*100;
      const minLeft=margenPct;
      let moved=false;

      const onMove=ev=>{
        const dx=ev.clientX-startX;
        const dy=ev.clientY-startY;
        if(!moved && Math.abs(dx)<4 && Math.abs(dy)<4) return;
        moved=true;

        if(!dragMode){
          dragMode = Math.abs(dx)>Math.abs(dy) ? 'H' : 'V';
          blk.classList.add(dragMode==='H'?'drag-h':'drag-v');
        }

        if(dragMode==='H'){
          const dPct=(dx/outerW)*100;
          const newLeft=Math.max(minLeft,Math.min(startLeft+dPct,maxLeft));
          const cols=colisionantes(b, newLeft);
          if(cols.length>0){ blk.style.outline='2px solid var(--dg)'; return; }
          blk.style.outline='none';
          mPos[b.nombre].leftPct=newLeft;
          blk.style.left=newLeft+'%';
          // Mover sombras y handle junto con el bloque
          scroll.querySelectorAll('.sf,.sp,.rh-ets-handle').forEach(el=>{
            if(el.dataset.buque===b.nombre) el.style.left=newLeft+'%';
          });
        } else {
          // Drag vertical — solo con candado abierto
          if(b.locked) return;
          // Usar getPxH() dinámico en cada movimiento
          const pxH=getPxH();
          const dH=dy/pxH;
          b.etb=new Date(startEtb.getTime()+dH*3600000);
          if(startEts) b.ets=new Date(b.etb.getTime()+durMs);
          const newEtbY=dateToY(b.etb);
          const newBlkTop=yaAmarrado ? nowY()-BLK_H : newEtbY-BLK_H;
          blk.style.top=newBlkTop+'px';
          // Mostrar label con ETB actual
          let lbl=blk.querySelector('.drag-v-label');
          if(!lbl){
            lbl=document.createElement('div');
            lbl.className='drag-v-label';
            lbl.style.cssText='position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:8px;font-family:var(--fmono);background:rgba(8,30,50,.85);color:#ddf4ff;padding:2px 6px;border-radius:3px;white-space:nowrap;pointer-events:none;z-index:50;';
            blk.appendChild(lbl);
          }
          lbl.textContent=`ETB: ${fDT(b.etb)}`;
        }
      };

      const onUp=()=>{
        blk.classList.remove('drag-h','drag-v');
        blk.style.outline='none';
        dragMode=null;
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        if(moved){
          // NO resetear scroll — solo re-render sin volver a NOW
          const s=$('aScroll');
          const savedScroll=s.scrollTop;
          s._ok=true; // prevenir reset del scroll
          render();
          s.scrollTop=savedScroll;
        }
      };

      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });


    // ── Resize ETB hacia abajo (handle inferior = ampliar hacia pasado) ──
    const rhBot=blk.querySelector('.rh-bot');
    if(rhBot && !b.locked){
      rhBot.addEventListener('mousedown',e=>{
        e.preventDefault(); e.stopPropagation();
        const startY2=e.clientY;
        const startEtb2=new Date(b.etb);

        const onMove2=ev=>{
          const dy=ev.clientY-startY2;
          // Bajar (dy>0) = ETB más en el pasado = más tiempo operando
          const dH=dy/getPxH();
          const newEtb=new Date(startEtb2.getTime()+dH*3600000);
          // ETB no puede ser posterior al ETS
          if(!b.ets || newEtb<b.ets){
            b.etb=newEtb;
          }
        };
        const onUp2=()=>{
          document.removeEventListener('mousemove',onMove2);
          document.removeEventListener('mouseup',onUp2);
          const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
          render(); s.scrollTop=sv;
        };
        document.addEventListener('mousemove',onMove2);
        document.addEventListener('mouseup',onUp2);
      });
    }

    // ── Candado ──
    blk.querySelector('.lock').addEventListener('click',e=>{
      e.stopPropagation();
      b.locked=!b.locked;
      toast(b.locked?'🔒 Duración bloqueada':'🔓 Duración libre');
      const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
      render(); s.scrollTop=sv;
    });

    // ── Quitar ──
    blk.querySelector('.quit').addEventListener('click',e=>{
      e.stopPropagation();
      delete mPos[b.nombre];
      toast(`↩ ${b.nombre} quitado`);
      const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
      render(); s.scrollTop=sv;
    });

    // ── Doble click → editar ──
    blk.addEventListener('dblclick',e=>{ e.stopPropagation(); abrirEditar(b); });

    // ── Tooltip ──
    blk.addEventListener('mouseenter',()=>{
      const tt=$('tip');
      const dur=b.ets?Math.round((b.ets-b.etb)/3600000)+'h':'–';
      tt.innerHTML=`<strong>${b.nombre}</strong> · ${b.tipo}<br>${b.metros}m · ${b.moves} mov · ${b.service||'–'}<br>ETB: ${fDT(b.etb)}<br>ETS: ${fDT(b.ets)} (${dur})${b.start?'<br>START: '+fDT(b.start):''}${b.comentario?'<br>💬 '+b.comentario:''}`;
      tt.style.display='block';
    });
    blk.addEventListener('mousemove',e=>{ const tt=$('tip'); tt.style.left=(e.clientX+12)+'px'; tt.style.top=(e.clientY-10)+'px'; });
    blk.addEventListener('mouseleave',()=>{ $('tip').style.display='none'; });
  });
}

$('aScroll').addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
$('aScroll').addEventListener('drop',e=>{
  e.preventDefault(); $('dHint').classList.remove('vis');
  if(!dragRow) return;
  const b=dragRow;
  const rect=$('aScroll').getBoundingClientRect();
  const xPct=((e.clientX-rect.left)/$('aScroll').clientWidth)*100;
  const half=(b.metros/MUELLE_M)*50;
  const left=Math.max(0,Math.min(xPct-half,100-(b.metros/MUELLE_M)*100));

  // Verificar colisiones temporales Y físicas
  const cols=colisionantes(b, left);
  if(cols.length>0){
    mostrarModalColision(b, left, cols);
    return;
  }

  // Sin colisión — ajustar automáticamente para respetar márgenes
  const margenExtrPct=(MARGEN_EXTREMO/MUELLE_M)*100;
  const maxLeft=100-margenExtrPct-(b.metros/MUELLE_M)*100;
  const leftAjustado=Math.max(margenExtrPct, Math.min(left, maxLeft));

  mPos[b.nombre]={leftPct:leftAjustado,colocado:true};
  dragRow=null;
  toast(`✅ ${b.nombre} colocado`);
  const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
  render(); s.scrollTop=sv;
});

/* ─── MODAL EDICIÓN ─── */
function abrirEditar(b){
  editTgt=b;
  $('e-nom').value=b.nombre; $('e-tipo').value=b.tipo;
  $('e-m').value=b.metros; $('e-mv').value=b.moves;
  $('e-col').value=b.color;
  $('e-eta-d').value=toDateVal(b.eta); $('e-eta-t').value=toTimeVal(b.eta);
  $('e-etb-d').value=toDateVal(b.etb); $('e-etb-t').value=toTimeVal(b.etb);
  $('e-ets-d').value=toDateVal(b.ets); $('e-ets-t').value=toTimeVal(b.ets);
  $('e-start-d').value=toDateVal(b.start); $('e-start-t').value=toTimeVal(b.start);
  $('e-srv').value=b.service||''; $('e-not').value=b.notas||'';
  $('e-com').value=b.comentario||'';
  $('ovEdit').classList.add('vis'); $('mEdit').classList.add('vis');
}
function cerrarEditar(){ $('ovEdit').classList.remove('vis'); $('mEdit').classList.remove('vis'); editTgt=null; }
$('mEClose').addEventListener('click',cerrarEditar);
$('mECanc').addEventListener('click',cerrarEditar);
$('ovEdit').addEventListener('click',cerrarEditar);
$('mEOk').addEventListener('click',()=>{
  if(!editTgt) return;
  const etb=fromParts($('e-etb-d').value, $('e-etb-t').value);
  const ets=fromParts($('e-ets-d').value, $('e-ets-t').value);
  // Si tiene ETB debe tener ETS
  if(etb && !ets){ toast('⚠ Si tiene ETB, ETS también es obligatorio'); return; }
  // Si está colocado y se borra ETB, quitarlo del muelle sin confirm()
  if(!etb && mPos[editTgt.nombre]?.colocado){
    delete mPos[editTgt.nombre];
    toast(`↩ ${editTgt.nombre} bajó al lineup (sin ETB)`);
  }
  Object.assign(editTgt,{
    nombre:$('e-nom').value.trim().toUpperCase(), tipo:$('e-tipo').value,
    metros:parseInt($('e-m').value)||editTgt.metros, moves:parseInt($('e-mv').value)||0,
    color:$('e-col').value,
    eta:fromParts($('e-eta-d').value, $('e-eta-t').value),
    etb, ets,
    start:fromParts($('e-start-d').value, $('e-start-t').value),
    service:$('e-srv').value.trim(), notas:$('e-not').value.trim(),
    comentario:$('e-com').value.trim()
  });
  cerrarEditar(); toast('✅ Guardado');
  const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
  render(); s.scrollTop=sv;
});
$('mEDel').addEventListener('click',()=>{
  if(!editTgt) return;
  buques=buques.filter(bq=>bq!==editTgt);
  delete mPos[editTgt.nombre];
  cerrarEditar(); toast('🗑 Eliminado'); render();
});

$('mEDel').addEventListener('click',()=>{
  if(!editTgt) return;
  const nombre=editTgt.nombre;
  buques=buques.filter(bq=>bq!==editTgt);
  delete mPos[nombre];
  cerrarEditar(); toast(`🗑 ${nombre} eliminado`);
  const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
  render(); s.scrollTop=sv;
});

$('mEList')?.addEventListener('click',()=>{
  if(!editTgt) return;
  delete mPos[editTgt.nombre];
  cerrarEditar(); toast('📋 Volvió al lineup');
  const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
  render(); s.scrollTop=sv;
});

/* ─── LÓGICA DE COLISIÓN ─── */
const MARGEN_EXTREMO=15;  // m desde borde del muelle
const MARGEN_BUQUES=30;   // m entre buques

// Verifica si hay superposición de tiempo Y espacio entre dos buques colocados
function colisionaConOtro(b, leftPct, bq){
  if(!b.etb||!b.ets||!bq.etb||!bq.ets) return false;
  // 1) Solapan en tiempo?
  if(!(b.etb < bq.ets && b.ets > bq.etb)) return false;
  // 2) Solapan en espacio físico (con margen de 30m entre buques)?
  const bLeft=leftPct, bRight=leftPct+(b.metros/MUELLE_M)*100;
  const bqLeft=mPos[bq.nombre].leftPct, bqRight=bqLeft+(bq.metros/MUELLE_M)*100;
  const margenPct=(MARGEN_BUQUES/MUELLE_M)*100;
  // Hay colisión física si la distancia entre ellos es menor al margen
  return bLeft < bqRight+margenPct && bRight > bqLeft-margenPct;
}

// Devuelve los buques colocados que colisionan (tiempo + espacio) con b en leftPct dado
function colisionantes(b, leftPct){
  return buques.filter(bq=>{
    if(bq===b || !mPos[bq.nombre]?.colocado) return false;
    return colisionaConOtro(b, leftPct, bq);
  });
}

// Construye los huecos disponibles en el muelle para un rango temporal dado
// Cada hueco sabe qué tiene a la izquierda y derecha (muelle o buque)
function calcularHuecos(colocados){
  const margenExtrPct=(MARGEN_EXTREMO/MUELLE_M)*100;
  const margenBuqPct=(MARGEN_BUQUES/MUELLE_M)*100;

  const ordenados=colocados
    .filter(bq=>mPos[bq.nombre])
    .map(bq=>({
      nombre:bq.nombre,
      left:mPos[bq.nombre].leftPct,
      right:mPos[bq.nombre].leftPct+(bq.metros/MUELLE_M)*100
    }))
    .sort((a,b)=>a.left-b.left);

  const huecos=[];

  if(ordenados.length===0){
    // Muelle vacío
    huecos.push({desde:margenExtrPct, hasta:100-margenExtrPct, izqLabel:'extremo muelle', derLabel:'extremo muelle', izqM:MARGEN_EXTREMO, derM:MARGEN_EXTREMO});
    return huecos;
  }

  // Antes del primer buque
  huecos.push({
    desde:margenExtrPct,
    hasta:ordenados[0].left-margenBuqPct,
    izqLabel:'extremo muelle', derLabel:ordenados[0].nombre,
    izqM:MARGEN_EXTREMO, derM:MARGEN_BUQUES
  });

  // Entre buques
  for(let i=0;i<ordenados.length-1;i++){
    huecos.push({
      desde:ordenados[i].right+margenBuqPct,
      hasta:ordenados[i+1].left-margenBuqPct,
      izqLabel:ordenados[i].nombre, derLabel:ordenados[i+1].nombre,
      izqM:MARGEN_BUQUES, derM:MARGEN_BUQUES
    });
  }

  // Después del último buque
  huecos.push({
    desde:ordenados[ordenados.length-1].right+margenBuqPct,
    hasta:100-margenExtrPct,
    izqLabel:ordenados[ordenados.length-1].nombre, derLabel:'extremo muelle',
    izqM:MARGEN_BUQUES, derM:MARGEN_EXTREMO
  });

  return huecos;
}

// Busca el primer hueco donde entra el buque
// Devuelve {leftPct} o null
function buscarHueco(b, colocados){
  const w=(b.metros/MUELLE_M)*100;
  const huecos=calcularHuecos(colocados);
  for(const h of huecos){
    if(h.hasta-h.desde >= w) return h.desde;
  }
  return null;
}

let colisionPendiente=null;

function mostrarModalColision(b, left, colocados){
  colisionPendiente={b, left, colocados};

  // Para calcular huecos físicos, usar TODOS los buques colocados
  // (no solo los que colisionan en tiempo, sino todos los que ocupan espacio)
  const todosColocados=buques.filter(bq=>bq!==b && mPos[bq.nombre]?.colocado);

  const huecos=calcularHuecos(todosColocados);
  const wM=b.metros;
  const wPct=(b.metros/MUELLE_M)*100;

  let huecoPosible=null;
  let mensajeHuecos='';

  huecos.forEach(h=>{
    const disponiblePct=h.hasta-h.desde;
    const disponibleM=Math.round(disponiblePct*MUELLE_M/100);
    if(disponibleM<=0) return; // ignorar huecos negativos
    const necesitaM=h.izqM+wM+h.derM;
    const cabe=disponiblePct>=wPct;

    if(cabe && huecoPosible===null) huecoPosible=h.desde;

    const icono=cabe?'✅':'❌';
    mensajeHuecos+=`<div class="col-hueco ${cabe?'cabe':'nocabe'}">
      ${icono} ${disponibleM}m libres entre <strong>${h.izqLabel}</strong> y <strong>${h.derLabel}</strong>
      <span class="col-formula">${h.izqM} + ${wM} + ${h.derM} = ${necesitaM}m requeridos</span>
    </div>`;
  });

  if(!mensajeHuecos) mensajeHuecos='<div class="col-hueco nocabe">❌ Sin huecos disponibles en el muelle</div>';

  $('colNombre').textContent=b.nombre;
  $('colInfo').textContent=`${b.metros}m · ETB ${fDT(b.etb)} → ETS ${fDT(b.ets)}`;
  $('colConflictos').innerHTML=`Conflicto con: <strong>${colocados.map(bq=>bq.nombre).join(', ')}</strong>`;
  $('colHuecos').innerHTML=mensajeHuecos;

  const btnAuto=$('colAuto');
  if(huecoPosible!==null){
    btnAuto.style.display='block';
    btnAuto.textContent='✅ Corrección automática';
    btnAuto.disabled=false;
    $('colSinEspacio').style.display='none';
  } else {
    btnAuto.style.display='none';
    $('colSinEspacio').style.display='block';
  }

  $('ovColision').classList.add('vis');
  $('mColision').classList.add('vis');
}

function cerrarColision(){ $('ovColision').classList.remove('vis'); $('mColision').classList.remove('vis'); colisionPendiente=null; }

$('colAuto')?.addEventListener('click',()=>{
  if(!colisionPendiente) return;
  const {b}=colisionPendiente;
  const todosColocados=buques.filter(bq=>bq!==b && mPos[bq.nombre]?.colocado);
  const hueco=buscarHueco(b,todosColocados);
  if(hueco===null){ toast('❌ Sin lugar disponible'); return; }
  mPos[b.nombre]={leftPct:hueco,colocado:true};
  cerrarColision(); dragRow=null; toast(`✅ ${b.nombre} colocado automáticamente`);
  const s=$('aScroll'); const sv=s.scrollTop; s._ok=true;
  render(); s.scrollTop=sv;
});

$('colModificar')?.addEventListener('click',()=>{
  if(!colisionPendiente) return;
  const b=colisionPendiente.b;
  cerrarColision(); dragRow=null;
  setTimeout(()=>abrirEditar(b),100);
});

$('colCancelar')?.addEventListener('click',()=>{ cerrarColision(); dragRow=null; toast('Cancelado'); });
$('colClose')?.addEventListener('click',()=>{ cerrarColision(); dragRow=null; });

/* ─── TOGGLE 3 ESTADOS ─── */
// estados: 'collapsed' | 'basic' | 'full'
let panelEstado='basic';

function setPanelEstado(estado){
  panelEstado=estado;
  const pt=$('panelTabla');
  const pts=$('ptScroll');
  const tablaWrap=$('ptTablaWrap');
  const btnCol=$('trioBtnCol'), btnBasic=$('trioBtnBasic'), btnFull=$('trioBtnFull');

  [btnCol,btnBasic,btnFull].forEach(b=>b.classList.remove('active'));

  if(estado==='collapsed'){
    pt.classList.add('collapsed'); pt.classList.remove('expanded');
    pts.style.display='none'; tablaWrap.style.display='none';
    btnCol.classList.add('active');
  } else if(estado==='basic'){
    pt.classList.remove('collapsed','expanded');
    pts.style.display=''; tablaWrap.style.display='none';
    btnBasic.classList.add('active');
  } else {
    pt.classList.remove('collapsed'); pt.classList.add('expanded');
    pts.style.display='none'; tablaWrap.style.display='flex';
    btnFull.classList.add('active');
    renderTablaCopleta();
  }
  // Forzar re-render del timeline para ajustar ancho
  const s=$('aScroll'); if(s){ const sv=s.scrollTop; s._ok=true; renderTimeline(); s.scrollTop=sv; }
}

$('trioBtnCol')?.addEventListener('click',()=>setPanelEstado('collapsed'));
$('trioBtnBasic')?.addEventListener('click',()=>setPanelEstado('basic'));
$('trioBtnFull')?.addEventListener('click',()=>setPanelEstado('full'));

function renderTablaCopleta(){
  const tbody=$('ptTblBody'); if(!tbody) return;
  tbody.innerHTML='';
  const lista=semAct();
  lista.forEach(b=>{
    const enM=mPos[b.nombre]?.colocado;
    const tr=document.createElement('tr');
    if(enM) tr.classList.add('en-muelle');
    tr.innerHTML=`
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.color}"></span></td>
      <td class="td-nom">${b.nombre}</td>
      <td>${b.tipo}</td>
      <td>${b.orientacion||'—'}</td>
      <td>${b.metros}m</td>
      <td>${b.moves}</td>
      <td class="${b.eta?'':'td-sin'}">${b.eta?fDT(b.eta):'—'}</td>
      <td class="${b.etb?'td-etb':'td-sin'}">${b.etb?fDT(b.etb):'sin ETB'}</td>
      <td class="${b.ets?'':'td-sin'}">${b.ets?fDT(b.ets):'—'}</td>
      <td>${b.service||'—'}</td>
      <td>${enM?'<span class="badge-sm badge-muelle">En muelle</span>':b.etb?'<span class="badge-sm badge-lineup">LineUp</span>':'<span class="badge-sm badge-sinetb">Sin ETB</span>'}</td>
      <td style="color:var(--tx3);max-width:120px;overflow:hidden;text-overflow:ellipsis">${b.notas||'—'}</td>`;
    tr.addEventListener('dblclick',()=>abrirEditar(b));
    tbody.appendChild(tr);
  });
}

/* ─── SCROLL A BUQUE EN TIMELINE ─── */
function scrollToBuque(b){
  const s=$('aScroll');
  const IH=innerH();
  const etbY=dateToY(b.etb);
  const yaAmarrado=etbY>=nowY();
  const targetY=yaAmarrado ? nowY()-BLK_H : etbY-BLK_H;
  // Centrar el bloque en el viewport
  const newScroll=Math.max(0, targetY - s.clientHeight/2 + BLK_H/2);
  s._ok=true;
  s.scrollTop=newScroll;
}
document.querySelectorAll('.gb').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.gb').forEach(b=>b.classList.remove('sel'));
    btn.classList.add('sel');
    const s=$('aScroll');
    const AH=areaH();
    // Posición del centro del viewport en horas respecto al NOW
    const pxHAntes=getPxH();
    const nowYAntes=nowY();
    const centroPxAntes=s.scrollTop+AH/2;
    const centroHoras=(centroPxAntes-nowYAntes)/pxHAntes;
    granH=parseInt(btn.dataset.h);
    s._ok=true;
    render();
    // Restaurar mismo punto central con nueva escala
    s.scrollTop=Math.max(0, nowY()+centroHoras*getPxH()-AH/2);
  });
});

$('bNow').addEventListener('click',()=>{
  const s=$('aScroll');
  s.scrollTop=Math.max(0,nowY()-s.clientHeight+80);
  toast('⊙ Centrado en NOW');
});

$('bSemA').addEventListener('click',()=>{ const ss=[...new Set(buques.map(b=>b.sem))].sort((a,b)=>a-b); const i=ss.indexOf(semana); if(i>0){semana=ss[i-1];render();} });
$('bSemS').addEventListener('click',()=>{ const ss=[...new Set(buques.map(b=>b.sem))].sort((a,b)=>a-b); const i=ss.indexOf(semana); if(i<ss.length-1){semana=ss[i+1];render();} });

$('bSav').addEventListener('click',()=>{
  const snap={semana,fecha:new Date().toISOString(),buques:semAct().map(b=>({...b,eta:b.eta?.toISOString(),etb:b.etb?.toISOString(),ets:b.ets?.toISOString()})),mPos};
  localStorage.setItem(`sched_sem${semana}`,JSON.stringify(snap));
  toast('💾 Guardado — sem. '+semana);
});

function actuFecha(){ const a=new Date(); $('cFecha').textContent=`${a.toLocaleDateString('es-UY',{weekday:'short',day:'numeric',month:'short'})} · ${fH(a)}`; }

/* ─── INIT ─── */
window.addEventListener('resize',()=>render());
render();
setInterval(()=>{ actuFecha(); $('nowt') && ($('.nowt').textContent=`NOW · ${fH(new Date())}`); },60000);


/* ─── SINCRONIZACIÓN FIREBASE ─── */
async function sincronizarConFirebase(){
  const fs = window.FirebaseSesiones;
  if(!fs){ console.warn('Firebase no disponible aún'); return; }
  try{
    const data = {
      tipo: 'schedule',
      fecha: new Date().toISOString(),
      fechaStr: new Date().toLocaleDateString('es-UY') + ' ' + new Date().toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'}),
      semana,
      buques: buques.map(b=>({
        nombre: b.nombre,
        tipo: b.tipo,
        service: b.service||'',
        eta: b.eta ? b.eta.toISOString() : null,
        etb: b.etb ? b.etb.toISOString() : null,
        ets: b.ets ? b.ets.toISOString() : null,
        moves: b.moves||0,
        metros: b.metros||0,
        notas: b.notas||'',
        color: b.color||'#888'
      }))
    };
    await fs.guardarSchedule(data);
    toast('☁️ Schedule sincronizado');
  } catch(e){
    console.warn('Error sincronizando schedule:', e);
  }
}
