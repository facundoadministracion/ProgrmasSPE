import type { Timestamp } from 'firebase/firestore';

export type Participant = {
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
  fechaAlta: string;
  activo: boolean;
  ultimoPago?: string;
  alert?: Alert;
};

export type NewParticipant = Omit<Participant, 'id' | 'pagosAcumulados' | 'fechaAlta' | 'activo'>;

export type Payment = {
  id: string;
  participantId: string;
  participantName: string;
  dni: string;
  monto: number;
  mes: string;
  anio: string;
  fechaCarga: Timestamp | Date;
};

export type Novedad = {
  id: string;
  participantId: string;
  participantName: string;
  descripcion: string;
  fecha: string;
  fechaRealCarga: Timestamp | Date;
};

export type AppConfig = {
  tutorias: { senior: number; estandar: number; junior: number };
  joven: { monto: number };
  tecno: { monto: number };
};

export type Alert = {
  type: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'indigo';
  msg: string;
};

export type ProgramName = 'Tutorías' | 'Empleo Joven' | 'Tecnoempleo';

export type Role = 'admin' | 'data_entry';
