import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { db } from "./firebaseAdmin";

// Initialize admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp();
}


// Constantes para mayor claridad
const PROGRAM_NAME = "Tecnoempleo";
const TARGET_PAYMENT_COUNT = 4;
const FIX_PAYMENT_MONTH = "Octubre 2025";
const NEW_PAYMENT_COUNT = 5;

/**
 * Custom logger for this function.
 */
const log = {
    info: (message: string, extra?: unknown) => {
        logger.info(`[fixOctober2025Payments] ${message}`, extra);
    },
    error: (message: string, error: unknown) => {
        logger.error(`[fixOctober2025Payments] ${message}`, error);
    },
};

/**
 * Busca participantes del programa Tecnoempleo que tengan exactamente 4 pagos.
 */
async function findAffectedParticipants(db: admin.firestore.Firestore) {
    log.info("Iniciando la búsqueda de participantes afectados.");
    const querySnapshot = await db
        .collection("participants")
        .where("program.name", "==", PROGRAM_NAME)
        .where("payment.count", "==", TARGET_PAYMENT_COUNT)
        .get();
    
    log.info(`Se encontraron ${querySnapshot.size} participantes para procesar.`);
    return querySnapshot.docs;
}

/**
 * Crea el registro de pago faltante para un participante.
 */
function createMissingPaymentEntry(
    transaction: admin.firestore.Transaction,
    participantRef: admin.firestore.DocumentReference
) {
    const paymentCollectionRef = participantRef.collection("payments");
    const newPaymentRef = paymentCollectionRef.doc(); // Firestore generará un ID único
    
    transaction.set(newPaymentRef, {
        id: newPaymentRef.id,
        participantId: participantRef.id,
        month: FIX_PAYMENT_MONTH,
        status: "pending", // El estado inicial es pendiente
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log.info(`Registro de pago creado para el mes ${FIX_PAYMENT_MONTH} para el participante ${participantRef.id}.`);
}

/**
 * Actualiza el contador de pagos del participante a 5.
 */
function updateParticipantPaymentCount(
    transaction: admin.firestore.Transaction,
    participantRef: admin.firestore.DocumentReference
) {
    transaction.update(participantRef, { "payment.count": NEW_PAYMENT_COUNT });
    log.info(`Contador de pagos actualizado a ${NEW_PAYMENT_COUNT} para el participante ${participantRef.id}.`);
}

/**
 * Contiene la lógica principal de la corrección.
 * Utiliza una transacción de Firestore para garantizar la atomicidad de las operaciones.
 */
async function runFixLogic(db: admin.firestore.Firestore): Promise<string> {
    const affectedDocs = await findAffectedParticipants(db);

    if (affectedDocs.length === 0) {
        log.info("No se encontraron participantes que requieran la corrección.");
        return "La corrección ya fue aplicada o no hay participantes que la necesiten.";
    }

    // Procesaremos los documentos en lotes para no exceder los límites de transacción
    const batchSize = 400; // El límite de Firestore es 500 escrituras por transacción
    let processedCount = 0;

    for (let i = 0; i < affectedDocs.length; i += batchSize) {
        const batchDocs = affectedDocs.slice(i, i + batchSize);
        
        await db.runTransaction(async (transaction) => {
            batchDocs.forEach(doc => {
                const participantRef = doc.ref;
                log.info(`Procesando participante con ID: ${doc.id}`);
                
                // 1. Crear el registro de pago de Octubre 2025
                createMissingPaymentEntry(transaction, participantRef);
                
                // 2. Actualizar el contador de pagos a 5
                updateParticipantPaymentCount(transaction, participantRef);
            });
        });
        
        processedCount += batchDocs.length;
        log.info(`Lote de ${batchDocs.length} participantes procesado.`);
    }

    return `¡Éxito! Se han corregido ${processedCount} registros de participantes.`;
}


// --- LA CLOUD FUNCTION EXPUESTA ---
export const fixOctober2025Payments = onCall({ region: "southamerica-east1" }, async (request) => {
    // Verificación de autenticación (opcional pero recomendado)
    // if (!request.auth) {
    //     throw new HttpsError("unauthenticated", "El usuario no está autenticado.");
    // }
    
    log.info("Ejecución iniciada.");
    
    try {
        const message = await runFixLogic(db);
        log.info("Ejecución completada con éxito.");
        return { status: "success", message };
    } catch (error) {
        log.error("Ocurrió un error durante la ejecución:", error);
        throw new HttpsError("internal", "Ocurrió un error en el servidor al procesar la solicitud.");
    }
});