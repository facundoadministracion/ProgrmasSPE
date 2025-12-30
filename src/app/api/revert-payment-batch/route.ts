
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// --- Endpoint POST para revertir un lote de pagos con lógica mejorada ---
export async function POST(request: Request) {
    try {
        const { batchId } = await request.json();
        if (!batchId) {
            return NextResponse.json({ message: 'El ID del lote es obligatorio.' }, { status: 400 });
        }

        const { firestore } = getFirebaseAdmin();
        const batch = firestore.batch();

        // 1. OBTENER DATOS DEL LOTE A REVERTIR
        const historyRef = firestore.collection('paymentHistory').doc(batchId);
        const historyDoc = await historyRef.get();

        if (!historyDoc.exists) {
            throw new Error('El lote de pago no fue encontrado.');
        }

        const { 
            mesLiquidacion, 
            anoLiquidacion, 
            programa, 
            dnisProcesados, 
            cantidadAusentes 
        } = historyDoc.data()!;

        // FASE 1: ELIMINAR REGISTROS DE PAGO
        // ------------------------------------

        // Eliminar el historial principal
        batch.delete(historyRef);

        // Query para borrar los pagos en la colección central 'pagosRegistrados'
        const paymentsQuery = firestore.collection('pagosRegistrados')
            .where('mes', '==', mesLiquidacion)
            .where('anio', '==', anoLiquidacion)
            .where('programa', '==', programa);
        
        const paymentsSnapshot = await paymentsQuery.get();
        paymentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // FASE 2: REVERTIR ESTADO DE PARTICIPANTES
        // ----------------------------------------

        // Revertir a los que SÍ pagaron en este lote
        if (dnisProcesados && dnisProcesados.length > 0) {
            for (const dni of dnisProcesados) {
                const participantQuery = firestore.collection('participants').where('dni', '==', dni);
                const participantSnapshot = await participantQuery.get();
                
                if (!participantSnapshot.empty) {
                    const participantDoc = participantSnapshot.docs[0];
                    const participantRef = participantDoc.ref;

                    // Para encontrar el nuevo "último pago", buscamos todos los pagos menos el que estamos borrando
                    const allPaymentsQuery = firestore.collection('pagosRegistrados')
                        .where('dni', '==', dni)
                        .orderBy('anio', 'desc')
                        .orderBy('mes', 'desc');

                    const allPaymentsSnapshot = await allPaymentsQuery.get();
                    
                    // Filtramos el pago que se está revirtiendo
                    const previousPayments = allPaymentsSnapshot.docs.filter(doc => {
                        const data = doc.data();
                        return !(data.mes === mesLiquidacion && data.anio === anoLiquidacion && data.programa === programa);
                    });

                    const newUltimoPago = previousPayments.length > 0 ? `${previousPayments[0].data().mes}/${previousPayments[0].data().anio}` : null;
                    
                    batch.update(participantRef, {
                        pagosAcumulados: FieldValue.increment(-1),
                        ultimoPago: newUltimoPago,
                        estado: 'Activo', // Se asume que vuelve a estar activo
                        mesAusencia: null
                    });
                }
            }
        }

        // Revertir a los que quedaron como AUSENTES en este lote
        if (cantidadAusentes > 0) {
            const ausentesQuery = firestore.collection('participants')
                .where('programa', '==', programa)
                .where('estado', '==', 'Requiere Atención')
                .where('mesAusencia', '==', `${require('@/lib/constants').MONTHS[parseInt(mesLiquidacion, 10) - 1]}/${anoLiquidacion}`);

            const ausentesSnapshot = await ausentesQuery.get();
            ausentesSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    estado: 'Activo',
                    mesAusencia: null
                });
            });
        }
        
        // FASE 3: ELIMINAR NOVEDADES DE POSIBLE BAJA
        // ------------------------------------------

        const novedadesQuery = firestore.collection('novedades')
            .where('type', '==', 'POSIBLE_BAJA')
            .where('mesEvento', '==', mesLiquidacion)
            .where('anoEvento', '==', anoLiquidacion)
            .where('programa', '==', programa);
            
        const novedadesSnapshot = await novedadesQuery.get();
        novedadesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // EJECUTAR EL BATCH
        await batch.commit();

        return NextResponse.json({ message: 'El lote de pago ha sido revertido con éxito, incluyendo estados de participantes y novedades.' });

    } catch (error: any) {
        console.error('[ERROR REVERT PAYMENT BATCH]', error);
        return NextResponse.json({ message: `Error en el servidor: ${error.message}` }, { status: 500 });
    }
}
