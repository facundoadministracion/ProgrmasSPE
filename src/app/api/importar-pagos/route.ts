
import { NextResponse } from 'next/server';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/firebase-admin';
import { PROGRAMAS } from '@/lib/constants';

// --- Helper Functions ---

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function parseCSV(csvString: string): Record<string, string>[] {
    const lines = csvString.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(';').map((h, i) => {
        const header = h.trim();
        // Remove BOM from the first header
        return i === 0 ? header.replace(/^\uFEFF/, '') : header;
    });
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(';').map(v => v.trim());
        if (values.length === headers.length) {
            const record = headers.reduce((obj, header, index) => {
                obj[header.toLowerCase()] = values[index];
                return obj;
            }, {} as Record<string, string>);
            records.push(record);
        }
    }
    return records;
}

const OFFICIAL_PROGRAM_NAMES = Object.values(PROGRAMAS);
function getOfficialProgramName(name: string): string {
    const lowerCaseName = name.toLowerCase();
    const officialName = OFFICIAL_PROGRAM_NAMES.find(p => p.toLowerCase() === lowerCaseName);
    return officialName || name;
}

// --- Main POST Handler ---

export async function POST(request: Request) {
    const { db } = getFirebaseAdmin();

    try {
        const transactionResult = await db.runTransaction(async (transaction) => {
            // 1. Get and validate file from request
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            if (!file || file.type !== 'text/csv') {
                return { success: false, status: 400, message: 'Archivo no válido. Debe ser CSV.' };
            }

            const fileContent = await file.text();
            const records = parseCSV(fileContent);

            // 2. Atomic Batch Validation
            const requiredHeaders = ['dni', 'programa', 'mes', 'anio', 'monto'];
            if (records.length === 0 || !requiredHeaders.every(h => Object.keys(records[0]).includes(h))) {
                return { success: false, status: 400, message: `El CSV debe contener las columnas: ${requiredHeaders.join(', ')}.` };
            }
            
            const firstRecord = records[0];
            const officialProgramName = getOfficialProgramName(firstRecord.programa);
            const settlementMonth = firstRecord.mes.toString().padStart(2, '0');
            const settlementYear = firstRecord.anio;

            if (!(OFFICIAL_PROGRAM_NAMES as string[]).includes(officialProgramName)) {
                return { success: false, status: 400, message: `El programa '${firstRecord.programa}' no es un programa válido.` };
            }

            for (let i = 1; i < records.length; i++) {
                const record = records[i];
                if (getOfficialProgramName(record.programa) !== officialProgramName || 
                    record.mes.toString().padStart(2, '0') !== settlementMonth || 
                    record.anio !== settlementYear) {
                    return { success: false, status: 400, message: `El archivo CSV debe contener registros para un único programa, mes y año. Inconsistencia en la línea ${i + 2}.` };
                }
            }

            // 3. DNI Validation (All or Nothing)
            const dnisInCsv = [...new Set(records.map(r => r.dni).filter(Boolean))];
            const participantRefsMap = new Map<string, FirebaseFirestore.DocumentReference>();
            const participantDocsMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();

            for (const chunk of chunkArray(dnisInCsv, 30)) {
                const q = db.collection('participants').where('dni', 'in', chunk);
                const snapshot = await transaction.get(q);
                snapshot.forEach(doc => {
                    participantDocsMap.set(doc.data().dni, doc);
                    participantRefsMap.set(doc.data().dni, doc.ref);
                });
            }

            if (participantRefsMap.size !== dnisInCsv.length) {
                const foundDnis = new Set(participantRefsMap.keys());
                const unknownDnis = dnisInCsv.filter(dni => !foundDnis.has(dni));
                return { success: false, status: 400, message: 'DNI no encontrados en la base de datos de participantes.', details: { desconocidos: unknownDnis } };
            }
            
            // 4. Check for existing payment batch
            const newPaymentBatchId = `${officialProgramName}-${settlementYear}-${settlementMonth}`;
            const newPaymentBatchRef = db.collection('paymentHistory').doc(newPaymentBatchId);
            const newPaymentBatchDoc = await transaction.get(newPaymentBatchRef);

            if (newPaymentBatchDoc.exists) {
                return { success: false, status: 409, message: `Ya existe una liquidación para ${officialProgramName} en ${settlementMonth}/${settlementYear}. Primero debe revertir el lote anterior.` };
            }

            // 5. Find Previous Payment Batch
            const historyQuery = db.collection('paymentHistory')
                .where('programa', '==', officialProgramName)
                .orderBy('anoLiquidacion', 'desc')
                .orderBy('mesLiquidacion', 'desc')
                .limit(1);
                
            const previousHistorySnapshot = await transaction.get(historyQuery);
            const previousDniSet = new Set<string>(previousHistorySnapshot.empty ? [] : previousHistorySnapshot.docs[0].data().dnis);

            // 6. Calculate Deltas
            const newDniSet = new Set(dnisInCsv);
            const altasDnis = [...newDniSet].filter(dni => !previousDniSet.has(dni));
            const bajasDnis = [...previousDniSet].filter(dni => !newDniSet.has(dni));

            // 7. Execute DB Updates

            //  7a. Update Bajas (participants who left)
            for (const dni of bajasDnis) {
                const q = db.collection('participants').where('dni', '==', dni).limit(1);
                const snapshot = await transaction.get(q);
                if (!snapshot.empty) {
                    const participantRef = snapshot.docs[0].ref;
                    transaction.update(participantRef, {
                        estado: 'Requiere Atención',
                        motivoBaja: `Posible baja: No incluido en liquidación ${settlementMonth}/${settlementYear}`,
                        fechaBaja: FieldValue.delete(),
                    });
                }
            }
            
            // Recalculate payments for a participant
            const recalculateAndUpdatePayments = async (dni: string, program: string, participantRef: FirebaseFirestore.DocumentReference) => {
                const paymentsSnapshot = await db.collection('pagosRegistrados')
                    .where('dni', '==', dni)
                    .where('programa', '==', program)
                    .get();

                const paymentCount = paymentsSnapshot.size;

                transaction.update(participantRef, {
                    [`pagosPorPrograma.${program}`]: paymentCount,
                    estado: 'Activo',
                    activo: true,
                    motivoBaja: FieldValue.delete(),
                    fechaBaja: FieldValue.delete(),
                });
            };


            // 7b. Update Altas, Activos & create new payments
            let totalAmount = 0;
            for (const record of records) {
                const { dni, monto } = record;
                const participantRef = participantRefsMap.get(dni)!;
                const parsedMonto = parseFloat(monto.replace(/[^0-9,-]+/g, '').replace(',', '.'));
                if (!isNaN(parsedMonto)) totalAmount += parsedMonto;

                const newPaymentRef = db.collection('pagosRegistrados').doc();
                transaction.create(newPaymentRef, {
                    participantId: participantRef.id,
                    dni,
                    programa: officialProgramName,
                    mes: settlementMonth,
                    anio: settlementYear,
                    monto: parsedMonto,
                    fechaDeCarga: Timestamp.now(),
                    batchId: newPaymentBatchId,
                });
                
                await recalculateAndUpdatePayments(dni, officialProgramName, participantRef);

            }

            // 7c. Create new paymentHistory document
            transaction.create(newPaymentBatchRef, {
                programa: officialProgramName,
                mesLiquidacion: settlementMonth,
                anoLiquidacion: settlementYear,
                dnis: dnisInCsv,
                cantidadPagos: dnisInCsv.length,
                montoTotalLiquidado: totalAmount,
                fechaDeCarga: Timestamp.now(),
                altas: altasDnis,
                bajas: bajasDnis,
            });

            return { 
                success: true, 
                status: 200, 
                message: 'Importación completada con éxito.', 
                details: { 
                    procesados: dnisInCsv.length, 
                    altas: altasDnis.length, 
                    bajas: bajasDnis.length 
                } 
            };
        });

        // Handle the result of the transaction
        return NextResponse.json(transactionResult, { status: transactionResult.status });

    } catch (error: any) {
        console.error('Error en la importación de pagos:', error);
        return NextResponse.json({ success: false, message: 'Error interno del servidor.', details: error.message || error.stack }, { status: 500 });
    }
}
