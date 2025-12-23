
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
    // Devuelve el número con dos dígitos, ej: "01", "10"
    const monthNum = months[monthName.toLowerCase().trim()];
    return monthNum ? monthNum.padStart(2, '0') : '0';
};

export async function POST(request: Request) {
  try {
    const { programa, mes: mesNombre, anio } = await request.json();

    if (!programa || !mesNombre || !anio) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (programa, mes, anio).' }, { status: 400 });
    }

    const mesStr = getMonthNumber(mesNombre);
    const anioStr = anio.toString();

    if (mesStr === '0') {
      return NextResponse.json({ error: 'Nombre de mes inválido.', details: `El mes recibido '${mesNombre}' no es válido.` }, { status: 400 });
    }
    
    const mesNumero = parseInt(mesStr.replace(/^0+/, ''), 10);
    const anioNumero = parseInt(anioStr, 10);

    let revertedPayments = 0;
    let revertedHistory = 0;
    let revertedNovedades = 0;

    await db.runTransaction(async (transaction) => {
        // --- 1. BORRAR PAGOS de 'pagosRegistrados' ---
        const paymentsQuery = db.collection('pagosRegistrados')
            .where('programa', '==', programa)
            .where('mes', '==', mesNumero)
            .where('anio', '==', anioNumero);
        const paymentsSnapshot = await transaction.get(paymentsQuery);
        revertedPayments = paymentsSnapshot.size;
        paymentsSnapshot.forEach(doc => transaction.delete(doc.ref));

        // --- 2. BORRAR NOVEDADES ASOCIADAS (CORREGIDO) ---
        // Usamos 'anoEvento' y 'mesEvento' que son strings, como descubrimos.
        const novedadesQuery = db.collection('novedades')
            .where('programa', '==', programa)
            .where('anoEvento', '==', anioStr)
            .where('mesEvento', '==', String(mesNumero)); // Aseguramos que sea string
        const novedadesSnapshot = await transaction.get(novedadesQuery);
        revertedNovedades = novedadesSnapshot.size;
        novedadesSnapshot.forEach(doc => transaction.delete(doc.ref));
        
        // --- 3. BORRAR HISTORIAL DE CARGA (CORREGIDO) ---
        // Buscamos el documento por sus campos en lugar de adivinar el ID.
        const historyQuery = db.collection('paymentHistory')
            .where('programa', '==', programa)
            .where('anoLiquidacion', '==', anioStr)
            .where('mesLiquidacion', '==', String(mesNumero)); // mesLiquidacion también es string
        const historySnapshot = await transaction.get(historyQuery);
        revertedHistory = historySnapshot.size;
        historySnapshot.forEach(doc => transaction.delete(doc.ref));
    });

    return NextResponse.json({
      message: 'Reversión completada exitosamente.',
      revertedPayments,
      revertedHistory,
      revertedNovedades,
    });

  } catch (error) {
    console.error('Error CRÍTICO en la función de reversión de lote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido en el servidor.';
    return NextResponse.json(
        { 
            error: 'Error interno del servidor', 
            details: errorMessage 
        }, 
        { status: 500 }
    );
  }
}
