import admin from "firebase-admin";
import fs from "fs";

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error.message);
      process.exit(1);
    }
  }
  return admin.firestore();
}

const db = initializeFirebaseAdmin();

async function diagnoseData() {
  try {
    console.log("\n--- Diagnosing 'paymentHistory' Collection ---");
    const historySnapshot = await db.collection("paymentHistory").get();
    if (historySnapshot.empty) {
        console.log("Collection is empty.");
    } else {
        console.log(`Found ${historySnapshot.size} documents:\n`);
        historySnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ID: ${doc.id}`);
            console.log(`    - Programa: '${data.programa}'`);
            console.log(`    - Año: ${data.anoLiquidacion}`);
            console.log(`    - Mes: ${data.mesLiquidacion}`);
            console.log("    -----------------");
        });
    }

    console.log("\n--- Diagnosing 'novedades' Collection ---");
    const novedadesSnapshot = await db.collection("novedades").get();
    if (novedadesSnapshot.empty) {
        console.log("Collection is empty.");
    } else {
        console.log(`Found ${novedadesSnapshot.size} documents. Showing relevant fields:\n`);
        novedadesSnapshot.forEach(doc => {
            const data = doc.data();
            // Only print if it has the relevant fields for our issue
            if (data.programa && data.mes && data.anio) {
                console.log(`  - ID: ${doc.id}`);
                console.log(`    - Programa: '${data.programa}'`);
                console.log(`    - Año: ${data.anio}`);
                console.log(`    - Mes: ${data.mes}`);
                console.log(`    - Type: ${data.type}`);
                console.log("    -----------------");
            }
        });
    }
    console.log("\nDiagnosis complete.");

  } catch (error) {
    console.error("\nAn Error Occurred during diagnosis:", error);
    process.exit(1);
  }
}

diagnoseData();