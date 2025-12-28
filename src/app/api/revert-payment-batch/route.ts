'use strict';

import { NextResponse } from 'next/server';
import { getFunctions, httpsCallable, FunctionsError } from 'firebase/functions'; // Corregido: HttpsError -> FunctionsError
import { app } from '../../../firebase/config';

// --- Lógica de la API Route ---

const getMonthNumber = (monthName: string): string => {
    const months: { [key: string]: string } = {
        'enero': '1', 'febrero': '2', 'marzo': '3', 'abril': '4', 'mayo': '5', 'junio': '6',
        'julio': '7', 'agosto': '8', 'septiembre': '9', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
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

    const functions = getFunctions(app);
    const revertFunction = httpsCallable(functions, 'revertPaymentBatch');

    const result = await revertFunction({
        year: anio,
        month: parseInt(mesNumeroStr, 10),
        program: programa,
    });

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error al invocar la Cloud Function de reversión:', error);
    
    // Corregido: HttpsError -> FunctionsError
    if (error instanceof FunctionsError) {
        return NextResponse.json(
            { 
                error: 'Error en la ejecución de la función de borrado.',
                details: error.message,
                code: error.code,
            }, 
            { status: 500 }
        );
    }

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
