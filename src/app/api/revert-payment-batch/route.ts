
import { NextResponse } from 'next/server';
// Import the initialized db service directly
import { db } from '@/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// No need to initialize anything here, db is ready to be used.

// Function to convert month name to string number
const getMonthNumber = (monthName: string): string => {
    const months: { [key: string]: string } = {
        'enero': '1', 'febrero': '2', 'marzo': '3', 'abril': '4', 'mayo': '5', 'junio': '6',
        'julio': '7', 'agosto': '8', 'septiembre': '9', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    return months[monthName.toLowerCase()] || '0';
};


export async function POST(request: Request) {
  try {
    const { programa, mes: mesNombre, anio } = await request.json();

    if (!programa || !mesNombre || !anio) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (programa, mes, anio).' }, { status: 400 });
    }

    // We will use STRING data types as they are in Firestore
    const mes = getMonthNumber(mesNombre);
    const anioStr = anio.toString();
    const programaStr = programa.toString();
    
    // --- Start Transaction ---
    const batch = db.batch();

    // 1. Revert individual payments and update participants
    const paymentRecordsQuery = db.collection('paymentRecords')
      .where('programa', '==', programaStr)
      .where('mesLiquidacion', '==', mes) 
      .where('anoLiquidacion', '==', anioStr);
      
    const paymentRecordsSnapshot = await paymentRecordsQuery.get();
    
    paymentRecordsSnapshot.forEach(doc => {
      const payment = doc.data();
      const participantId = payment.participantId;

      // Mark payment record for deletion
      batch.delete(doc.ref);

      // Subtract payment from the participant
      if (participantId) {
        const participantRef = db.collection('participants').doc(participantId);
        const programPaymentField = `pagosPorPrograma.${programaStr}`;
        
        // Calculate previous month
        const currentMonth = parseInt(mes);
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? parseInt(anioStr) - 1 : parseInt(anioStr);

        batch.update(participantRef, {
            pagosAcumulados: FieldValue.increment(-1),
            [programPaymentField]: FieldValue.increment(-1),
            ultimoPago: `${prevMonth.toString()}/${prevYear.toString()}`, // Adjust this according to your logic
            updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    // 2. Delete the summary record from `paymentHistory`
    const paymentHistoryQuery = db.collection('paymentHistory')
      .where('programa', '==', programaStr)
      .where('mesLiquidacion', '==', mes)
      .where('anoLiquidacion', '==', anioStr);

    const paymentHistorySnapshot = await paymentHistoryQuery.get();
    
    paymentHistorySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Execute all operations in the transaction
    await batch.commit();

    return NextResponse.json({ 
        message: 'Reversión completada exitosamente.',
        revertedPayments: paymentRecordsSnapshot.size,
        revertedHistory: paymentHistorySnapshot.size,
    });

  } catch (error) {
    console.error('Error en la función de reversión de lote de pago:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido';
    return NextResponse.json({ error: 'Error interno del servidor', details: errorMessage }, { status: 500 });
  }
}
