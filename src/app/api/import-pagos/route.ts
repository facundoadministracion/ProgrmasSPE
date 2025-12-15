import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase-admin';

// Helper to split an array into chunks of a specific size
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Helper to parse the CSV content. IMPORTANT: It uses semicolon (;) as a delimiter.
function parseCSV(csvString: string): Record<string, string>[] {
    const lines = csvString.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // Use semicolon as delimiter and remove BOM from the first header
    const headers = lines[0].split(';').map((h, i) => {
        const header = h.trim();
        return i === 0 ? header.replace(/^\uFEFF/, '') : header;
    });

    const records = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(';').map(v => v.trim());
        if (values.length === headers.length) {
            const record = headers.reduce((obj, header, index) => {
                obj[header.toLowerCase()] = values[index]; // Standardize headers to lowercase
                return obj;
            }, {} as Record<string, string>);
            records.push(record);
        }
    }
    return records;
}

export async function POST(request: Request) {
  try {
    await initializeAdminApp();
    const db = getFirestore();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No se encontró el archivo.' }, { status: 400 });
    }
    
    if (file.type !== 'text/csv') {
        return NextResponse.json({ success: false, message: 'El archivo debe ser de tipo CSV.' }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parseCSV(fileContent);

    const requiredHeaders = ['dni', 'programa', 'mes', 'anio'];
    const csvHeaders = records.length > 0 ? Object.keys(records[0]) : [];

    if (!requiredHeaders.every(h => csvHeaders.includes(h))) {
        return NextResponse.json({ 
            success: false, 
            message: `El encabezado del CSV es incorrecto. Debe contener: ${requiredHeaders.join(', ')}.`,
        }, { status: 400 });
    }

    if (records.length === 0) {
        return NextResponse.json({ success: false, message: 'El archivo CSV está vacío o tiene un formato incorrecto.' }, { status: 400 });
    }
    
    // --- 1. Fetch all participants from CSV ---
    const dnisInCsv = [...new Set(records.map(r => r.dni).filter(Boolean))];
    const participantDocsMap = new Map<string, {id: string, ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData}>();

    const dniChunks = chunkArray(dnisInCsv, 30); // Firestore 'in' query limit is 30
    for (const chunk of dniChunks) {
        const snapshot = await db.collection('participants').where('dni', 'in', chunk).get();
        snapshot.forEach(doc => {
            participantDocsMap.set(doc.data().dni, { id: doc.id, ref: doc.ref, data: doc.data() });
        });
    }

    // --- 2. Fetch existing payments for these participants to avoid duplicates ---
    const participantIds = Array.from(participantDocsMap.values()).map(p => p.id);
    const existingPayments = new Set<string>();
    
    if (participantIds.length > 0) {
        const idChunks = chunkArray(participantIds, 30);
        for (const chunk of idChunks) {
            const paymentsSnapshot = await db.collection('pagosRegistrados').where('participantId', 'in', chunk).get();
            paymentsSnapshot.forEach(doc => {
                const { participantId, anio, mes } = doc.data();
                existingPayments.add(`${participantId}-${anio}-${mes.padStart(2, '0')}`);
            });
        }
    }
    
    // --- 3. Identify new payments to be created ---
    const processingErrors: string[] = [];
    const newPaymentDocs: any[] = [];
    const affectedParticipants = new Set<string>(); // Store IDs of participants with new payments

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const { dni, programa, mes, anio } = record;

        if (!dni || !programa || !mes || !anio) {
            processingErrors.push(`Línea ${i + 2}: Fila con datos incompletos.`);
            continue;
        }

        const participantData = participantDocsMap.get(dni);
        if (!participantData) {
            processingErrors.push(`Línea ${i + 2}: No se encontró participante con DNI ${dni}.`);
            continue;
        }

        const paymentKey = `${participantData.id}-${anio}-${mes.padStart(2, '0')}`;
        if (existingPayments.has(paymentKey)) {
            continue; // Skip existing payment
        }
        
        // Add to list for creation and mark as non-duplicate for this run
        existingPayments.add(paymentKey); 
        affectedParticipants.add(participantData.id);

        newPaymentDocs.push({
            participantId: participantData.id,
            dni,
            programa,
            mes: mes.padStart(2, '0'),
            anio,
            fechaDeCarga: Timestamp.now(),
        });
    }

    // --- 4. Batch-create new payment documents ---
    if (newPaymentDocs.length > 0) {
        const paymentChunks = chunkArray(newPaymentDocs, 499); // Firestore batch limit is 500
        for (const chunk of paymentChunks) {
            const batch = db.batch();
            chunk.forEach(docData => {
                const newDocRef = db.collection('pagosRegistrados').doc();
                batch.create(newDocRef, docData);
            });
            await batch.commit();
        }
    }
    
    // --- 5. Recalculate and batch-update participant payment summaries (`pagosPorPrograma`) ---
    if (affectedParticipants.size > 0) {
        const affectedParticipantIds = Array.from(affectedParticipants);
        const updateChunks = chunkArray(affectedParticipantIds, 499);
        
        for (const chunk of updateChunks) {
            const batch = db.batch();
            const paymentsSnapshot = await db.collection('pagosRegistrados')
                .where('participantId', 'in', chunk)
                .get();

            const paymentsByParticipant = new Map<string, any[]>();
            paymentsSnapshot.forEach(doc => {
                const payment = doc.data();
                if (!paymentsByParticipant.has(payment.participantId)) {
                    paymentsByParticipant.set(payment.participantId, []);
                }
                paymentsByParticipant.get(payment.participantId)!.push(payment);
            });
            
            for (const participantId of chunk) {
                const participantRef = db.collection('participants').doc(participantId);
                const allPayments = paymentsByParticipant.get(participantId) || [];
                
                const newPagosPorPrograma = allPayments.reduce((acc, payment) => {
                    acc[payment.programa] = (acc[payment.programa] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                batch.update(participantRef, { pagosPorPrograma: newPagosPorPrograma });
            }
            await batch.commit();
        }
    }
    
    const successMessage = `Importación finalizada. Se crearon ${newPaymentDocs.length} nuevos registros de pago.`;

    return NextResponse.json({ 
        success: true, 
        message: successMessage + (processingErrors.length > 0 ? ' Algunos registros tuvieron errores.' : ''),
        details: { errores: processingErrors }
    });

  } catch (error: any) {
    console.error('Error en la importación de pagos:', error);
    return NextResponse.json({ 
        success: false, 
        message: 'Error interno del servidor al procesar el archivo.', 
        details: error.stack || error.message 
    }, { status: 500 });
  }
}
