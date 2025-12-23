
// scripts/delete-history.mjs
import admin from 'firebase-admin';
import { createRequire } from 'module';

// --- INITIALIZATION ---
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
// --- END INITIALIZATION ---

async function deleteHistory(programa, ano, mes) {
  console.log(`Iniciando borrado de historial para:`);
  console.log(`- Programa: ${programa}`);
  console.log(`- Año: ${ano}`);
  console.log(`- Mes: ${mes}\n`);

  const bulkWriter = db.bulkWriter();
  let deletedIds = new Set();

  // --- Estrategia 1: Borrado por campos (`programa`, `anoEvento`, `mesEvento`) ---
  const byFieldQuery = db.collection('novedades')
    .where('programa', '==', programa)
    .where('anoEvento', '==', String(ano))
    .where('mesEvento', '==', String(mes));

  const byFieldSnapshot = await byFieldQuery.get();
  console.log(`[Estrategia 1] ${byFieldSnapshot.size} registros encontrados por campos.`);
  byFieldSnapshot.forEach(doc => {
    if (!deletedIds.has(doc.id)) {
      bulkWriter.delete(doc.ref);
      deletedIds.add(doc.id);
    }
  });

  // --- Estrategia 2: Borrado por `paymentRecordId` ---
  const paymentRecordId = `${programa}-${mes}-${ano}`;
  const byIdQuery = db.collection('novedades')
    .where('paymentRecordId', '==', paymentRecordId);
  
  const byIdSnapshot = await byIdQuery.get();
  console.log(`[Estrategia 2] ${byIdSnapshot.size} registros encontrados por paymentRecordId ('${paymentRecordId}').`);
  byIdSnapshot.forEach(doc => {
    if (!deletedIds.has(doc.id)) {
      bulkWriter.delete(doc.ref);
      deletedIds.add(doc.id);
    }
  });

  // --- Ejecutar el borrado ---
  if (deletedIds.size > 0) {
    console.log(`\nEliminando un total de ${deletedIds.size} registros únicos...`);
    await bulkWriter.close();
    console.log('¡Historial borrado con éxito!');
  } else {
    console.log('\nNo se encontraron registros que coincidan con los criterios para eliminar.');
  }
}

// --- Bloque de ejecución principal ---
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error('Error: Se requieren 3 argumentos: programa, año y mes.');
  console.error('Ejemplo: node scripts/delete-history.mjs Tutorias 2025 10');
  process.exit(1);
}

const [programa, ano, mes] = args;
deleteHistory(programa, ano, mes).catch(error => {
  console.error('Ocurrió un error crítico durante el borrado:', error);
});
