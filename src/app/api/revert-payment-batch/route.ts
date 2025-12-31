
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// NOTE: Esta es la nueva versión compatible con PaymentUploadWizard.

export async function POST(request: Request) {
    const { historyId } = await request.json();
    if (!historyId) {
        return NextResponse.json({ success: false, message: 'El ID del historial es obligatorio.' }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();

    try {
        const result = await db.runTransaction(async (transaction) => {
            // 1. OBTENER Y VALIDAR EL DOCUMENTO DE HISTORIAL
            const historyRef = db.collection('paymentHistory').doc(historyId);
            const historyDoc = await transaction.get(historyRef);

            if (!historyDoc.exists) {
                return { success: false, status: 404, message: 'No se encontró el registro de historial de carga.' };
            }

            const historyData = historyDoc.data()!;
            const { 
                programa, 
                mesLiquidacion, 
                anoLiquidacion, 
                dnisProcesados = [], 
                cantidadAusentes = 0 
            } = historyData;

            // 2. ELIMINAR LOS REGISTROS DE PAGO INDIVIDUALES
            const paymentsQuery = db.collection('pagosRegistrados')
                .where('programa', '==', programa)
                .where('mes', '==', mesLiquidacion)
                .where('anio', '==', anoLiquidacion);
            
            const paymentsSnapshot = await transaction.get(paymentsQuery);
            if (!paymentsSnapshot.empty) {
                paymentsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
            }
            
            // 3. REVERTIR EL ESTADO DE LOS PARTICIPANTES PAGADOS
            // Para cada DNI en el lote, decrementamos su contador de pagos.
            // No podemos saber con certeza su estado anterior, así que lo dejamos como está pero quitamos el pago.
            if (dnisProcesados.length > 0) {
                for (const dni of dnisProcesados) {
                    const partQuery = db.collection('participants').where('dni', '==', dni).limit(1);
                    const partSnapshot = await transaction.get(partQuery);
                    if (!partSnapshot.empty) {
                        const participantRef = partSnapshot.docs[0].ref;
                        // Decrementa el contador de pagos del programa específico.
                        transaction.update(participantRef, { 
                            [`pagosPorPrograma.${programa}`]: FieldValue.increment(-1),
                            // Opcional: Revertir 'ultimoPago' si es este el que se está borrando.
                            // Esta lógica puede ser compleja si se cargan lotes fuera de orden.
                            // Por ahora, solo decrementamos el contador, que es lo más seguro.
                        });
                    }
                }
            }

            // 4. REVERTIR EL ESTADO DE LOS PARTICIPANTES MARCADOS COMO AUSENTES
            // Buscamos las novedades de POSIBLE_BAJA y revertimos el estado del participante.
            if (cantidadAusentes > 0) {
                const novedadesQuery = db.collection('novedades')
                    .where('type', '==', 'POSIBLE_BAJA')
                    .where('programa', '==', programa)
                    .where('mesEvento', '==', mesLiquidacion)
                    .where('anoEvento', '==', anoLiquidacion);

                const novedadesSnapshot = await transaction.get(novedadesQuery);
                for (const doc of novedadesSnapshot.docs) {
                    const novedadData = doc.data();
                    const participantId = novedadData.participantId;
                    if (participantId) {
                        const participantRef = db.collection('participants').doc(participantId);
                        // Lo volvemos a marcar como Activo y limpiamos el mes de ausencia.
                        transaction.update(participantRef, { 
                            estado: 'Activo',
                            mesAusencia: FieldValue.delete()
                        });
                    }
                    // Borramos la novedad de "posible baja".
                    transaction.delete(doc.ref);
                }
            }

            // 5. FINALMENTE, ELIMINAR EL DOCUMENTO DE HISTORIAL
            transaction.delete(historyRef);

            return { success: true, status: 200, message: `Reversión completada. Se eliminaron ${paymentsSnapshot.size} pagos y se revirtieron ${cantidadAusentes} ausentes.` };
        });

        return NextResponse.json(result, { status: result.status });

    } catch (error: any) {
        console.error('Error al revertir el lote de pagos:', error);
        return NextResponse.json({ success: false, message: `Error interno del servidor: ${error.message}` }, { status: 500 });
    }
}
