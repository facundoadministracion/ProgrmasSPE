
export type UserRole = {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'data-entry';
  createdAt: string;
};

export type Renovacion = {
  tipoActo: 'decreto' | 'resolucion';
  numeroActo: string;
  fechaCarga: any; 
  ownerId: string;
};

export type Participant = {
  id: string;
  nombre: string;
  dni: string;
  legajo?: string;
  fechaNacimiento: string;
  actoAdministrativo?: string;
  programa: string;
  fechaIngreso: string;
  departamento: string;
  lugarTrabajo?: string;
  domicilio?: string;
  localidad?: string;
  categoria?: string;
  email?: string;
  telefono?: string;
  genero?: string; 
  esEquipoTecnico: boolean;
  pagosAcumulados?: number;
  pagosPorPrograma: { [key: string]: number };
  activo: boolean;
  ownerId: string;
  fechaAlta: string;
  ultimoPago?: string; 
  estado?: 'Activo' | 'Ingresado' | 'Baja' | 'Requiere Atención';
  mesAusencia?: string; 
  historialPagos?: string[];
  renovaciones?: string[];
  historialProgramas?: { [key: string]: { fechaInicio: string; fechaFin: string; motivo?: string; actoAdministrativoBaja?: string; } };
  motivoBaja?: string;
  fechaBaja?: string;
};

export type Payment = {
    id: string;
    participantId: string;
    dni: string;
    monto: number;
    mes: string;
    anio: string;
    programa: string;
    fechaCarga: any; 
    ownerId: string;
    paymentRecordId: string;
};

export type PaymentRecord = {
    id: string;
    programa: string;
    mes: string;
    anio: string;
    participantes: { id: string, dni: string, nombre: string, pagosAcumuladosPrev: number, estadoPrev: string }[];
    ausentes: { id: string, dni: string, nombre: string, estadoPrev: string }[];
    fechaCarga: any; 
    ownerId: string;
    ownerName: string;
}

export type Novedad = {
    id: string;
    participantId: string;
    descripcion: string;
    fechaRealCarga: any; 
    ownerId: string;
    type: 'GENERAL' | 'BAJA' | 'POSIBLE_BAJA' | 'ALTA' | 'REACTIVACION' | 'BAJA_DEFINITIVA' | 'RENOVACION' | 'TRASPASO';
    participantName?: string;
    dni?: string;
    programa?: string;
    fecha?: string; 
    fechaEvento?: string; 
    mesEvento?: string;
    anoEvento?: string;
    actoAdministrativo?: string;
    motivo?: string;
    tipoActo?: string;
    numeroActo?: string;
    causalInforme?: string;
    detalle?: string;
}

export type Asistencia = {
    id: string;
    participantId: string;
    dni: string;
    mes: number;
    anio: number;
    programa: string;
    horas: number;
    observaciones: string;
    metodo: 'MANUAL' | 'PLANILLA';
    fechaCarga: any;
    ownerId: string;
}

export type MontoPrograma = {
    id: string; 
    programa: string;
    monto: number;
    fechaVigencia: string; 
    ownerId: string;
    createdAt: any;
}

export type PagoRegistrado = {
  id: string;
  participantId: string;
  mes: string;
  anio: string;
  programa: string;
  fechaDeCarga: any;
  dni: string; // <-- CORREGIDO
  montoPagado: number; // <-- CORREGIDO
}

export type ParticipantFilter = 'requiresAttention' | 'paymentAlert' | 'ageAlert' | 'paymentDue' | 'renewalRequired' | 'finalization' | null;
