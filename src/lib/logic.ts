import { PROGRAMAS } from './constants';
import type { Participant } from './types';
import { calculateAgeAtEndOfMonth } from './utils';

// Constants for getAlertStatus
const ALERT_TYPES = {
  RED: 'red',
  BLUE: 'blue',
  YELLOW: 'yellow',
  INDIGO: 'indigo',
  PURPLE: 'purple',
  GREEN: 'green',
};

const ALERT_MESSAGES = {
  BAJA: 'Baja',
  INGRESADO: 'Ingresado',
  REQUIERE_ATENCION: 'Requiere Atención',
  EQUIPO_TECNICO: 'Equipo Técnico',
  LIMITE_EDAD: (edad: number) => `Límite de Edad (${edad} años)`,
  PROXIMO_VENCIMIENTO: 'Próximo a Vencimiento',
  REQUIERE_AUTORIZACION: 'Requiere Autorización (6 Pagos)',
  FIN_DE_CICLO: 'Fin de Ciclo / Pase a Planta',
  EXCEDIDO: 'Excedido (Revisar)',
  ACTIVO: 'Activo',
};

const AGE_LIMIT_JOVEN = 28;
const PAYMENTS_THRESHOLD = {
  NEAR_EXPIRY_1: 5,
  AUTHORIZATION_REQUIRED: 6,
  NEAR_EXPIRY_2: 11,
  CYCLE_END: 12,
};

export const getAlertStatus = (participant: Participant) => {
  if (!participant.activo) {
    return { type: ALERT_TYPES.RED, msg: ALERT_MESSAGES.BAJA };
  }

  if (participant.estado === ALERT_MESSAGES.INGRESADO) {
    return { type: ALERT_TYPES.BLUE, msg: ALERT_MESSAGES.INGRESADO };
  }
  if (participant.estado === ALERT_MESSAGES.REQUIERE_ATENCION) {
    return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.REQUIERE_ATENCION };
  }

  if (participant.esEquipoTecnico) {
    return { type: ALERT_TYPES.INDIGO, msg: ALERT_MESSAGES.EQUIPO_TECNICO };
  }

  if (participant.programa === PROGRAMAS.JOVEN) {
    const edad = calculateAgeAtEndOfMonth(participant.fechaNacimiento);
    if (edad >= AGE_LIMIT_JOVEN) {
      return { type: ALERT_TYPES.RED, msg: ALERT_MESSAGES.LIMITE_EDAD(edad) };
    }
  }

  if (participant.programa === PROGRAMAS.JOVEN || participant.programa === PROGRAMAS.TECNO) {
    const count = participant.pagosAcumulados || 0;
    if (count === PAYMENTS_THRESHOLD.NEAR_EXPIRY_1 || count === PAYMENTS_THRESHOLD.NEAR_EXPIRY_2) {
      return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.PROXIMO_VENCIMIENTO };
    }
    if (count === PAYMENTS_THRESHOLD.AUTHORIZATION_REQUIRED) {
      return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.REQUIERE_AUTORIZACION };
    }
    if (count === PAYMENTS_THRESHOLD.CYCLE_END) {
      return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.FIN_DE_CICLO };
    }
    if (count > PAYMENTS_THRESHOLD.CYCLE_END) {
      return { type: ALERT_TYPES.PURPLE, msg: ALERT_MESSAGES.EXCEDIDO };
    }
  }

  if (participant.estado && participant.estado !== ALERT_MESSAGES.ACTIVO) {
    return { type: ALERT_TYPES.YELLOW, msg: participant.estado };
  }

  return { type: ALERT_TYPES.GREEN, msg: ALERT_MESSAGES.ACTIVO };
};

// Constants for getPaymentStatus
const PAYMENT_STATUS_TYPES = {
  GRAY: 'gray',
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};

const PAYMENT_MESSAGES = {
  NO_HISTORY: 'Sin historial',
  UP_TO_DATE: (date: string) => `Al día (${date})`,
  PENDING: (date: string) => `Pendiente (${date})`,
  OVERDUE: (date: string) => `Pago Vencido (${date})`,
  INVALID_DATE: (date: string) => `Fecha inválida: ${date}`,
  INVALID_YEAR: (date: string) => `Año inválido: ${date}`,
  ERROR: (date: string) => `Error: ${date}`,
};

const PAYMENT_DUE_DAY = 12;
const MONTHS_IN_YEAR = 12;

export const getPaymentStatus = (ultimoPago: string | undefined) => {
  if (!ultimoPago) return { text: PAYMENT_MESSAGES.NO_HISTORY, type: PAYMENT_STATUS_TYPES.GRAY };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  try {
    const parts = ultimoPago.split('/');
    if (parts.length !== 2) throw new Error('Invalid date format');

    const mesStr = parts[0];
    const anioStr = parts[1];

    let m = MESES.indexOf(mesStr.toLowerCase()) + 1;
    if (m === 0) {
      const monthNumber = parseInt(mesStr, 10);
      if (!isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
        m = monthNumber;
      } else {
        return { text: PAYMENT_MESSAGES.INVALID_DATE(ultimoPago), type: PAYMENT_STATUS_TYPES.GRAY };
      }
    }

    const y = parseInt(anioStr, 10);
    if (isNaN(y)) return { text: PAYMENT_MESSAGES.INVALID_YEAR(ultimoPago), type: PAYMENT_STATUS_TYPES.GRAY };

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthsSincePayment = (currentYear - y) * MONTHS_IN_YEAR + (currentMonth - m);

    if (monthsSincePayment <= 1) {
      return { text: PAYMENT_MESSAGES.UP_TO_DATE(ultimoPago), type: PAYMENT_STATUS_TYPES.GREEN };
    }

    if (monthsSincePayment === 2) {
      if (currentDay < PAYMENT_DUE_DAY) {
        return { text: PAYMENT_MESSAGES.PENDING(ultimoPago), type: PAYMENT_STATUS_TYPES.YELLOW };
      } else {
        return { text: PAYMENT_MESSAGES.OVERDUE(ultimoPago), type: PAYMENT_STATUS_TYPES.RED };
      }
    }

    return { text: PAYMENT_MESSAGES.OVERDUE(ultimoPago), type: PAYMENT_STATUS_TYPES.RED };

  } catch (e) {
    return { text: PAYMENT_MESSAGES.ERROR(ultimoPago), type: PAYMENT_STATUS_TYPES.GRAY };
  }
};
