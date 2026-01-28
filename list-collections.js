const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

const listCollections = async () => {
  try {
    console.log("--- Obteniendo lista de todas las colecciones en la base de datos ---");

    const collections = await firestore.listCollections();

    if (collections.length === 0) {
      console.log("No se encontró ninguna colección en este proyecto de Firebase.");
      return;
    }

    console.log("\nColecciones encontradas:");
    console.log("-------------------------");
    collections.forEach(collection => {
      console.log(`- ${collection.id}`);
    });
    console.log("-------------------------\n");
    console.log("Por favor, verifica si el nombre 'participantes' está en esta lista y si está escrito exactamente igual (mayúsculas/minúsculas).");

  } catch (error) {
    console.error("Ocurrió un error al intentar listar las colecciones:", error);
  }
};

listCollections();
