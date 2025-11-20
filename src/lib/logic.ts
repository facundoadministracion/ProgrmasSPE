import { PROGRAMAS } from './constants';
import { Participant } from './types';
import { calculateAge } from './utils';

export const getAlertStatus = (participant: Participant) => {
  if (participant.esEquipoTecnico) return { type: 'blue', msg: 'Equipo Técnico' };

  if (participant.programa === PROGRAMAS.JOVEN) {
     const edad = calculateAge(participant.fechaNacimiento);
     if (edad >= 28) return { type: 'red', msg: `Límite de Edad (${edad} años)` };
  }

  if (participant.programa !== PROGRAMAS.TUTORIAS) {
    const count = participant.pagosAcumulados || 0;
    if (count === 6) return { type: 'red', msg: 'Requiere Autorización (6 Pagos)' };
    if (count === 12) return { type: 'red', msg: 'Fin de Ciclo / Pase a Planta' };
    if (count > 12) return { type: 'purple', msg: 'Excedido (Revisar)' };
    if (count === 5 || count === 11) return { type: 'yellow', msg: 'Próximo a Vencimiento' };
  }
  
  return { type: 'green', msg: 'En Curso' };
};

export const getPaymentStatus = (ultimoPago: string | undefined) => {
    if (!ultimoPago) return { text: 'Sin historial', type: 'gray' };
    try {
        const [m, y] = ultimoPago.split('/').map(Number);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        const diff = (currentYear - y) * 12 + (currentMonth - m);
        
        if (diff <= 1) return { text: 'Activo', type: 'green' };
        if (diff <= 2) return { text: 'Revisar', type: 'yellow' };
        return { text: `Inactivo (Ult: ${ultimoPago})`, type: 'red' };
    } catch (e) {
        return { text: 'Error fecha', type: 'gray' };
    }
};
