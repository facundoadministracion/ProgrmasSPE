import { NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase-admin';

// Helper to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Helper function to parse CSV from a string
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
                obj[header] = values[index];
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

    const formattedCsvHeaders = csvHeaders.map(h => h.trim().toLowerCase());

    if (!requiredHeaders.every(h => formattedCsvHeaders.includes(h))) {
        return NextResponse.json({ 
            success: false, 
            message: `El encabezado del CSV es incorrecto. Debe contener las columnas: ${requiredHeaders.join(', ')}.`,
            details: `Columnas encontradas: ${csvHeaders.join(', ')}`
        }, { status: 400 });
    }

    if (records.length === 0) {
        return NextResponse.json({ success: false, message: 'El archivo CSV está vacío o tiene un formato incorrecto.' }, { status: 400 });
    }
    
    const configsSnapshot = await db.collection('configuracion').orderBy('anoVigencia', 'desc').orderBy('mesVigencia', 'desc').get();
    const configs = configsSnapshot.docs.map(doc => doc.data());

    const findConfigAmount = (programa: string, anio: number, mes: number): number => {
        const validConfig = configs.find(c => {
           const configDate = new Date(c.anoVigencia, c.mesVigencia - 1);
           const paymentDate = new Date(anio, mes - 1);
           return configDate <= paymentDate;
        });

        if (!validConfig) return 0;
        
        if (programa.trim().toLowerCase() === 'programa tecnoempleo') return validConfig.montoTecno || 0;
        if (programa.trim().toLowerCase() === 'programa empleo joven') return validConfig.montoJoven || 0;
        if (programa.trim().toLowerCase() === 'tutorias') return validConfig.montoTutorias || 0;
        return 0;
    };

    const dnis = [...new Set(records.map(r => r.dni).filter(Boolean))];
    const participantDocs = new Map<string, {id: string, ref: FirebaseFirestore.DocumentReference}>();

    const dniChunks = chunkArray(dnis, 30);
    for (const chunk of dniChunks) {
        const snapshot = await db.collection('participants').where('dni', 'in', chunk).get();
        snapshot.forEach(doc => {
            participantDocs.set(doc.data().dni, { id: doc.id, ref: doc.ref });
        });
    }

    const processingErrors: string[] = [];
    const paymentHistorySummary: { [key: string]: { programa: string, mes: string, anio: string, count: number, totalAmount: number } } = {};
    let processedCount = 0;
    
    const batches: FirebaseFirestore.WriteBatch[] = [db.batch()];
    let currentBatchIndex = 0;
    let operationsInCurrentBatch = 0;

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const { dni, programa, mes, anio } = record;

        if (!dni || !programa || !mes || !anio) {
            processingErrors.push(`Línea ${i + 2}: Fila con datos incompletos.`);
            continue;
        }

        const participantData = participantDocs.get(dni);
        if (!participantData) {
            processingErrors.push(`Línea ${i + 2}: No se encontró participante con DNI ${dni}.`);
            continue;
        }

        // Find the amount. If not found, it will correctly be 0.
        const amount = findConfigAmount(programa, parseInt(anio), parseInt(mes));

        if (operationsInCurrentBatch >= 498) {
            batches.push(db.batch());
            currentBatchIndex++;
            operationsInCurrentBatch = 0;
        }
        const currentBatch = batches[currentBatchIndex];

        const paymentRef = db.collection('pagosRegistrados').doc();
        currentBatch.set(paymentRef, {
            participantId: participantData.id,
            dni: dni,
            programa: programa,
            mes: mes,
            anio: anio,
            montoPagado: amount, // This will be 0 for historical payments
            fechaDeCarga: Timestamp.now(),
        });

        currentBatch.update(participantData.ref, { pagosAcumulados: FieldValue.increment(1) });
        operationsInCurrentBatch += 2;

        const historyKey = `${programa}-${mes}-${anio}`;
        if (!paymentHistorySummary[historyKey]) {
            paymentHistorySummary[historyKey] = { programa, mes, anio, count: 0, totalAmount: 0 };
        }
        paymentHistorySummary[historyKey].count++;
        paymentHistorySummary[historyKey].totalAmount += amount;

        processedCount++;
    }

    for (const key in paymentHistorySummary) {
        const summary = paymentHistorySummary[key];
        const historyId = `${summary.programa}-${summary.mes}-${summary.anio}`;
        const historyRef = db.collection('paymentHistory').doc(historyId);
        
        const lastBatch = batches[batches.length - 1];
        lastBatch.set(historyRef, {
            programa: summary.programa,
            mesLiquidacion: summary.mes,
            anoLiquidacion: summary.anio,
            cantidadPagos: summary.count,
            montoTotalLiquidado: summary.totalAmount,
            fechaDeCarga: Timestamp.now(),
        }, { merge: true });
    }

    if (processedCount > 0) {
      await Promise.all(batches.map(batch => batch.commit()));
    }

    return NextResponse.json({ 
        success: true, 
        message: `Importación finalizada. Se procesaron ${processedCount} de ${records.length} registros.` + (processingErrors.length > 0 ? ' Algunos registros tuvieron errores.' : ''),
        details: {
            registrosProcesados: processedCount,
            registrosTotales: records.length,
            errores: processingErrors,
        }
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