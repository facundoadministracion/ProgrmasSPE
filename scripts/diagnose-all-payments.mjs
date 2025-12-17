
// Importamos las herramientas de Firebase para el servidor.
import { initializeAdminApp } from '../src/firebase-admin.js';

// Inicializamos la conexión con la base de datos.
const db = initializeAdminApp();

// Esta función listará todos los documentos de la colección 'pagosRegistrados'.
async function listAllPayments() {
  console.log("Iniciando el diagnóstico de la colección 'pagosRegistrados'...");
  console.log("=================================================================");

  // Apuntamos a la colección.
  const paymentsRef = db.collection('pagosRegistrados');

  try {
    // Obtenemos todos los documentos.
    const snapshot = await paymentsRef.get();

    if (snapshot.empty) {
      console.log("No se encontraron documentos en la colección 'pagosRegistrados'.");
      return;
    }

    console.log(`Se encontraron ${snapshot.size} registros de pago. Aquí están los detalles:`)
    console.log("---");

    // Iteramos sobre cada documento y mostramos su información.
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID del Pago: ${doc.id}`);
      console.log(`  - Participant ID: ${data.participantId || 'No especificado'}`);
      console.log(`  - DNI: ${data.dni || 'No especificado'}`);
      console.log(`  - Programa: ${data.programa || 'No especificado'}`);
      console.log(`  - Mes: ${data.mes || 'No especificado'}`);
      console.log(`  - Año: ${data.anio || 'No especificado'}`);
      console.log("---");
    });

  } catch (error) {
    console.error("Error al intentar leer la colección 'pagosRegistrados':", error);
  }
}

// Ejecutamos la función de diagnóstico.
listAllPayments().then(() => {
  console.log("=================================================================");
  console.log("Diagnóstico finalizado.");
});
