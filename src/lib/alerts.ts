import { checkPaymentLimits } from '@/ai/flows/payment-limit-alerts';
import { PROGRAMAS } from './constants';
import type { Alert, Participant } from './types';
import { calculateAge } from './utils';

export async function getAlertStatus(participant: Participant): Promise<Alert> {
  if (participant.esEquipoTecnico) {
    return { type: 'indigo', msg: 'Equipo Técnico' };
  }

  if (participant.programa === PROGRAMAS.JOVEN) {
    const edad = calculateAge(participant.fechaNacimiento);
    if (edad >= 28) {
      return { type: 'red', msg: `Límite de Edad (${edad} años)` };
    }
  }

  // Use GenAI for payment-related alerts, except for Tutorias
  if (participant.programa !== PROGRAMAS.TUTORIAS) {
    try {
      const paymentAlert = await checkPaymentLimits({
        participantId: participant.id,
        participantName: participant.nombre,
        programa: participant.programa,
        pagosAcumulados: participant.pagosAcumulados || 0,
      });

      if (paymentAlert.alertType === 'red') {
        return { type: 'red', msg: paymentAlert.alertMessage };
      }
      if (paymentAlert.alertType === 'yellow') {
        return { type: 'yellow', msg: paymentAlert.alertMessage };
      }
    } catch (error) {
      console.error('Error checking payment limits with AI:', error);
      // Fallback or error state
      return { type: 'red', msg: 'Error al verificar pagos' };
    }
  }

  return { type: 'green', msg: 'En Curso' };
}
