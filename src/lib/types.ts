import { Timestamp } from 'firebase/firestore';

export interface Participant {
  id: string;
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  actoAdministrativo?: string;
  programa: string;
  fechaIngreso: string;
  departamento: string;
  categoria?: string;
  lugarTrabajo?: string;
  email?: string;
  telefono?: string;
  esEquipoTecnico: boolean;
  pagosAcumulados: number;
  fechaAlta: string | Timestamp;
  activo: boolean;
  ultimoPago?: string;
  ownerId?: string;
}

export interface Payment {
  id: string;
  participantId: string;
  participantName: string;
  dni: string;
  monto: number;
  mes: string;
  anio: string;
  fechaCarga: Timestamp;
}

export interface Novedad {
  id: string;
  participantId: string;
  participantName: string;
  descripcion: string;
  fecha: string;
  fechaRealCarga: Timestamp;
}

export interface AppConfig {
  id: string;
  tutorias: {
    senior: number;
    estandar: number;
    junior: number;
  };
  joven: {
    monto: number;
  };
  tecno: {
    monto: number;
  };
}

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'data_entry';
  createdAt: string;
}
