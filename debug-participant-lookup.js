const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

const debugParticipantLookup = async () => {
  // DNI extraído del pago de ejemplo que encontramos antes.
  const testDNI = "36035056";

  console.log(`\n--- Iniciando Búsqueda de Depuración para el DNI: ${testDNI} ---\n`);

  try {
    console.log(`Buscando en la colección 'participantes' un documento con el campo 'dni' igual a '${testDNI}'...`);

    // Intenta buscar por el DNI como STRING
    const querySnapshot = await firestore.collection('participantes').where('dni', '==', testDNI).get();

    if (!querySnapshot.empty) {
      console.log("\n¡Éxito! Se encontró un participante con el DNI como STRING.");
      querySnapshot.forEach(doc => {
        console.log("-------------------------------------------");
        console.log(`ID del Documento: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
        console.log("-------------------------------------------\n");
        console.log("El problema podría estar en la lógica de agregación del script principal.");
      });
      return;
    }

    console.log("\nNo se encontró al participante con el DNI como STRING. Intentando como NÚMERO...");

    // Intenta buscar por el DNI como NÚMERO
    const numericDNI = parseInt(testDNI, 10);
    const numericQuerySnapshot = await firestore.collection('participantes').where('dni', '==', numericDNI).get();

    if (!numericQuerySnapshot.empty) {
      console.log("\n¡Éxito! Se encontró un participante con el DNI como NÚMERO.");
      numericQuerySnapshot.forEach(doc => {
        console.log("-------------------------------------------");
        console.log(`ID del Documento: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
        console.log("-------------------------------------------\n");
      });
      console.log("Conclusión: El DNI en 'pagosRegistrados' es un STRING, pero en 'participantes' es un NÚMERO.");
      console.log("Se necesita ajustar el script principal para manejar esta conversión.");
      return;
    }

    console.log("\nNo se encontró al participante con el DNI como NÚMERO.");
    console.log("-------------------------------------------");
    console.log("Conclusión Final: El participante con DNI '36035056' NO EXISTE en la colección 'participantes'.");
    console.log("Esto explica por qué el informe no puede asignar departamentos.");
    console.log("Por favor, verifica que los DNIs en 'pagosRegistrados' tengan una correspondencia en 'participantes'.");
    console.log("-------------------------------------------\n");


  } catch (error) {
    console.error("Ocurrió un error durante la búsqueda de depuración:", error);
  }
};

debugParticipantLookup();
