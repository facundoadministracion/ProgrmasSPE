
// scripts/diagnose-novedad-final.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function diagnoseNovedad() {
  console.log("--- Iniciando diagnóstico específico de 'novedad' ---");

  const program = 'Tutorías';
  const type = 'POSIBLE_BAJA';

  // Months and years to check, both as strings and numbers
  const months = ['09', '10', '11', 9, 10, 11];
  const years = ['2025', 2025];

  let foundNovedades = [];

  for (const anio of years) {
    for (const mes of months) {
      const query = db.collection('novedades')
        .where('programa', '==', program)
        .where('type', '==', type)
        .where('anio', '==', anio)
        .where('mes', '==', mes);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        console.log(`\n¡ENCONTRADA! Coincidencia con: { programa: '${program}', type: '${type}', anio: ${JSON.stringify(anio)}, mes: ${JSON.stringify(mes)} }`);
        snapshot.forEach(doc => {
          console.log(`  - ID: ${doc.id}, Datos:`, doc.data());
          foundNovedades.push(doc.data());
        });
      } else {
        // console.log(`No se encontró nada con: { anio: ${JSON.stringify(anio)}, mes: ${JSON.stringify(mes)} }`);
      }
    }
  }

  if (foundNovedades.length > 0) {
    console.log('\n--- Diagnóstico Finalizado: Se encontraron las novedades. ---');
    console.log('La causa del problema es un formato de dato inesperado (número vs. string) en los campos de fecha.');
  } else {
    console.log('\n--- Diagnóstico Finalizado: NO se encontró ninguna novedad. ---');
    console.log('Esto es muy extraño. Si la UI muestra la novedad, podría ser un problema de cache en el navegador o un campo con un nombre totalmente inesperado.');
  }
}

diagnoseNovedad().catch(console.error);
