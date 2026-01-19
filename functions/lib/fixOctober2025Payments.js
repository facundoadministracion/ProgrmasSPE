'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixOctober2025Payments = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const REGION = 'southamerica-east1';
const FIX_FLAG_ID = 'dataFixOctober2025Applied';
/**
 * Cloud Function para corregir el estado de pagos del lote de Octubre 2025.
 * Esta función es idempotente. Se puede ejecutar múltiples veces pero solo
 * aplicará la corrección una sola vez.
 */
exports.fixOctober2025Payments = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    var _a, _b;
    // --- Verificación de permisos ---
    if (!context.auth || !context.auth.token.role || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'El usuario debe ser un administrador para ejecutar esta función.');
    }
    const log = (message) => {
        console.log(`[fixOctober2025Payments] ${message}`);
    };
    try {
        log('Iniciando ejecución.');
        // 1. Comprobar si la corrección ya fue aplicada (Idempotencia)
        const flagDocRef = firebaseAdmin_1.db.collection('appInternalState').doc(FIX_FLAG_ID);
        const flagDoc = await flagDocRef.get();
        if (flagDoc.exists) {
            log('La corrección ya ha sido aplicada anteriormente. No se realizarán cambios.');
            return {
                status: 'already_applied',
                message: 'La corrección ya ha sido aplicada anteriormente. No se necesita ninguna acción.'
            };
        }
        // --- DATOS CLAVE DE LA CORRECCIÓN ---
        const batchId = "mSGDvy9y7BkGarX4bSiN"; // ID del lote de pago de Septiembre
        const programa = "Tecnoempleo";
        const mes = "10";
        const anio = "2025";
        const paymentMonthStr = "Octubre/2025";
        const correctPaymentCount = 5;
        log(`Obteniendo DNIs del lote de pago: ${batchId}`);
        // 2. Obtener los DNI del lote de pago original
        const batchDocRef = firebaseAdmin_1.db.collection('paymentHistory').doc(batchId);
        const batchDocSnap = await batchDocRef.get();
        if (!batchDocSnap.exists) {
            throw new functions.https.HttpsError('not-found', `El lote de pago con ID ${batchId} no fue encontrado.`);
        }
        const dnisToProcess = (_a = batchDocSnap.data()) === null || _a === void 0 ? void 0 : _a.dnisProcesados;
        if (!dnisToProcess || dnisToProcess.length === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'El lote de pago no contiene DNIs para procesar.');
        }
        log(`Se procesarán ${dnisToProcess.length} DNIs.`);
        // 3. Procesar los participantes en lotes de Firestore
        const participantsCollection = firebaseAdmin_1.db.collection('participants');
        const paymentsCollection = firebaseAdmin_1.db.collection('pagosRegistrados');
        let processedCount = 0;
        // El procesamiento puede tardar, así que lo hacemos en chunks
        const chunks = [];
        for (let i = 0; i < dnisToProcess.length; i += 450) {
            chunks.push(dnisToProcess.slice(i, i + 450));
        }
        for (const chunk of chunks) {
            const batch = firebaseAdmin_1.db.batch();
            for (const dni of chunk) {
                const participantQuery = participantsCollection.where('dni', '==', dni);
                const participantSnapshot = await participantQuery.get();
                if (participantSnapshot.empty) {
                    log(`DNI ${dni}: No encontrado en la colección de participantes. Omitiendo.`);
                    continue;
                }
                const participantDoc = participantSnapshot.docs[0];
                const participantId = participantDoc.id;
                const participantRef = participantDoc.ref;
                // A. Crear el nuevo registro de pago
                const paymentRecordId = `${participantId}_${anio}-${mes}`;
                const paymentRecordRef = paymentsCollection.doc(paymentRecordId);
                const newPaymentRecord = {
                    participantId: participantId,
                    programa: programa,
                    mes: mes,
                    anio: anio,
                    paymentBatchId: batchId, // Se referencia el lote original
                    fechaLiquidacion: firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(`${anio}-${mes}-28`))
                };
                batch.set(paymentRecordRef, newPaymentRecord);
                // B. Actualizar el contador del participante
                const counterField = `pagosPorPrograma.${programa}`;
                const updateData = {
                    [counterField]: correctPaymentCount,
                    ultimoPago: paymentMonthStr,
                };
                batch.update(participantRef, updateData);
                processedCount++;
            }
            await batch.commit();
            log(`Lote de ${chunk.length} DNIs procesado. Total: ${processedCount}`);
        }
        // 4. Marcar la corrección como completada para evitar futuras ejecuciones
        await flagDocRef.set({
            completed: true,
            completedAt: firebaseAdmin_1.admin.firestore.Timestamp.now(),
            triggeredBy: ((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'unknown',
            processedCount: processedCount
        });
        log('¡Corrección completada exitosamente!');
        return {
            status: 'success',
            message: `¡Corrección completada! Se procesaron ${processedCount} participantes.`,
            processedCount: processedCount
        };
    }
    catch (error) {
        const e = error;
        console.error('Error grave durante la ejecución de la función:', e);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        else {
            throw new functions.https.HttpsError('internal', e.message, e);
        }
    }
});
//# sourceMappingURL=fixOctober2025Payments.js.map