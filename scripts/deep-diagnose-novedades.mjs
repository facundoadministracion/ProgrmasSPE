import admin from 'firebase-admin';
import fs from 'fs';

// --- CONFIGURATION ---
const TARGET_PROGRAMA = 'Tutorias';
const TARGET_ANIO = 2025;
// --- END CONFIGURATION ---

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

function logStringDetails(str) {
  const charCodes = Array.from(str).map(c => c.charCodeAt(0));
  return `Content: "${str}", Length: ${str.length}, CharCodes: [${charCodes.join(', ')}]`;
}

async function deepDiagnose() {
  console.log(`--- Deep Diagnosing 'novedades' for Programa: ${TARGET_PROGRAMA}, Año: ${TARGET_ANIO} ---`);
  try {
    const query = db.collection('novedades')
      .where('programa', '==', TARGET_PROGRAMA)
      .where('anio', '==', TARGET_ANIO);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('\n[RESULT] No 'novedades' documents found matching the criteria.');
      return;
    }

    console.log(`\n[RESULT] Found ${snapshot.size} document(s). Analyzing details:\n`);

    snapshot.forEach(doc => {
      console.log(`-------------------------------------------------`);
      console.log(`  DOCUMENT ID: ${doc.id}`);
      console.log(`-------------------------------------------------`);
      const data = doc.data();
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          console.log(`  - Field: '${key}'`);
          console.log(`    - Type: ${typeof value}`);
          if (typeof value === 'string') {
            console.log(`    - Details: ${logStringDetails(value)}`);
          } else {
            console.log(`    - Value: ${value}`);
          }
        }
      }
      console.log(`\n`);
    });

    console.log('--- Deep Diagnosis Complete ---');

  } catch (error) {
    console.error('\n--- An Error Occurred During Deep Diagnosis ---', error);
    process.exit(1);
  }
}

deepDiagnose();
