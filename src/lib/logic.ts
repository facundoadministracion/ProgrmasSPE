import { PROGRAMAS } from './constants';
import type { Participant } from './types';
import { calculateAgeAtEndOfMonth } from './utils';

export const getAlertStatus = (participant: Participant) => {
  if (!participant.activo) {
    return { type: 'red', msg: 'Baja' };
  }

  // Chequeo de estados prioritarios
  if (participant.estado === 'Ingresado') {
    return { type: 'blue', msg: 'Ingresado' };
  }
  if (participant.estado === 'Requiere Atención') {
    return { type: 'yellow', msg: 'Requiere Atención' };
  }
  
  if (participant.esEquipoTecnico) return { type: 'indigo', msg: 'Equipo Técnico' };

  // Alertas por programa y edad/pagos
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
  
  // Fallback para otros estados no manejados explícitamente
  if (participant.estado && participant.estado !== 'Activo') {
      return { type: 'yellow', msg: participant.estado };
  }
  
  return { type: 'green', msg: 'Activo' };
};

export const getPaymentStatus = (ultimoPago: string | undefined) => {
    if (!ultimoPago) return { text: 'Sin historial', type: 'gray' };

    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    try {
        const parts = ultimoPago.split('/');
        if (parts.length !== 2) throw new Error('Invalid date format');

        const mesStr = parts[0];
        const anioStr = parts[1];

        let m = MESES.indexOf(mesStr.toLowerCase()) + 1;
        // Fallback for numeric month, just in case
        if (m === 0) {
            const monthNumber = parseInt(mesStr, 10);
            if (!isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
                m = monthNumber;
            } else {
                 return { text: `Fecha inválida: ${ultimoPago}`, type: 'gray' };
            }
        }
        
        const y = parseInt(anioStr, 10);
        if (isNaN(y)) return { text: `Año inválido: ${ultimoPago}`, type: 'gray' };

        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        const monthsSincePayment = (currentYear - y) * 12 + (currentMonth - m);
        
        if (monthsSincePayment <= 1) {
            return { text: `Al día (${ultimoPago})`, type: 'green' };
        }
        
        if (monthsSincePayment === 2) {
            if (currentDay < 12) {
                return { text: `Pendiente (${ultimoPago})`, type: 'yellow' };
            } else {
                return { text: `Pago Vencido (${ultimoPago})`, type: 'red' };
            }
        }
        
        return { text: `Pago Vencido (${ultimoPago})`, type: 'red' };

    } catch (e) {
        return { text: `Error: ${ultimoPago}`, type: 'gray' };
    }
};
