
export type UserRole = {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'data-entry';
  createdAt: string;
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
  esEquipoTecnico: boolean;
  pagosAcumulados: number;
  activo: boolean;
  ownerId: string;
  fechaAlta: string;
  ultimoPago?: string; // Format "MM/YYYY"
  estado?: 'Activo' | 'Ingresado' | 'Baja' | 'Requiere Atención';
  mesAusencia?: string; // Format "MM/YYYY", registra el mes de la ausencia que disparó "Requiere Atención"
};

export type Payment = {
    id: string;
    participantId: string;
    dni: string;
    monto: number;
    mes: string;
    anio: string;
    programa: string;
    fechaCarga: any; // serverTimestamp
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
    fechaCarga: any; // serverTimestamp
    ownerId: string;
    ownerName: string;
}

export type Novedad = {
    id: string;
    participantId: string;
    participantName: string;
    dni: string;
    descripcion: string;
    type: 'GENERAL' | 'BAJA' | 'POSIBLE_BAJA' | 'ALTA';
    fecha: string; // YYYY-MM-DD
    fechaRealCarga: any; // serverTimestamp
    ownerId: string;
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
    fechaVigencia: string; // YYYY-MM-DD
    ownerId: string;
    createdAt: any;
}
