export const DEPARTAMENTOS = [
  "Angel Vicente Peñaloza",
  "Arauco",
  "Capital",
  "Castro Barros",
  "Chamical",
  "Chilecito",
  "Facundo Quiroga",
  "Famatina",
  "Felipe Varela",
  "General Belgrano",
  "General Lamadrid",
  "General Ocampo",
  "General San Martin",
  "Independencia",
  "Rosario Vera Peñaloza",
  "San Blas de los Sauces",
  "Sanagasta",
  "Vinchina",
];

export const PROGRAMAS = {
  TUTORIAS: 'Tutorias',
  JOVEN: 'Empleo Joven',
  TECNO: 'Tecnoempleo'
} as const;

export const PROGRAM_LOGOS: { [key: string]: string } = {
  [PROGRAMAS.TUTORIAS]: '/logos/tutorias.png?v=2',
  [PROGRAMAS.JOVEN]: '/logos/empleo-joven.png?v=2',
  [PROGRAMAS.TECNO]: '/logos/tecnoempleo.png?v=2',
};

export const CATEGORIAS_TUTORIAS = ['Senior', 'Estandar', 'Junior'];

export const ESTADOS_PARTICIPANTE = ['Activo', 'Ingresado', 'Baja', 'Requiere Atención'] as const;

export const GENEROS = ['Femenino', 'Masculino', 'No Binario', 'Prefiero no decirlo'];

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Genera una lista de años desde 2025 para los próximos 10 años.
export const YEARS = Array.from({ length: 10 }, (_, i) => 2025 + i);

export const ROLES = {
  ADMIN: 'admin',
  DATA_ENTRY: 'data-entry',
  TECNICO: 'tecnico'
} as const;

export const CAUSALES_GENERALES = ['Renuncia', 'Horas Docente', 'Trabajo Registrado', 'Solicitadas', 'Cumplimiento de 6 pagos', 'Cumplimiento de 12 pagos'];

export const CAUSALES_SINTYS = ['Trabajo Registrado', 'Jubilación', 'Monotributo', 'Régimen General', 'Fallecimiento'];

export const ALERT_TYPES = {
  RED: 'red',
  BLUE: 'blue',
  YELLOW: 'yellow',
  INDIGO: 'indigo',
  PURPLE: 'purple',
  GREEN: 'green',
};

export const ALERT_MESSAGES = {
  BAJA: 'Baja',
  INGRESADO: 'Ingresado',
  REQUIERE_ATENCION: 'Requiere Atención',
  EQUIPO_TECNICO: 'Equipo Técnico',
  LIMITE_EDAD: (edad: number) => `Límite de Edad (${edad} años)`,
  PROXIMO_VENCIMIENTO: 'Próximo a Vencimiento',
  REQUIERE_AUTORIZACION: 'Requiere Autorización',
  ACTIVO: 'Activo',
};
