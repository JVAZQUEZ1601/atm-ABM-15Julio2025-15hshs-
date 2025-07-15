/* ---------------------------------------------------
 *  Módulo único para las cuatro páginas
 * --------------------------------------------------- */
const STORAGE_KEY  = 'registrosUsuario';   // registros vigentes
const HISTORY_KEY  = 'historialATM';       // altas / bajas / modificaciones
let editIndex      = null,
    deleteIndex    = null,
    pendingIndex   = null;

/* ---------- 1. Detectar página ---------- */
const pathname       = location.pathname;
const isReservaPage  = pathname.endsWith('index-reserva.html');
const isHistorialPage= pathname.endsWith('historial-atms.html');

/* ---------- Elementos DOM ---------- */
const f            = document.getElementById('registroForm');
const tbody        = document.querySelector('#tablaHistorial tbody');
const cards        = document.getElementById('tarjetasContainer');
const fechaInp     = document.getElementById('fechaHasta');
const estadoInp    = document.getElementById('estado');
const submitBtn    = document.getElementById('submitBtn');
const confirmDelBtn= document.getElementById('confirmDeleteBtn');

const modal      = document.getElementById('authModal');
const authUser   = document.getElementById('authUser');
const authPass   = document.getElementById('authPass');
const authOk     = document.getElementById('authOk');
const authCancel = document.getElementById('authCancel');
const authError  = document.getElementById('authError');

const nombre       = document.getElementById('nombre');
const apellido     = document.getElementById('apellido');
const marcaInp     = document.getElementById('marca');
const modeloInp    = document.getElementById('modelo');
const softwareInp  = document.getElementById('software');
const reservadoPor = document.getElementById('reservadoPor');
const imagen       = document.getElementById('imagen');

/* ---------- Utilidades ---------- */
function setFieldsDisabled(state) {
  if (!f) return;
  f.querySelectorAll('input:not([type="button"]):not([type="submit"]),select,textarea')
    .forEach(el => { el.disabled = state; });
}

const obtener  = () => JSON.parse(localStorage.getItem(STORAGE_KEY))  || [];
const guardar  = arr => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

const historialObtener = () => JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
const historialGuardar = arr => localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));

function agregarHistorial(accion, registro) {
  const h = historialObtener();
  h.push({ ...registro, accion, timestamp: new Date().toISOString() });
  historialGuardar(h);
}

function calcEstado(fh) {
  if (!fh) return { txt: '', cls: '' };
  const hoy = new Date();
  const fhd = new Date(`${fh}T00:00:00`);
  return (fhd < hoy.setHours(0,0,0,0))
    ? { txt: 'LIBRE',   cls: 'estado-libre'   }
    : { txt: 'OCUPADO', cls: 'estado-ocupado' };
}

/* ---------- 2. Bloqueo inicial ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (isReservaPage) {
    setFieldsDisabled(true);
    submitBtn.disabled = true;
  }
  isHistorialPage ? renderHistorial() : render();
});

/* ---------- Eventos de formulario ---------- */
fechaInp?.addEventListener('change', () => {
  estadoInp.value = calcEstado(fechaInp.value).txt;
});

f?.addEventListener('submit', e => {
  e.preventDefault();

  const r = {
    nombre      : nombre.value.trim(),
    apellido    : apellido.value.trim(),
    marca       : marcaInp.value.trim(),
    modelo      : modeloInp.value.trim(),
    software    : softwareInp.value.trim(),
    reservadoPor: reservadoPor.value.trim(),
    fechaHasta  : fechaInp.value,
    imagen      : imagen?.value || ''
  };
  r.estado = calcEstado(r.fechaHasta).txt;

  const datos = obtener();

  if (editIndex === null) {                // === ALTA ===
    datos.push(r);
    agregarHistorial('Alta', r);

  } else {                                 // === ACTUALIZACIÓN ===
    datos[editIndex] = r;                  // sobrescribir registro existente
    agregarHistorial('Modificación', r);
  }

  guardar(datos);
  resetForm();
  render();
});

/* ---------- Eliminación ---------- */
confirmDelBtn?.addEventListener('click', () => {
  if (deleteIndex === null) return;
  const datos = obtener();
  const { nombre: n, apellido: a } = datos[deleteIndex];

  if (confirm(`¿Eliminar el registro de ${n} ${a}?`)) {
    const baja = datos.splice(deleteIndex, 1)[0];

    const historialBajas = JSON.parse(localStorage.getItem('historialBajas')) || [];
    historialBajas.push(baja);
    localStorage.setItem('historialBajas', JSON.stringify(historialBajas));

    guardar(datos);
    resetForm();
    render();
  }
});

/* ---------- Render tabla y tarjetas ---------- */
function renderTabla() {
  const datos = obtener();
  tbody.innerHTML = '';
  datos.forEach((r,i) => {
    const est = calcEstado(r.fechaHasta);
    tbody.insertAdjacentHTML('beforeend',`
      <tr>
        <td>${i+1}</td><td>${r.nombre}</td><td>${r.apellido}</td>
        <td>${r.marca}</td><td>${r.modelo}</td><td>${r.software}</td>
        <td>${r.reservadoPor}</td><td>${r.fechaHasta}</td>
        <td class="${est.cls}">${est.txt}</td>
        <td>
          <button class="eliminar-btn" data-del="${i}">Eliminar</button>
          <button class="editar-btn"   data-edit="${i}">Editar</button>
        </td>
      </tr>`);
  });
}

function renderCards() {
  const datos = obtener();
  cards.innerHTML = '';
  datos.forEach((r,i) => {
    const est = calcEstado(r.fechaHasta);
    cards.insertAdjacentHTML('beforeend',`
      <div class="tarjeta">
        <button class="btn-card editar-btn" data-edit="${i}">Editar</button>
        <img src="img/${r.imagen}" alt="Foto">
        <p><strong>ID:</strong> ${r.nombre}</p>
        <p><strong>IP:</strong> ${r.apellido}</p>
        <p><strong>MARCA:</strong> ${r.marca}</p>
        <p><strong>MODELO:</strong> ${r.modelo}</p>
        <p><strong>SOFTWARE:</strong> ${r.software}</p>
        <p><strong>Reservado por:</strong> ${r.reservadoPor}</p>
        <p><strong>Fecha hasta:</strong> ${r.fechaHasta}</p>
        <p><strong>Estado:</strong> <span class="${est.cls}">${est.txt}</span></p>
        <button class="btn-card eliminar-btn el-card" data-del="${i}">Eliminar</button>
      </div>`);
  });
}

function render() {
  if (!tbody) return;
  renderTabla();
  if (cards) renderCards();
}

/* ---------- Render historial ---------- */
function renderHistorial() {
  const movimientos = historialObtener();
  tbody.innerHTML = '';
  movimientos.forEach((m,i) => {
    const est = calcEstado(m.fechaHasta);
    tbody.insertAdjacentHTML('beforeend',`
      <tr>
        <td>${i+1}</td>
        <td class="accion-${m.accion.toLowerCase()}">${m.accion}</td>
        <td class="fecha-cell">${new Date(m.timestamp).toLocaleString()}</td>
        <td>${m.nombre}</td><td>${m.apellido}</td><td>${m.marca}</td>
        <td>${m.modelo}</td><td>${m.software}</td>
        <td>${m.reservadoPor}</td><td>${m.fechaHasta}</td>
        <td class="${est.cls}">${est.txt}</td>
      </tr>`);
  });
}

/* ---------- Delegación de clics ---------- */
cards?.addEventListener('click', e => {
  if (e.target.dataset.edit !== undefined) cargar(e.target.dataset.edit,false);
  else if (e.target.dataset.del !== undefined) autenticar(e.target.dataset.del);
});
tbody?.addEventListener('click', e => {
  if (e.target.dataset.del  !== undefined) autenticar(e.target.dataset.del);
  else if (e.target.dataset.edit !== undefined) cargar(e.target.dataset.edit,false);
});

/* ---------- Autenticación ---------- */
function autenticar(idx){
  pendingIndex = idx;
  modal.classList.add('active');
  authUser.value = authPass.value = '';
  authError.textContent = '';
  authUser.focus();
}

authOk?.addEventListener('click', () => {
  if (authUser.value==='admin' && authPass.value==='1234'){
    hideModal();
    cargar(pendingIndex,true);
    pendingIndex = null;
  }else{
    authError.textContent = 'Credenciales incorrectas';
  }
});
authCancel?.addEventListener('click', hideModal);
modal?.addEventListener('click', e => { if (e.target === modal) hideModal(); });
function hideModal(){ modal.classList.remove('active'); }

/* ---------- Cargar registro ---------- */
function cargar(i, modoEliminar=false){
  const r = obtener()[i];
  nombre.value        = r.nombre;
  apellido.value      = r.apellido;
  marcaInp.value      = r.marca;
  modeloInp.value     = r.modelo;
  softwareInp.value   = r.software;
  reservadoPor.value  = r.reservadoPor;
  fechaInp.value      = r.fechaHasta;
  estadoInp.value     = calcEstado(r.fechaHasta).txt;
  imagen.value        = r.imagen;

  if (isReservaPage){
    setFieldsDisabled(true);
    if (!modoEliminar){
      reservadoPor.disabled = false;
      fechaInp.disabled     = false;
      submitBtn.disabled    = false;
    }
  }

  editIndex = i;

  if (modoEliminar){
    deleteIndex = i;
    confirmDelBtn.disabled = false;
  }else{
    deleteIndex = null;
    confirmDelBtn.disabled = true;
  }
  submitBtn.textContent = modoEliminar ? 'Guardar' : 'Actualizar';
  f.scrollIntoView({ behavior:'smooth' });
}

/* ---------- Reset ---------- */
function resetForm(){
  f.reset();
  estadoInp.value = '';
  editIndex = deleteIndex = null;
  submitBtn.textContent  = 'Guardar';
  confirmDelBtn.disabled = true;

  if (isReservaPage){
    setFieldsDisabled(true);
    submitBtn.disabled = true;
  }
}

/* ---------- Sincronización entre pestañas ---------- */
window.addEventListener('storage', e => {
  if (e.key===STORAGE_KEY  && !isHistorialPage) render();
  if (e.key===HISTORY_KEY  &&  isHistorialPage) renderHistorial();
});



