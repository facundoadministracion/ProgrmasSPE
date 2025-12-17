import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/firebase-admin'; // Use the initialized db directly
import { PROGRAMAS } from '@/lib/constants';

// --- Helper Functions (assuming they are correct and don't need changes) ---

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

// Function to standardize program names
const OFFICIAL_PROGRAM_NAMES = Object.values(PROGRAMAS);
function getOfficialProgramName(name: string): string {
    const lowerCaseName = name.toLowerCase();
    const officialName = OFFICIAL_PROGRAM_NAMES.find(p => p.toLowerCase() === lowerCaseName);
    return officialName || name; // Return original name if no match is found, to be safe
}

// --- Main POST Handler ---

export async function POST(request: Request) {
  try {
    // No need for initializeAdminApp() or getFirestore() anymore

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.type !== 'text/csv') {
      return NextResponse.json({ success: false, message: 'Archivo no válido. Debe ser CSV.' }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parseCSV(fileContent);

    const requiredHeaders = ['dni', 'programa', 'mes', 'anio'];
    if (records.length === 0 || !requiredHeaders.every(h => Object.keys(records[0]).includes(h))) {
        return NextResponse.json({ success: false, message: `El CSV debe contener: ${requiredHeaders.join(', ')}.` }, { status: 400 });
    }
    
    const dnisInCsv = [...new Set(records.map(r => r.dni).filter(Boolean))];
    const participantDocsMap = new Map<string, {id: string, ref: FirebaseFirestore.DocumentReference}>();

    for (const chunk of chunkArray(dnisInCsv, 30)) {
        const snapshot = await db.collection('participants').where('dni', 'in', chunk).get();
        snapshot.forEach(doc => participantDocsMap.set(doc.data().dni, { id: doc.id, ref: doc.ref }));
    }

    const participantIds = Array.from(participantDocsMap.values()).map(p => p.id);
    const existingPayments = new Set<string>();
    
    if (participantIds.length > 0) {
        for (const chunk of chunkArray(participantIds, 30)) {
            const paymentsSnapshot = await db.collection('pagosRegistrados').where('participantId', 'in', chunk).get();
            paymentsSnapshot.forEach(doc => {
                const { participantId, anio, mes } = doc.data();
                existingPayments.add(`${participantId}-${anio}-${mes.toString().padStart(2, '0')}`);
            });
        }
    }
    
    const processingErrors: string[] = [];
    const newPaymentDocs: any[] = [];
    const affectedParticipants = new Set<string>();

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const { dni, programa, mes, anio } = record;

        if (!dni || !programa || !mes || !anio) {
            processingErrors.push(`Línea ${i + 2}: Fila incompleta.`);
            continue;
        }

        const participantData = participantDocsMap.get(dni);
        if (!participantData) {
            processingErrors.push(`Línea ${i + 2}: No se encontró participante con DNI ${dni}.`);
            continue;
        }

        const paymentKey = `${participantData.id}-${anio}-${mes.toString().padStart(2, '0')}`;
        if (existingPayments.has(paymentKey)) continue;
        
        existingPayments.add(paymentKey);
        affectedParticipants.add(participantData.id);

        newPaymentDocs.push({
            participantId: participantData.id,
            dni,
            programa: getOfficialProgramName(programa), // Standardize program name
            mes: mes.toString().padStart(2, '0'),
            anio,
            fechaDeCarga: Timestamp.now(),
        });
    }

    if (newPaymentDocs.length > 0) {
        for (const chunk of chunkArray(newPaymentDocs, 499)) {
            const batch = db.batch();
            chunk.forEach(docData => {
                const newDocRef = db.collection('pagosRegistrados').doc();
                batch.create(newDocRef, docData);
            });
            await batch.commit();
        }
    }
    
    if (affectedParticipants.size > 0) {
        const affectedParticipantIds = Array.from(affectedParticipants);
        for (const chunk of chunkArray(affectedParticipantIds, 499)) {
            const batch = db.batch();
            const paymentsSnapshot = await db.collection('pagosRegistrados').where('participantId', 'in', chunk).get();
            
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
                    const officialProgram = getOfficialProgramName(payment.programa); // Standardize here too
                    acc[officialProgram] = (acc[officialProgram] || 0) + 1;
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
    return NextResponse.json({ success: false, message: 'Error interno del servidor.', details: error.stack }, { status: 500 });
  }
}
