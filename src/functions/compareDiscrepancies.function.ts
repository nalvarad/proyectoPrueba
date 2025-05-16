import { StepFunctions } from 'aws-sdk';
import { registerDiscrepancie } from '../utils/discrepancies';
import { registerAudit } from '../utils/audit';

const step = new StepFunctions();

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function getRandomDelay() {
  const base = 100;
  const factor = Math.pow(2, Math.floor(Math.random() * 5));
  return base * factor + Math.floor(Math.random() * base);
}

export const compareDiscrepancies = async (event: any) => {
  await delay(getRandomDelay());

  const orderNo = event.orderNo;
  const statusPayment = event.statusPayment?.toUpperCase();
  const statusSybase = event.statusSybase?.toUpperCase();

  console.log(`Comparando orderNo: ${orderNo}`);
  console.log(`→ DynamoDB statusPayment: ${statusPayment ?? 'NO ENCONTRADO'}`);
  console.log(`→ Sybase status: ${statusSybase ?? 'NO ENCONTRADO'}`);

  // Registrar auditoría (siempre)
  await registerAudit({
    orderNo,
    statusPayment: statusPayment ?? 'N/A',
    estado: statusSybase ?? 'N/A',
    mensaje: 'Auditoría de comparación',
    corresponsalCode: event.corresponsal?.codigo ?? 'N/A',
  });

  // Lógica de discrepancias
  if (!statusPayment && statusSybase === 'P') {
    await registerDiscrepancie('pago', event, statusSybase);
  } else if (statusSybase === 'P' && statusPayment === 'FAILED') {
    await registerDiscrepancie('pago', event, statusSybase);
  } else if (statusPayment === 'SUCCESS' && statusSybase !== 'P') {
    await registerDiscrepancie('reverso', event, statusSybase);
  } else if (statusPayment === 'FAILED' && statusSybase === 'I') {
    await registerDiscrepancie('reverso', event, statusSybase);
  } else {
    console.log(`Sin acción requerida para orderNo: ${orderNo}`);
  }

  return {
    statusCode: 200,
    orderNo,
    evaluado: true
  };
};
