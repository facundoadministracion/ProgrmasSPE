import admin from 'firebase-admin';
import fs from 'fs';

// --- CONFIGURATION ---
// These are the details of the batch you want to delete.
const PROGRAMA_TO_DELETE = 'Tutorias';
const MES_TO_DELETE = 11; // 1 = Enero, 11 = Noviembre
const ANIO_TO_DELETE = 2025;
// --- END CONFIGURATION ---

console.log('--- Manual Batch Deletion Script ---');
console.log(`Target: Programa='${PROGRAMA_TO_DELETE}', Mes='${MES_TO_DELETE}', Anio='${ANIO_TO_DELETE}'`);

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error.message);
      console.error('Please ensure the serviceAccountKey.json file exists in the root directory and is valid.');
      process.exit(1); // Exit if we can\'t connect
    }
  }
  return admin.firestore();
}

const db = initializeFirebaseAdmin();

async function deleteOrphanedData() {
  try {
    const batch = db.batch();
    let historyDeleted = false;
    let novedadesDeletedCount = 0;

    // 1. Delete the entry from 'paymentHistory'
    // The ID is usually in the format 'Programa-Anio-Mes'
    const mesStr = MES_TO_DELETE.toString().padStart(2, '0');
    const historyDocId = `${PROGRAMA_TO_DELETE}-${ANIO_TO_DELETE}-${mesStr}`;
    const historyDocRef = db.collection('paymentHistory').doc(historyDocId);

    const historyDoc = await historyDocRef.get();
    if (historyDoc.exists) {
        batch.delete(historyDocRef);
        historyDeleted = true;
        console.log(`Found and targeted for deletion: paymentHistory document '${historyDocId}'.`);
    } else {
        console.log(`Skipped: paymentHistory document '${historyDocId}' does not exist.`);
    }

    // 2. Delete associated 'novedades'
    const novedadesQuery = db.collection('novedades')
      .where('programa', '==', PROGRAMA_TO_DELETE)
      .where('mes', '==', MES_TO_DELETE)
      .where('anio', '==', ANIO_TO_DELETE);
      
    const novedadesSnapshot = await novedadesQuery.get();
    
    if (novedadesSnapshot.empty) {
        console.log('No matching novedades found to delete.');
    } else {
        novedadesDeletedCount = novedadesSnapshot.size;
        console.log(`Found ${novedadesDeletedCount} novedades to delete...`);
        novedadesSnapshot.forEach(doc => {
            console.log(`  - Targeting novedad: ${doc.id}`);
            batch.delete(doc.ref);
        });
    }

    // Commit the batch deletion
    if (historyDeleted || novedadesDeletedCount > 0) {
        await batch.commit();
        console.log('\n--- Deletion Complete! ---');
        console.log(`Successfully deleted history entry: ${historyDeleted}`);
        console.log(`Successfully deleted novedades: ${novedadesDeletedCount}`);
    } else {
        console.log('\n--- No Actions Needed ---');
        console.log('No data was found to delete.');
    }

  } catch (error) {
    console.error('\n--- An Error Occurred! ---');
    console.error('Failed to delete orphaned data:', error);
    process.exit(1);
  }
}

// Run the deletion function
deleteOrphanedData();
