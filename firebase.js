/* ============================================================
   DOCKSIM — firebase.js
   Gestión de sesiones del muelle + schedule en Firestore
============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection,
         getDocs, orderBy, query, limit, startAfter, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAbL7OCNH7gbUQghQ-KcXTx9fUzy39H-NQ",
  authDomain:        "simuelleapp.firebaseapp.com",
  projectId:         "simuelleapp",
  storageBucket:     "simuelleapp.firebasestorage.app",
  messagingSenderId: "503527848585",
  appId:             "1:503527848585:web:ce3ed53840fcbcb5b7e458"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const PAGE_SIZE = 6;
let _lastDoc = null;

function generarId() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/* ─── SESIONES DEL MUELLE ─── */
async function guardarSesion(nombreSesion) {
  const snapshot = window.DockSim?.getSnapshot?.();
  if (!snapshot) throw new Error('Sin datos');
  const id  = generarId();
  const now = new Date();
  const data = {
    id,
    nombre:        nombreSesion || `Sesión ${now.toLocaleDateString('es-UY')} ${now.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}`,
    fecha:         now.toISOString(),
    fechaStr:      `${now.toLocaleDateString('es-UY')} ${now.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}`,
    fechaYMD:      `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
    buquesNombres: snapshot.buques.map(b => b.nombre.toLowerCase()),
    buques:        snapshot.buques,
    cabos:         snapshot.cabos,
    contadores:    snapshot.contadores
  };
  await setDoc(doc(db, 'sesiones', id), data);
  return id;
}

async function cargarSesionPorId(id) {
  const snap = await getDoc(doc(db, 'sesiones', id));
  if (!snap.exists()) throw new Error('Sesión no encontrada');
  return snap.data();
}

async function eliminarSesion(id) {
  await deleteDoc(doc(db, 'sesiones', id));
}

async function primeraPagina() {
  _lastDoc = null;
  return _traerPagina();
}

async function siguientePagina() {
  if (!_lastDoc) return { sesiones: [], hayMas: false };
  return _traerPagina();
}

async function _traerPagina() {
  let q = query(collection(db,'sesiones'), orderBy('fecha','desc'), limit(PAGE_SIZE));
  if (_lastDoc) q = query(collection(db,'sesiones'), orderBy('fecha','desc'), startAfter(_lastDoc), limit(PAGE_SIZE));
  const snap = await getDocs(q);
  _lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return {
    sesiones: snap.docs.map(d => d.data()),
    hayMas:   snap.docs.length === PAGE_SIZE
  };
}

/* ─── SCHEDULE ─── */
// Guarda el schedule actual (llamado automáticamente al cargar Excel)
async function guardarSchedule(data) {
  // Siempre sobreescribe el mismo doc "current" — es el schedule activo
  await setDoc(doc(db, 'schedule', 'current'), {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

// Obtener el schedule actual una sola vez
async function obtenerSchedule() {
  const snap = await getDoc(doc(db, 'schedule', 'current'));
  if (!snap.exists()) return null;
  return snap.data();
}

// Escuchar cambios en tiempo real del schedule (usado por DockSim muelle)
function escucharSchedule(callback) {
  return onSnapshot(doc(db, 'schedule', 'current'), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn('Error escuchando schedule:', error);
  });
}

/* ─── Exponer globalmente ─── */
window.FirebaseSesiones = {
  // Muelle
  guardarSesion,
  cargarSesionPorId,
  eliminarSesion,
  primeraPagina,
  siguientePagina,
  PAGE_SIZE,
  // Schedule
  guardarSchedule,
  obtenerSchedule,
  escucharSchedule
};
