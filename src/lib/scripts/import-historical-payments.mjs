import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Helper to find the service account key
function findServiceAccount() {
    const commonPaths = [
        './service-account.json',
        '../service-account.json',
        '../../service-account.json',
    ];
    for (const path of commonPaths) {
        if (fs.existsSync(path)) {
            console.log(`Found service account at: ${resolve(path)}`);
            return resolve(path);
        }
    }
    return null;
}

// Initialize Firebase Admin SDK
try {
    const serviceAccountPath = findServiceAccount();
    if (!serviceAccountPath) {
        throw new Error('Could not find service-account.json in common paths.');
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    process.exit(1);
}

const db = getFirestore();

async function importHistoricalPayments(filePath) {
    const absolutePath = resolve(filePath);
    console.log(`Starting to process file: ${absolutePath}`);

    const paymentsToCreate = [];
    const existingPaymentKeys = new Set();
    const processedDnis = new Map(); // Cache for participant lookups
    let totalRows = 0;
    let skippedDuplicates = 0;
    let skippedNotFound = 0;

    // First, fetch all existing payments to check for duplicates locally
    const paymentsSnapshot = await db.collection('pagos').get();
    paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.participanteId}-${data.mes}-${data.anio}`;
        existingPaymentKeys.add(key);
    });

    fs.createReadStream(absolutePath)
        .pipe(csv({ separator: ',' }))
        .on('data', (row) => {
            totalRows++;
            const { dni, programa, mes, anio } = row;

            if (!dni || !programa || !mes || !anio) {
                console.warn(`Skipping incomplete row: ${JSON.stringify(row)}`);
                return;
            }

            const paymentKey = `${dni}-${mes}-${anio}`;
            if (existingPaymentKeys.has(paymentKey)) {
                skippedDuplicates++;
                return;
            }

            paymentsToCreate.push({ ...row, originalDni: dni, paymentKey });
        })
        .on('end', async () => {
            console.log('CSV file successfully processed. Starting database operations.');

            const finalBatch = db.batch();
            const createdPayments = new Set();

            for (const payment of paymentsToCreate) {
                const { originalDni, programa, mes, anio, paymentKey } = payment;

                if (createdPayments.has(paymentKey)) {
                    continue; // Skip if already added to this batch
                }

                let participante = processedDnis.get(originalDni);

                if (participante === undefined) { // Not in cache, query Firestore
                    // Robust query: check DNI as both string and number
                    const stringQuery = db.collection('participantes').where('dni', '==', originalDni);
                    const numQuery = db.collection('participantes').where('dni', '==', Number(originalDni));

                    const [stringSnapshot, numSnapshot] = await Promise.all([stringQuery.get(), numQuery.get()]);
                    
                    let foundDoc = null;
                    if (!stringSnapshot.empty) {
                        foundDoc = stringSnapshot.docs[0];
                    } else if (!numSnapshot.empty) {
                        foundDoc = numSnapshot.docs[0];
                    }

                    if (foundDoc) {
                        participante = { id: foundDoc.id, ...foundDoc.data() };
                        processedDnis.set(originalDni, participante);
                    } else {
                        participante = null; // Mark as not found
                        processedDnis.set(originalDni, null);
                    }
                }

                if (participante) {
                    const newPaymentRef = db.collection('pagos').doc();
                    finalBatch.set(newPaymentRef, {
                        participanteId: participante.id,
                        programa,
                        mes: Number(mes),
                        anio: Number(anio),
                        fechaDeCarga: Timestamp.now(),
                        estado: 'histórico'
                    });
                    createdPayments.add(paymentKey);
                } else {
                    console.log(`Participant with DNI ${originalDni} not found. Skipping row.`);
                    skippedNotFound++;
                }
            }

            try {
                await finalBatch.commit();
                console.log('--- Import Summary ---');
                console.log(`Total rows processed: ${totalRows}`);
                console.log(`New payments created: ${createdPayments.size}`);
                console.log(`Skipped duplicate payments: ${skippedDuplicates}`);
                console.log(`Skipped rows (participant not found): ${skippedNotFound}`);
                console.log('----------------------');
            } catch (error) {
                console.error('Error committing batch:', error);
            }
        });
}


const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide the path to the CSV file as an argument.');
    process.exit(1);
}

importHistoricalPayments(filePath);