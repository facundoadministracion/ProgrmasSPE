
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';
import { GENEROS, DEPARTAMENTOS } from '@/lib/constants';

// Tipados (sin cambios)
interface ParticipantUpdateData { dni: string; departamento?: string; genero?: string; }
interface UpdatedRecord { dni: string; nombre: string; apellido: string; field: 'departamento' | 'genero'; oldValue: string; newValue: string; }

// Funciones de Normalización (sin cambios)
const normalizeText = (text: string) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
const normalizeGender = (csvGender: string): string | undefined => {
    if (!csvGender) return undefined;
    const lowerCaseGender = csvGender.toLowerCase();
    return (GENEROS as readonly string[]).find(g => g.toLowerCase() === lowerCaseGender);
};
const normalizeDepartamento = (csvDept: string): string | undefined => {
    if (!csvDept) return undefined;
    const normalizedCsvDept = normalizeText(csvDept);
    return (DEPARTAMENTOS as readonly string[]).find(d => normalizeText(d) === normalizedCsvDept);
};

export async function POST(request: Request) {
  const { db } = getFirebaseAdmin();
  try {
    const { participants } = await request.json();
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron datos de participantes.' }, { status: 400 });
    }

    const updatedRecords: UpdatedRecord[] = [];
    const notFoundDnis: string[] = [];
    const errors: string[] = [];
    const participantsCollection = db.collection('participants');
    const batch = db.batch();

    const dnisFromCsv = participants.map(p => String(p.dni).replace(/\./g, '').trim()).filter(Boolean);
    if (dnisFromCsv.length === 0) {
        return NextResponse.json({ updatedRecords: [], notFoundDnis: participants.map(p => p.dni), errors: ['No se encontraron DNI válidos en el archivo.'] });
    }

    // =========== INICIO DE LA CORRECCIÓN: PROCESAMIENTO POR LOTES ===========
    const foundParticipants = new Map();
    const chunkSize = 30; // Límite de Firestore para consultas 'in'

    // 1. Dividir la lista de DNIs en trozos de 30
    for (let i = 0; i < dnisFromCsv.length; i += chunkSize) {
        const chunk = dnisFromCsv.slice(i, i + chunkSize);
        
        // 2. Ejecutar una consulta por cada trozo
        const participantsQuery = await participantsCollection.where('dni', 'in', chunk).get();
        
        // 3. Agregar los resultados encontrados al mapa general
        participantsQuery.docs.forEach(doc => {
            foundParticipants.set(doc.data().dni, { id: doc.id, ...doc.data() });
        });
    }
    // =========== FIN DE LA CORRECCIÓN ===========

    // 4. Procesar cada fila del CSV con los datos ya encontrados (lógica sin cambios)
    for (const p of participants) {
        const originalDni = p.dni;
        if (!originalDni) {
            errors.push('Se ignoró una fila sin DNI.');
            continue;
        }
        const cleanedDni = String(originalDni).replace(/\./g, '').trim();
        const existingParticipant = foundParticipants.get(cleanedDni);

        if (!existingParticipant) {
            notFoundDnis.push(originalDni);
            continue;
        }

        const participantRef = participantsCollection.doc(existingParticipant.id);
        const updateData: { [key: string]: any } = {};

        if (p.departamento) {
            const newValue = normalizeDepartamento(p.departamento);
            const oldValue = existingParticipant.departamento || '';
            if (newValue && newValue !== oldValue) {
                updateData.departamento = newValue;
                updatedRecords.push({ dni: cleanedDni, nombre: existingParticipant.nombre, apellido: existingParticipant.apellido, field: 'departamento', oldValue, newValue });
            } else if (!newValue) {
                errors.push(`Departamento '${p.departamento}' no es válido para DNI ${cleanedDni}.`);
            }
        }

        if (p.genero) {
            const newValue = normalizeGender(p.genero);
            const oldValue = existingParticipant.genero || '';
            if (newValue && newValue !== oldValue) {
                updateData.genero = newValue;
                updatedRecords.push({ dni: cleanedDni, nombre: existingParticipant.nombre, apellido: existingParticipant.apellido, field: 'genero', oldValue, newValue });
            } else if (!newValue) {
                errors.push(`Género '${p.genero}' no es válido para DNI ${cleanedDni}.`);
            }
        }

        if (Object.keys(updateData).length > 0) {
            batch.update(participantRef, updateData);
        }
    }

    await batch.commit();

    return NextResponse.json({ updatedRecords, notFoundDnis, errors });

  } catch (error: any) {
    console.error("Error en la función de actualización masiva:", error);
    // Añade el mensaje de error específico de Firestore si existe
    const errorMessage = error.code === 'INVALID_ARGUMENT' ? error.message : 'Error fatal en el servidor';
    return NextResponse.json({ updatedRecords: [], notFoundDnis: [], errors: [errorMessage] }, { status: 500 });
  }
}
