"use strict";
let chartInstance = null;

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addWeeks(d, w) { return addDays(d, w * 7); }
function fmt(d) { return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
function fmtShort(d) { return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }); }
function weeksBetween(a, b) { return (b - a) / (7 * 86400000); }
function daysBetween(a, b) { return Math.floor((b - a) / 86400000); }

function intensity(week, premWeeks) {
  const ic = week - premWeeks;
  let v;
  if      (ic <= 0)   v = 10 + week * 3;
  else if (ic <= 6)   v = 28 + (ic / 6) * 62;
  else if (ic <= 8)   v = 90 + Math.sin((ic - 6) / 2 * Math.PI) * 10;
  else if (ic <= 16)  v = 100 - ((ic - 8) / 8) * 72;
  else                v = 28 - Math.min((ic - 16) / 6, 1) * 18;
  return Math.max(8, Math.round(v));
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const open = item.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
}

function calcular() {
  const bdVal   = document.getElementById('birthDate').value;
  const gestVal = document.getElementById('gestWeeks').value;
  if (!bdVal || !gestVal) {
    alert('Por favor, preencha a data de nascimento e as semanas de gestação.');
    return;
  }

  const birth     = new Date(bdVal + 'T12:00:00');
  const gest      = parseInt(gestVal);
  const premWeeks = Math.max(0, 40 - gest);

  const dpp       = addWeeks(birth, premWeeks);
  const peakStart = addWeeks(birth, premWeeks + 6);
  const peakEnd   = addWeeks(birth, premWeeks + 8);
  const purpleEnd = addWeeks(birth, premWeeks + 16);
  const today     = new Date(); today.setHours(12,0,0,0);

  const chronoToday = Math.max(0, Math.floor(weeksBetween(birth, today)));
  const icToday     = Math.max(0, Math.floor(weeksBetween(dpp, today)));
  const totalDays   = daysBetween(birth, purpleEnd);
  const elapsed     = Math.min(daysBetween(birth, today), totalDays);
  const pct         = Math.min(100, Math.round((elapsed / totalDays) * 100));

  let fase, faseMsg;
  if (today < birth) {
    fase = 'before'; faseMsg = 'O bebê ainda não nasceu.';
  } else if (today < peakStart) {
    const d = daysBetween(today, peakStart);
    fase = 'rising'; faseMsg = `↑ Fase de escalada — o pico começa em ${d} dias (${fmtShort(peakStart)}).`;
  } else if (today <= peakEnd) {
    const d = daysBetween(today, peakEnd);
    fase = 'peak'; faseMsg = `⚡ Pico máximo agora — o momento mais intenso. Dura mais ${d} dias (até ${fmtShort(peakEnd)}).`;
  } else if (today <= purpleEnd) {
    const d = daysBetween(today, purpleEnd);
    fase = 'falling'; faseMsg = `↓ Fase de declínio — o mais difícil já passou! Fim em ${d} dias (${fmtShort(purpleEnd)}).`;
  } else {
    fase = 'done'; faseMsg = `✓ Período PURPLE encerrado — parabéns, você passou por isso!`;
  }

  document.getElementById('subtitleInfo').textContent =
    gest < 40
      ? `Nascido em ${fmt(birth)} · ${gest} semanas · ${premWeeks} sem prematuro`
      : `Nascido em ${fmt(birth)} · A termo (40 semanas)`;

  // Milestones
  const ms = document.getElementById('milestones');
  ms.innerHTML = '';
  const msData = [
    { type:'birth', icon:'🌱', label:'Nascimento',       date:birth,      sub:`${gest} semanas de gestação` },
    ...(premWeeks>0 ? [{ type:'dpp', icon:'📅', label:'DPP teórica', date:dpp, sub:'IC começa a correr daqui' }] : []),
    { type:'peak',  icon:'⚡', label:'Início do pico',   date:peakStart,  sub:'IC 6 semanas' },
    { type:'peak',  icon:'🔥', label:'Fim do pico',      date:peakEnd,    sub:'IC 8 semanas' },
    { type:'end',   icon:'🌤️',label:'Fim do PURPLE',    date:purpleEnd,  sub:'IC ~16 semanas' },
    { type:'today', icon:'📍', label:'Hoje',             date:today,      sub:`${chronoToday} sem crono · IC ${icToday} sem` },
  ];
  msData.forEach((m,i) => {
    const div = document.createElement('div');
    div.className = `milestone type-${m.type} fade-in`;
    div.setAttribute('role','listitem');
    div.style.animationDelay = (i * 0.07) + 's';
    div.innerHTML = `<div class="m-icon" aria-hidden="true">${m.icon}</div>
      <div class="m-label">${m.label}</div>
      <div class="m-date">${fmtShort(m.date)}</div>
      <div class="m-sub">${m.sub}</div>`;
    ms.appendChild(div);
  });

  // Progresso
  document.getElementById('progEndLabel').textContent = `Fim PURPLE · ${fmtShort(purpleEnd)}`;
  document.getElementById('progBar').setAttribute('aria-valuenow', pct);
  setTimeout(() => { document.getElementById('progFill').style.width = pct + '%'; }, 300);
  const fc = { before:'#94A3B8', rising:'#8B5CF6', peak:'#F97316', falling:'#0D9488', done:'#0D9488' };
  document.getElementById('progMsg').innerHTML = `<span style="color:${fc[fase]}">${faseMsg}</span>`;

  // Gráfico
  const totalWeeks = premWeeks + 22;
  const labels=[], data=[], pointColors=[], pointRadius=[], pointBorderW=[];
  const idx = { dpp:-1, peakStart:-1, peakEnd:-1, end:-1, today:-1 };

  for (let w=0; w<=totalWeeks; w+=0.5) {
    const d = addWeeks(birth, w);
    labels.push(fmtShort(d));
    data.push(intensity(w, premWeeks));
    if (Math.abs(w - premWeeks)         < 0.3)               idx.dpp       = labels.length-1;
    if (Math.abs(w - (premWeeks+6))     < 0.3)               idx.peakStart = labels.length-1;
    if (Math.abs(w - (premWeeks+8))     < 0.3)               idx.peakEnd   = labels.length-1;
    if (Math.abs(w - (premWeeks+16))    < 0.3)               idx.end       = labels.length-1;
    if (Math.abs(weeksBetween(birth,today)-w)<0.3 && idx.today<0) idx.today = labels.length-1;
  }

  labels.forEach((_,i) => {
    if      (i===idx.today)                          { pointColors.push('#2563EB'); pointRadius.push(7); pointBorderW.push(2); }
    else if (i===idx.peakStart||i===idx.peakEnd)     { pointColors.push('#F97316'); pointRadius.push(7); pointBorderW.push(2); }
    else if (i===idx.end)                            { pointColors.push('#0D9488'); pointRadius.push(7); pointBorderW.push(2); }
    else if (premWeeks>0 && i===idx.dpp)             { pointColors.push('#D97706'); pointRadius.push(6); pointBorderW.push(2); }
    else                                             { pointColors.push('transparent'); pointRadius.push(0); pointBorderW.push(0); }
  });

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const annotations = {
    id:'annotations',
    afterDraw(chart) {
      const {ctx, chartArea:ca, scales} = chart;
      if (!ca) return;
      // zona pico
      if (idx.peakStart>=0 && idx.peakEnd>=0) {
        ctx.save();
        ctx.fillStyle = 'rgba(249,115,22,.09)';
        ctx.fillRect(scales.x.getPixelForValue(idx.peakStart), ca.top, scales.x.getPixelForValue(idx.peakEnd)-scales.x.getPixelForValue(idx.peakStart), ca.bottom-ca.top);
        ctx.restore();
      }
      // linha hoje
      if (idx.today>=0) {
        const xT = scales.x.getPixelForValue(idx.today);
        ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle='rgba(37,99,235,.55)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(xT,ca.top); ctx.lineTo(xT,ca.bottom); ctx.stroke(); ctx.restore();
      }
      // anotações texto
      const isMobile = (ca.right - ca.left) < 380;
      const fontSize = isMobile ? 9 : 10;
      const lineH    = isMobile ? 12 : 13;

      function ann(i, lines, color, align, yOffset) {
        if (i<0) return;
        const x  = scales.x.getPixelForValue(i);
        const ox = align==='left' ? 5 : align==='right' ? -5 : 0;
        const yBase = ca.top + fontSize + 4 + (yOffset || 0);
        ctx.save();
        ctx.font = `700 ${fontSize}px Lato,sans-serif`;
        ctx.textAlign = align || 'center';

        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth   = 4;
        ctx.lineJoin    = 'round';
        lines.forEach((ln, li) => ctx.strokeText(ln, x + ox, yBase + li * lineH));

        ctx.fillStyle = color;
        lines.forEach((ln, li) => ctx.fillText(ln, x + ox, yBase + li * lineH));
        ctx.restore();
      }

      const peakLabelStart = isMobile ? ['↑ Pico', fmtShort(peakStart)] : ['Início pico', fmtShort(peakStart)];
      const peakLabelEnd   = isMobile ? ['↓ Pico', fmtShort(peakEnd)]   : ['Fim pico',    fmtShort(peakEnd)];

      if (premWeeks>0) ann(idx.dpp,       ['DPP', fmtShort(dpp)],         '#D97706');
      ann(idx.today,     ['Hoje', fmtShort(today)],                        '#2563EB', 'left');
      ann(idx.peakStart, peakLabelStart,                                   '#F97316', 'center', 0);
      ann(idx.peakEnd,   peakLabelEnd,                                     '#F97316', 'center', isMobile ? 28 : 0);
      ann(idx.end,       ['Fim PURPLE', fmtShort(purpleEnd)],              '#0D9488', 'right');
    }
  };

  const ctx2 = document.getElementById('cryChart').getContext('2d');
  chartInstance = new Chart(ctx2, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Intensidade do choro',
        data,
        borderColor:'#8B5CF6',
        borderWidth:2.5,
        tension:0.42,
        fill:true,
        backgroundColor:'rgba(139,92,246,.08)',
        pointBackgroundColor:pointColors,
        pointBorderColor:pointColors.map(c=>c==='transparent'?'transparent':'white'),
        pointRadius,
        pointBorderWidth:pointBorderW,
        pointHoverRadius:6,
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:'#1E293B',
          titleColor:'#F8FAFC',
          bodyColor:'rgba(248,250,252,.72)',
          padding:12,
          cornerRadius:10,
          titleFont:{ family:'Lato', size:12, weight:'700' },
          bodyFont:{ family:'Lato', size:11 },
          callbacks:{
            title: items => {
              const w = items[0].dataIndex * 0.5;
              return addWeeks(birth,w).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
            },
            label: item => {
              const w = item.dataIndex*0.5;
              const ic = Math.max(0, w-premWeeks);
              return [` Intensidade: ${item.raw}%`, ` Semana crono: ${Math.floor(w)}`, ` IC: ${Math.floor(ic)} semanas`];
            }
          }
        }
      },
      scales:{
        x:{
          ticks:{ maxRotation:45, autoSkip:true, maxTicksLimit:12, color:'#94A3B8', font:{family:'Lato',size:10} },
          grid:{ color:'rgba(148,163,184,.12)' },
          title:{ display:true, text:'Semanas a partir do nascimento', color:'#94A3B8', font:{family:'Lato',size:11} }
        },
        y:{
          min:0, max:115,
          ticks:{ color:'#94A3B8', font:{family:'Lato',size:10}, callback:v=>v<=100?v+'%':'' },
          grid:{ color:'rgba(148,163,184,.12)' },
          title:{ display:true, text:'Intensidade do choro', color:'#94A3B8', font:{family:'Lato',size:11} }
        }
      }
    },
    plugins:[annotations]
  });

  // Tags fases
  const tc = document.getElementById('phaseTags');
  tc.innerHTML = '';
  [
    { label:`Escalada: ${fmtShort(birth)} → ${fmtShort(peakStart)}`, color:'#6D28D9', bg:'#EDE9FE' },
    { label:`Pico: ${fmtShort(peakStart)} → ${fmtShort(peakEnd)}`,   color:'#C2410C', bg:'#FEF3C7' },
    { label:`Declínio: ${fmtShort(peakEnd)} → ${fmtShort(purpleEnd)}`,color:'#0F766E', bg:'#CCFBF1' },
  ].forEach(t => {
    const s = document.createElement('span');
    s.className = 'phase-tag';
    s.style.cssText = `color:${t.color};background:${t.bg}`;
    s.textContent = t.label;
    tc.appendChild(s);
  });

  const res = document.getElementById('result');
  res.classList.add('visible');
  setTimeout(()=>{ res.scrollIntoView({ behavior:'smooth', block:'start' }); }, 100);
}

// Bloquear datas futuras
document.getElementById('birthDate').max = new Date().toISOString().split('T')[0];
