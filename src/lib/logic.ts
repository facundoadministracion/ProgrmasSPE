import { PROGRAMAS } from './constants';
import type { Participant } from './types';
import { calculateAgeAtEndOfMonth } from './utils';

export const getAlertStatus = (participant: Participant) => {
  // La lógica principal ahora se basa en el campo `activo`.
  if (!participant.activo) {
    return { type: 'red', msg: 'Baja' };
  }
  
  if (participant.esEquipoTecnico) return { type: 'indigo', msg: 'Equipo Técnico' };

  if (participant.programa === PROGRAMAS.JOVEN) {
     const edad = calculateAgeAtEndOfMonth(participant.fechaNacimiento);
     if (edad >= 28) return { type: 'red', msg: `Límite de Edad (${edad} años)` };
  }

  if (participant.programa === PROGRAMAS.JOVEN || participant.programa === PROGRAMAS.TECNO) {
    const count = participant.pagosAcumulados || 0;
    if (count === 5 || count === 11) return { type: 'yellow', msg: 'Próximo a Vencimiento' };
    if (count === 6) return { type: 'yellow', msg: 'Requiere Autorización (6 Pagos)' };
    if (count === 12) return { type: 'yellow', msg: 'Fin de Ciclo / Pase a Planta' };
    if (count > 12) return { type: 'purple', msg: 'Excedido (Revisar)' };
  }
  
  return { type: 'green', msg: 'Activo' };
};

export const getPaymentStatus = (ultimoPago: string | undefined) => {
    if (!ultimoPago) return { text: 'Sin historial', type: 'gray' };
    try {
        const [m, y] = ultimoPago.split('/').map(Number);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        const diff = (currentYear - y) * 12 + (currentMonth - m);
        
        if (diff <= 1) return { text: `Al día (Pago: ${ultimoPago})`, type: 'green' };
        if (diff <= 2) return { text: `Revisar (Pago: ${ultimoPago})`, type: 'yellow' };
        return { text: `Revisar (Pago: ${ultimoPago})`, type: 'red' };
    } catch (e) {
        return { text: 'Error fecha', type: 'gray' };
    }
};
