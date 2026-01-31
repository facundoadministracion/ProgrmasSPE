
import { NextResponse } from 'next/server';
// import { firestore } from '@/lib/firebase/server'; // TEMPORALMENTE DESACTIVADO PARA PERMITIR EL BUILD
import { Participant } from '@/lib/types';

// Definimos el tipo para los datos que vamos a devolver
export interface GeographicReportData {
    id: string; // ID del documento de pago
    dni: string;
    nombre: string;
    departamento: string;
    monto: number;
    fechaPago: string;
    periodo: string;
}

export async function POST(request: Request) {
  // TEMPORALMENTE DESACTIVADO PARA PERMITIR EL BUILD
  console.error('La ruta de informe geográfico está desactivada temporalmente.');
  return NextResponse.json({ error: 'Esta funcionalidad está desactivada temporalmente.' }, { status: 503 });
  /*
  try {
    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json({ error: 'El mes y el año son requeridos.' }, { status: 400 });
    }

    // 1. Construir el período en formato MM/YYYY
    const periodo = `${String(month).padStart(2, '0')}/${year}`;

    // 2. Consultar la colección 'pagos' para el período dado
    const pagosSnapshot = await firestore.collection('pagos').where('periodo', '==', periodo).get();

    if (pagosSnapshot.empty) {
      return NextResponse.json([]); // Devolver un array vacío si no hay pagos
    }

    // 3. Extraer los DNIs y datos de pagos
    const dnis: string[] = [];
    const pagosData: any = {}; // Usaremos un objeto para acceso rápido
    pagosSnapshot.forEach(doc => {
        const data = doc.data();
        const dni = data.dni;
        if (dni) {
            dnis.push(dni);
            pagosData[dni] = {
                id: doc.id,
                monto: data.monto,
                fechaPago: data.fechaPago,
                periodo: data.periodo
            };
        }
    });
    
    // Eliminar DNIs duplicados si es necesario (aunque aquí usamos un mapa, así que no es estrictamente necesario)
    const uniqueDnis = [...new Set(dnis)];

    if (uniqueDnis.length === 0) {
        return NextResponse.json([]);
    }

    // 4. Consultar la colección 'participantes' con los DNIs obtenidos
    // Firestore tiene un límite de 10 elementos para el operador 'in'. Si esperas más, se necesita una estrategia más compleja.
    // Para este caso, asumimos que no superaremos el límite por liquidación mensual.
    const participantesSnapshot = await firestore.collection('participantes').where('dni', 'in', uniqueDnis).get();
    
    const participantesData: { [dni: string]: Partial<Participant> } = {};
    participantesSnapshot.forEach(doc => {
        const data = doc.data() as Participant;
        participantesData[data.dni] = { nombre: data.nombre, departamento: data.departamento };
    });

    // 5. Fusionar los datos
    const report: GeographicReportData[] = uniqueDnis.map(dni => {
        const pago = pagosData[dni];
        const participante = participantesData[dni];

        return {
            id: pago.id,
            dni: dni,
            nombre: participante?.nombre || 'N/A',
            departamento: participante?.departamento || 'No especificado',
            monto: pago.monto,
            fechaPago: pago.fechaPago,
            periodo: pago.periodo,
        };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenamos por nombre

    // 6. Devolver el informe completo
    return NextResponse.json(report);

  } catch (error) {
    console.error('Error al generar el informe geográfico:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
  */
}
