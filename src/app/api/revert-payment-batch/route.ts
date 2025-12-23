
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// --- FINAL INITIALIZATION LOGIC ---
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();
// --- END OF INITIALIZATION LOGIC ---

const getMonthNumber = (monthName: string): string => {
    const months: { [key: string]: string } = {
        'enero': '1', 'febrero': '2', 'marzo': '3', 'abril': '4', 'mayo': '5', 'junio': '6',
        'julio': '7', 'agosto': '8', 'septiembre': '9', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    // Devolvemos el número del mes como string, que es como se usa en las queries.
    return months[monthName.toLowerCase().trim()] || '0';
};

export async function POST(request: Request) {
  try {
    const { programa, mes: mesNombre, anio } = await request.json();

    if (!programa || !mesNombre || !anio) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (programa, mes, anio).' }, { status: 400 });
    }

    const mesNumeroStr = getMonthNumber(mesNombre);
    if (mesNumeroStr === '0') {
      return NextResponse.json({ error: 'Nombre de mes inválido.', details: `El mes recibido '${mesNombre}' no es válido.` }, { status: 400 });
    }

    // La clave definitiva: Todos los campos de fecha en Firestore son STRINGS.
    const anioStr = anio.toString();

    let revertedPayments = 0;
    let revertedHistory = 0;
    let revertedNovedades = 0;

    await db.runTransaction(async (transaction) => {
        // --- 1. LECTURAS ---
        // Replicamos la lógica 100% verificada del frontend y el script final.
        const paymentsQuery = db.collection('pagosRegistrados')
            .where('programa', '==', programa)
            .where('anio', '==', anioStr) // anio es STRING
            .where('mes', '==', mesNumeroStr);   // mes es STRING
        
        const novedadesQuery = db.collection('novedades')
            .where('programa', '==', programa)
            .where('anoEvento', '==', anioStr)
            .where('mesEvento', '==', mesNumeroStr);

        const historyQuery = db.collection('paymentHistory')
            .where('programa', '==', programa)
            .where('anoLiquidacion', '==', anioStr)
            .where('mesLiquidacion', '==', mesNumeroStr);

        // Ejecutar todas las lecturas primero
        const paymentsSnapshot = await transaction.get(paymentsQuery);
        const novedadesSnapshot = await transaction.get(novedadesQuery);
        const historySnapshot = await transaction.get(historyQuery);

        // --- 2. ESCRITURAS (Borrados) ---
        revertedPayments = paymentsSnapshot.size;
        paymentsSnapshot.forEach(doc => transaction.delete(doc.ref));

        revertedNovedades = novedadesSnapshot.size;
        novedadesSnapshot.forEach(doc => transaction.delete(doc.ref));

        revertedHistory = historySnapshot.size;
        historySnapshot.forEach(doc => transaction.delete(doc.ref));
    });

    return NextResponse.json({
      message: 'Reversión completada exitosamente.',
      details: {
        revertedPayments,
        revertedHistory,
        revertedNovedades,
      }
    });

  } catch (error) {
    console.error('Error CRÍTICO en la API de reversión de lote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json(
        { 
            error: 'Error interno del servidor.', 
            details: errorMessage
        }, 
        { status: 500 }
    );
  }
}
