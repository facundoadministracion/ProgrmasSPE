import admin from 'firebase-admin';
import fs from 'fs';

// --- CONFIGURATION ---
const HISTORY_DOC_ID = '4E44dJ40R9NjNcAISyYU'; // The exact ID we found.

const NOVEDADES_QUERY = {
  programa: 'Tutorias',
  mes: 11,
  anio: 2025,
  type: 'POSIBLE_BAJA' // The crucial missing piece.
};
// --- END CONFIGURATION ---

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error.message);
      process.exit(1);
    }
  }
  return admin.firestore();
}

const db = initializeFirebaseAdmin();

async function finalDelete() {
  console.log('--- Final Orphan Deletion Script ---');
  try {
    const batch = db.batch();
    let historyDeleted = false;
    let novedadesDeletedCount = 0;

    // 1. Target the specific paymentHistory document by its full ID
    const historyDocRef = db.collection('paymentHistory').doc(HISTORY_DOC_ID);
    const historyDoc = await historyDocRef.get();

    if (historyDoc.exists) {
        batch.delete(historyDocRef);
        historyDeleted = true;
        console.log(`[SUCCESS] Targeted paymentHistory document for deletion: ${HISTORY_DOC_ID}`);
    } else {
        console.log(`[INFO] paymentHistory document already deleted: ${HISTORY_DOC_ID}`);
    }

    // 2. Find and delete the specific 'novedades'
    const novedadesQuery = db.collection('novedades')
      .where('programa', '==', NOVEDADES_QUERY.programa)
      .where('mes', '==', NOVEDADES_QUERY.mes)
      .where('anio', '==', NOVEDADES_QUERY.anio)
      .where('type', '==', NOVEDADES_QUERY.type);
      
    const novedadesSnapshot = await novedadesQuery.get();
    
    if (novedadesSnapshot.empty) {
        console.log('[INFO] No matching \'POSIBLE_BAJA\' novedades found to delete.');
    } else {
        novedadesDeletedCount = novedadesSnapshot.size;
        console.log(`[SUCCESS] Found ${novedadesDeletedCount} \'POSIBLE_BAJA\' novedad(es) to delete.`);
        novedadesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    // Commit the batch deletion
    if (historyDeleted || novedadesDeletedCount > 0) {
        await batch.commit();
        console.log('\n--- Deletion Complete! ---');
        console.log(`History entry deleted: ${historyDeleted}`);
        console.log(`Novedades deleted: ${novedadesDeletedCount}`);
        console.log('The orphan data should now be completely removed.');
    } else {
        console.log('\n--- No Actions Needed ---');
        console.log('All specified orphan data was already deleted.');
    }

  } catch (error) {
    console.error('\n--- An Error Occurred! ---', error);
    process.exit(1);
  }
}

finalDelete();
