/*
Script para eliminar pagos con programa en minúsculas y recalcular los resúmenes de los participantes afectados.
*/

// Importamos las herramientas necesarias de Firebase Admin.
import { initializeAdminApp } from './src/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Función asíncrona principal que se ejecutará.
async function cleanupLowercasePayments() {
    try {
        console.log("Inicializando Firebase Admin...");
        // Conectamos con la base de datos usando las credenciales del proyecto.
        await initializeAdminApp();
        const db = getFirestore();
        console.log("Firebase Admin inicializado. Empezando la limpieza...");

        // 1. Buscamos todos los documentos en la colección 'pagosRegistrados' donde el campo 'programa' sea exactamente 'tecnoempleo' (en minúsculas).
        console.log("Buscando pagos con el programa en minúsculas 'tecnoempleo'...");
        const paymentsQuery = db.collection('pagosRegistrados').where('programa', '==', 'tecnoempleo');
        const paymentsSnapshot = await paymentsQuery.get();

        // Si no se encuentra ninguno, informamos y terminamos el script.
        if (paymentsSnapshot.empty) {
            console.log("No se encontraron pagos con 'tecnoempleo' en minúsculas. No hay nada que limpiar.");
            return;
        }

        const deletedCount = paymentsSnapshot.size;
        console.log(`Se encontraron ${deletedCount} pagos para eliminar.`);

        // 2. Guardamos los IDs de los participantes que se vieron afectados para poder recalcular sus datos más tarde.
        const affectedParticipantIds = new Set<string>();
        paymentsSnapshot.forEach(doc => {
            affectedParticipantIds.add(doc.data().participantId);
        });

        // 3. Preparamos una operación por lotes (batch) para eliminar todos los documentos encontrados de una sola vez.
        // Esto es mucho más eficiente que borrarlos uno por uno.
        console.log("Preparando la eliminación en lote...");
        const deleteBatch = db.batch();
        paymentsSnapshot.docs.forEach(doc => {
            deleteBatch.delete(doc.ref);
        });
        // Ejecutamos la eliminación.
        await deleteBatch.commit();
        console.log(`Se eliminaron exitosamente ${deletedCount} documentos de pagos.`);

        // 4. Ahora, recalculamos los resúmenes para cada participante afectado.
        console.log(`Recalculando resúmenes para ${affectedParticipantIds.size} participantes afectados...`);
        const participantIds = Array.from(affectedParticipantIds);
        
        // Firestore permite un máximo de 500 operaciones en un solo lote (batch).
        // Dividimos a los participantes en grupos (chunks) de 499 para no superar el límite.
        const chunks: string[][] = [];
        for (let i = 0; i < participantIds.length; i += 499) {
            chunks.push(participantIds.slice(i, i + 499));
        }

        for (const chunk of chunks) {
            const updateBatch = db.batch();
            for (const participantId of chunk) {
                // Para cada participante, volvemos a consultar todos los pagos que le QUEDAN en la base de datos.
                const remainingPaymentsSnapshot = await db.collection('pagosRegistrados')
                    .where('participantId', '==', participantId)
                    .get();

                // Creamos un nuevo mapa de resumen 'pagosPorPrograma' desde cero.
                const newPagosPorPrograma = remainingPaymentsSnapshot.docs.reduce((acc: { [key: string]: number }, doc) => {
                    const payment = doc.data();
                    const programa = payment.programa || 'General'; // Usamos 'General' si el programa no está definido
                    acc[programa] = (acc[programa] || 0) + 1;
                    return acc;
                }, {});

                // Añadimos la actualización de este participante al lote de actualizaciones.
                const participantRef = db.collection('participants').doc(participantId);
                updateBatch.update(participantRef, { pagosPorPrograma: newPagosPorPrograma });
            }
            // Ejecutamos las actualizaciones para el lote actual.
            await updateBatch.commit();
        }

        console.log(`Se actualizaron exitosamente los resúmenes para ${participantIds.length} participantes.`);
        console.log("Limpieza completada con éxito.");

    } catch (error) {
        // Si algo sale mal, mostramos el error en la consola.
        console.error("Error durante el script de limpieza:", error);
    }
}

// Llamamos a la función principal para que se ejecute.
cleanupLowercasePayments();
