// Valores por defecto
let totalSaldo = 0;
let historial = [];
let papelera = [];
let catsGasto = [
    {n: 'Compras', e:'🛒', c:'#4caf50'}, {n: 'Comida', e:'🍴', c:'#ff9800'}, {n: 'Bus', e:'🚌', c:'#2196f3'}
];
let catsIngreso = [
    {n: 'Sueldo', e:'💼', c:'#4caf50'}, {n: 'Venta', e:'🤝', c:'#00c853'}
];

// TRY-CATCH de seguridad: Esto evita que si tu entorno bloquea LocalStorage, los botones dejen de funcionar.
try {
    if(localStorage.getItem('gl_saldo')) totalSaldo = parseFloat(localStorage.getItem('gl_saldo'));
    if(localStorage.getItem('gl_hist')) historial = JSON.parse(localStorage.getItem('gl_hist'));
    if(localStorage.getItem('gl_papelera')) papelera = JSON.parse(localStorage.getItem('gl_papelera'));
    if(localStorage.getItem('gl_cats_g')) catsGasto = JSON.parse(localStorage.getItem('gl_cats_g'));
    if(localStorage.getItem('gl_cats_i')) catsIngreso = JSON.parse(localStorage.getItem('gl_cats_i'));
} catch(e) {
    console.warn("LocalStorage no disponible. Trabajando temporalmente sin guardado local.");
}

let miGrafico, graficoRendimiento, periodoActivo = 'mensual', fechaNavegacion = new Date();
let modoActual, catActual, colorCatActual, tipoAddActual = 'gasto';

function guardarTodo() {
    try {
        localStorage.setItem('gl_saldo', totalSaldo);
        localStorage.setItem('gl_hist', JSON.stringify(historial));
        localStorage.setItem('gl_papelera', JSON.stringify(papelera));
        localStorage.setItem('gl_cats_g', JSON.stringify(catsGasto));
        localStorage.setItem('gl_cats_i', JSON.stringify(catsIngreso));
    } catch(e) {
        console.warn("No se pudo guardar en localStorage.");
    }
}

// --- SELECTOR DE INGRESOS ---
function abrirSelectorIngresos() {
    const grid = document.getElementById('grid-ingresos');
    grid.innerHTML = '';
    catsIngreso.forEach((cat, i) => {
        const div = document.createElement('div');
        div.className = 'item-ingreso';
        div.innerHTML = `${cat.e}<br><small>${cat.n}</small> <button class="btn-eliminar-cat" style="display:block; top:-5px; right:-5px" onclick="event.stopPropagation(); confirmarBorrarCat(${i}, 'ingreso')">✕</button>`;
        div.onclick = () => { cerrarModal('modal-selector-ingresos'); abrirCalc('ingreso', cat.n, cat.e, cat.c); };
        grid.appendChild(div);
    });
    document.getElementById('modal-selector-ingresos').style.display = 'flex';
}

function abrirModalAdd(tipo) {
    tipoAddActual = tipo;
    document.getElementById('add-cat-titulo').innerText = tipo === 'gasto' ? "Nuevo Gasto" : "Nuevo Origen Ingreso";
    document.getElementById('modal-add-cat').style.display = 'flex';
}

function guardarNuevaCategoria() {
    const n = document.getElementById('new-cat-name').value;
    const e = document.getElementById('new-cat-emoji').value || '💰';
    if(n) {
        if(tipoAddActual === 'gasto') catsGasto.push({n:n, e:e, c:'#4caf50'});
        else catsIngreso.push({n:n, e:e, c:'#00c853'});
        guardarTodo(); dibujarIconos(); 
        if(tipoAddActual === 'ingreso') abrirSelectorIngresos();
        cerrarModal('modal-add-cat');
        document.getElementById('new-cat-name').value = '';
        document.getElementById('new-cat-emoji').value = '';
    }
}

function confirmarBorrarCat(i, tipo) {
    const lista = tipo === 'gasto' ? catsGasto : catsIngreso;
    mostrarConfirmacion(`¿Eliminar la categoría "${lista[i].n}"?`, () => {
        lista.splice(i, 1);
        guardarTodo(); dibujarIconos();
        if(tipo === 'ingreso') abrirSelectorIngresos();
    });
}

// --- RENDIMIENTO ---
function abrirGraficoRendimiento() {
    document.getElementById('modal-rendimiento').style.display = 'flex';
    let iT = 0; let gT = 0;
    historial.forEach(item => { if(item.tipo === 'ingreso') iT += item.monto; else gT += item.monto; });
    const el = document.getElementById('estado-texto');
    if (iT === 0 && gT > 0) { el.innerText = "PÉSIMO"; el.style.backgroundColor = "#f23645"; }
    else if (gT > iT) { el.innerText = "BAJO"; el.style.backgroundColor = "#ff9800"; }
    else if (iT >= gT * 2) { el.innerText = "EXCELENTE"; el.style.backgroundColor = "#089981"; }
    else { el.innerText = "BUENO"; el.style.backgroundColor = "#2196f3"; }
    
    try {
        if (graficoRendimiento) graficoRendimiento.destroy();
        graficoRendimiento = new Chart(document.getElementById('canvasRendimiento').getContext('2d'), {
            type: 'bar', data: { labels: ["Ingresos", "Gastos"], datasets: [{ data: [iT, -gT], backgroundColor: ['#089981', '#f23645'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#2a2e39' }, ticks: { color: '#d1d4dc' } }, x: { grid: { display: false }, ticks: { color: '#d1d4dc' } } } }
        });
    } catch(e) { console.warn("Error gráfico"); }
}

// --- CORE ---
function abrirHistorial() {
    const lista = document.getElementById('lista-historial');
    lista.innerHTML = historial.length === 0 ? '<p style="text-align:center">Vacío</p>' : '';
    historial.slice().reverse().forEach((item, index) => {
        const realIdx = historial.length - 1 - index;
        const d = new Date(item.fechaISO);
        const fT = d.toLocaleDateString('es-ES', {day:'numeric', month:'short'}) + ', ' + d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
        lista.innerHTML += `<div class="hist-item"><div style="flex:1"><b>${item.categoria}</b><br><span style="font-size:11px; color:#666;">${fT}</span><br><small>${item.nota || ''}</small></div><div style="font-weight:bold; color:${item.tipo==='gasto'?'#e53935':'#4caf50'}">${item.monto.toFixed(2)}</div><button onclick="moverAPapelera(${realIdx})" style="border:none; background:none; cursor:pointer;">🗑️</button></div>`;
    });
    document.getElementById('modal-historial').style.display = 'flex';
}

function moverAPapelera(idx) {
    const item = historial[idx];
    mostrarConfirmacion(`¿Mover Bs ${item.monto} a la papelera?`, () => {
        if(item.tipo === 'gasto') totalSaldo += item.monto; else totalSaldo -= item.monto;
        papelera.push(historial.splice(idx, 1)[0]); guardarTodo(); actualizarGrafico(); actualizarPantalla(); abrirHistorial();
    });
}

function confirmarVaciarPapelera() { mostrarConfirmacion("¿Borrar permanentemente?", () => { papelera = []; guardarTodo(); abrirPapelera(); }); }

function abrirPapelera() {
    const lista = document.getElementById('lista-papelera');
    lista.innerHTML = papelera.length === 0 ? '<p style="text-align:center">Vacía</p>' : '';
    papelera.forEach((item, idx) => {
        lista.innerHTML += `<div class="hist-item"><div style="flex:1"><b>${item.categoria}</b><br><small>Bs ${item.monto}</small></div><button onclick="restaurarItem(${idx})" style="border:none; background:none; font-size:18px;">🔄</button></div>`;
    });
    document.getElementById('modal-papelera').style.display = 'flex';
}

function restaurarItem(idx) {
    const item = papelera.splice(idx, 1)[0];
    if(item.tipo === 'gasto') totalSaldo -= item.monto; else totalSaldo += item.monto;
    historial.push(item); guardarTodo(); actualizarGrafico(); actualizarPantalla(); abrirPapelera();
}

function confirmarBorrarTodo() {
    mostrarConfirmacion("¿Enviar historial a papelera?", () => {
        historial.forEach(item => { if(item.tipo === 'gasto') totalSaldo += item.monto; else totalSaldo -= item.monto; });
        papelera = papelera.concat(historial); historial = []; guardarTodo(); actualizarGrafico(); actualizarPantalla(); abrirHistorial();
    });
}

function mostrarConfirmacion(msg, cb) {
    document.getElementById('confirm-text').innerText = msg;
    document.getElementById('confirm-si').onclick = () => { cb(); cerrarModal('modal-confirm'); };
    document.getElementById('modal-confirm').style.display = 'flex';
}

function dibujarIconos() {
    const cont = document.getElementById('contenedor-iconos');
    cont.querySelectorAll('.icono').forEach(i => i.remove());
    const radio = 130; const centroX = 170, centroY = 170;
    catsGasto.forEach((cat, i) => {
        const angulo = (i * (360 / catsGasto.length) - 90) * (Math.PI / 180);
        const x = centroX + radio * Math.cos(angulo) - 23;
        const y = centroY + radio * Math.sin(angulo) - 23;
        const div = document.createElement('div');
        div.className = 'icono';
        div.style.left = x + 'px'; div.style.top = y + 'px'; div.style.borderColor = cat.c;
        div.innerHTML = `${cat.e} <button class="btn-eliminar-cat" onclick="event.stopPropagation(); confirmarBorrarCat(${i}, 'gasto')">✕</button>`;
        div.onclick = (e) => { e.stopPropagation(); abrirCalc('gasto', cat.n, cat.e, cat.c); };
        div.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); document.body.classList.add('modo-edicion'); };
        cont.appendChild(div);
    });
}

function finalizar() {
    const monto = parseFloat(document.getElementById('pantalla').innerText);
    if(monto > 0) {
        const item = { tipo: modoActual, categoria: catActual, monto: monto, fechaISO: new Date().toISOString(), nota: document.getElementById('input-nota').value, color: colorCatActual };
        if(modoActual === 'gasto') totalSaldo -= monto; else totalSaldo += monto;
        historial.push(item); guardarTodo(); actualizarGrafico(); actualizarPantalla();
    }
    cerrarModal('modal-calc');
}

function cambiarPeriodo(p, btn) {
    periodoActivo = p; document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); document.getElementById('nav-fecha').style.display = (p === 'diario') ? 'flex' : 'none';
    actualizarGrafico(); actualizarPantalla();
}

function cambiarDia(d) { fechaNavegacion.setDate(fechaNavegacion.getDate() + d); actualizarUIFecha(); }
function seleccionarFechaCalendario(v) { const p = v.split('-'); fechaNavegacion = new Date(p[0], p[1]-1, p[2]); actualizarUIFecha(); }
function actualizarUIFecha() {
    const h = new Date(); const esH = fechaNavegacion.toDateString() === h.toDateString();
    document.getElementById('fecha-actual-texto').innerText = esH ? "Hoy" : fechaNavegacion.toLocaleDateString('es-ES', {day:'numeric', month:'short'});
    actualizarGrafico(); actualizarPantalla();
}

function obtenerDatosFiltrados() {
    const ref = new Date(fechaNavegacion); const agrupar = {};
    historial.forEach(item => {
        if (item.tipo !== 'gasto') return;
        const fItem = new Date(item.fechaISO); let inc = false;
        if (periodoActivo === 'diario') inc = fItem.toDateString() === ref.toDateString();
        else if (periodoActivo === 'semanal') inc = (Math.abs(ref - fItem) / 8.64e7) <= 7;
        else if (periodoActivo === 'mensual') inc = fItem.getMonth() === ref.getMonth() && fItem.getFullYear() === ref.getFullYear();
        else inc = fItem.getFullYear() === ref.getFullYear();
        if (inc) agrupar[item.categoria] = (agrupar[item.categoria] || 0) + item.monto;
    });
    return agrupar;
}

function actualizarGrafico() {
    if(!miGrafico) return;
    const d = obtenerDatosFiltrados();
    miGrafico.data.labels = Object.keys(d); miGrafico.data.datasets[0].data = Object.values(d);
    miGrafico.update();
}

function actualizarPantalla() {
    const f = (n) => `Bs ${n.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('saldo-total').innerText = f(totalSaldo);
    document.getElementById('display-centro').innerText = f(totalSaldo);
    const tg = Object.values(obtenerDatosFiltrados()).reduce((a,b)=>a+b, 0);
    document.getElementById('sub-centro').innerText = `Gasto ${periodoActivo}: ${f(tg)}`;
}

function initGrafico() {
    try {
        const ctx = document.getElementById('canvasGrafico').getContext('2d');
        miGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#4caf50', '#f44336', '#2196f3', '#ff9800', '#9c27b0'], borderWidth: 0, cutout: '82%' }] }, options: { plugins: { legend: { display: false } } } });
    } catch(e) { console.warn("Gráfico no cargó aún."); }
    actualizarGrafico(); actualizarPantalla(); dibujarIconos();
}

function abrirCalc(m, c, e, col) { modoActual = m; catActual = c; colorCatActual = col; document.getElementById('calc-titulo').innerText = e + " " + c; document.getElementById('modal-calc').style.display = 'flex'; document.getElementById('pantalla').innerText = '0'; document.getElementById('input-nota').value = ''; }
function press(n) { const p = document.getElementById('pantalla'); if(p.innerText==='0'&&n!=='.') p.innerText=n; else p.innerText+=n; }
function limpiar() { document.getElementById('pantalla').innerText = '0'; }
function backspace() { const p = document.getElementById('pantalla'); p.innerText = p.innerText.slice(0,-1) || '0'; }
function cerrarModal(id) { document.getElementById(id).style.display='none'; }

// FORZAMOS LA EXPOSICIÓN GLOBAL DE LAS FUNCIONES PARA QUE EL HTML LAS ENCUENTRE SIEMPRE
window.cambiarPeriodo = cambiarPeriodo;
window.cambiarDia = cambiarDia;
window.seleccionarFechaCalendario = seleccionarFechaCalendario;
window.abrirModalAdd = abrirModalAdd;
window.abrirGraficoRendimiento = abrirGraficoRendimiento;
window.abrirCalc = abrirCalc;
window.abrirHistorial = abrirHistorial;
window.abrirSelectorIngresos = abrirSelectorIngresos;
window.cerrarModal = cerrarModal;
window.guardarNuevaCategoria = guardarNuevaCategoria;
window.press = press;
window.limpiar = limpiar;
window.backspace = backspace;
window.finalizar = finalizar;
window.abrirPapelera = abrirPapelera;
window.confirmarBorrarTodo = confirmarBorrarTodo;
window.confirmarVaciarPapelera = confirmarVaciarPapelera;
window.moverAPapelera = moverAPapelera;
window.confirmarBorrarCat = confirmarBorrarCat;
window.restaurarItem = restaurarItem;

window.onload = initGrafico;