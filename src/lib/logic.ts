
import { PROGRAMAS, ALERT_TYPES, ALERT_MESSAGES } from './constants';
import type { Participant } from './types';
import { calculateAgeAtEndOfMonth } from './utils';

const AGE_LIMIT_JOVEN = 28;

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

  if (participant.programa && (participant.programa === PROGRAMAS.JOVEN || participant.programa === PROGRAMAS.TECNO)) {
    const count = (participant.pagosPorPrograma && participant.pagosPorPrograma[participant.programa]) || 0;
    const renewalsNeeded = Math.floor(count / 6);
    const renewalsHeld = participant.renovaciones?.length || 0;

    if (renewalsNeeded > renewalsHeld) {
      return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.REQUIERE_AUTORIZACION };
    }

    // Alerta para el pago previo a la necesidad de renovación (5, 11, 17, etc.)
    if (count > 0 && count % 6 === 5) {
      return { type: ALERT_TYPES.YELLOW, msg: ALERT_MESSAGES.PROXIMO_VENCIMIENTO };
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
};

const PAYMENT_DUE_DAY = 12;
const MONTHS_IN_YEAR = 12;

export const getPaymentStatus = (ultimoPago: string | undefined) => {
  if (!ultimoPago) return { text: PAYMENT_MESSAGES.NO_HISTORY, type: PAYMENT_STATUS_TYPES.GRAY };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  try {
    let m = 0;
    let y = 0;

    // Prioritize parsing for "YYYY-MM" format
    if (ultimoPago.includes('-')) {
      const parts = ultimoPago.split('-');
      if (parts.length !== 2) throw new Error('Invalid date format: YYYY-MM');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new Error('Invalid month or year in YYYY-MM');
      }
    } 
    // Fallback for "mes/año" or "mm/año" format
    else if (ultimoPago.includes('/')) {
      const parts = ultimoPago.split('/');
      if (parts.length !== 2) throw new Error('Invalid date format: mes/año');
      
      const mesStr = parts[0];
      const anioStr = parts[1];

      const monthIndex = MESES.indexOf(mesStr.toLowerCase());
      if (monthIndex !== -1) {
        m = monthIndex + 1;
      } else {
        const monthNumber = parseInt(mesStr, 10);
        if (!isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
          m = monthNumber;
        } else {
          throw new Error('Invalid month name or number');
        }
      }

      y = parseInt(anioStr, 10);
      if (isNaN(y)) throw new Error('Invalid year');
    } 
    // If no valid separator is found
    else {
      throw new Error('No valid date separator found');
    }

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthsSincePayment = (currentYear - y) * MONTHS_IN_YEAR + (currentMonth - m);

    if (monthsSincePayment < 1) {
        return { text: PAYMENT_MESSAGES.UP_TO_DATE(ultimoPago), type: PAYMENT_STATUS_TYPES.GREEN };
    }

    if (monthsSincePayment === 1) {
        if (currentDay < PAYMENT_DUE_DAY) {
            return { text: PAYMENT_MESSAGES.UP_TO_DATE(ultimoPago), type: PAYMENT_STATUS_TYPES.GREEN };
        } else {
            return { text: PAYMENT_MESSAGES.PENDING(ultimoPago), type: PAYMENT_STATUS_TYPES.YELLOW };
        }
    }

    if (monthsSincePayment === 2) {
        if (currentDay < PAYMENT_DUE_DAY) {
            return { text: PAYMENT_MESSAGES.PENDING(ultimoPago), type: PAYMENT_STATUS_TYPES.YELLOW };
        } else {
            return { text: PAYMENT_MESSAGES.OVERDUE(ultimoPago), type: PAYMENT_STATUS_TYPES.RED };
        }
    }

    // This will cover monthsSincePayment > 2
    return { text: PAYMENT_MESSAGES.OVERDUE(ultimoPago), type: PAYMENT_STATUS_TYPES.RED };

  } catch (e: any) {
    console.error(`Error parsing date '${ultimoPago}':`, e.message);
    return { text: PAYMENT_MESSAGES.INVALID_DATE(ultimoPago), type: PAYMENT_STATUS_TYPES.GRAY };
  }
};
