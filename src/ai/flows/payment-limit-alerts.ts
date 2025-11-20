'use server';

/**
 * @fileOverview An AI agent for flagging participants approaching or reaching payment limits.
 *
 * - checkPaymentLimits - A function to check and flag participants based on payment limits.
 * - PaymentLimitAlertsInput - The input type for the checkPaymentLimits function.
 * - PaymentLimitAlertsOutput - The return type for the checkPaymentLimits function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PaymentLimitAlertsInputSchema = z.object({
  participantId: z.string().describe('The ID of the participant to check.'),
  participantName: z.string().describe('The name of the participant.'),
  programa: z.string().describe('The program the participant is enrolled in.'),
  pagosAcumulados: z
    .number()
    .describe('The number of payments accumulated by the participant.'),
});
export type PaymentLimitAlertsInput = z.infer<typeof PaymentLimitAlertsInputSchema>;

const PaymentLimitAlertsOutputSchema = z.object({
  alertType: z
    .string()
    .describe(
      'The type of alert, can be either `red` for reached limit, `yellow` for approaching limit, or `none` if no alert is needed.'
    ),
  alertMessage: z
    .string()
    .describe('A message describing the alert status, empty if no alert.'),
});
export type PaymentLimitAlertsOutput = z.infer<typeof PaymentLimitAlertsOutputSchema>;

export async function checkPaymentLimits(
  input: PaymentLimitAlertsInput
): Promise<PaymentLimitAlertsOutput> {
  return paymentLimitAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'paymentLimitAlertsPrompt',
  input: {schema: PaymentLimitAlertsInputSchema},
  output: {schema: PaymentLimitAlertsOutputSchema},
  prompt: `You are an AI assistant designed to help administrators manage participant payment limits. You will receive participant data and must determine if the participant needs to be flagged for approaching or exceeding payment limits.

  Consider the following:
  - Participants in the TUTORIAS program do not have payment limits.
  - Participants in other programs have a limit of 6 payments before requiring authorization and a hard limit of 12 payments.
  - Generate a YELLOW alert when a participant is at 5 or 11 payments, indicating they are nearing a limit.
  - Generate a RED alert when a participant is at 6 or 12 payments, indicating they have reached a limit.

  Input Data:
  Participant ID: {{{participantId}}}
  Participant Name: {{{participantName}}}
  Program: {{{programa}}}
  Payments Accumulated: {{{pagosAcumulados}}}

  Based on this information, determine the alert type and message. If no alert is needed, the alertType should be "none" and the alertMessage should be an empty string.
`,
});

const paymentLimitAlertsFlow = ai.defineFlow(
  {
    name: 'paymentLimitAlertsFlow',
    inputSchema: PaymentLimitAlertsInputSchema,
    outputSchema: PaymentLimitAlertsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
