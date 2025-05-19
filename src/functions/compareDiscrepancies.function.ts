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
  console.log(`-> DynamoDB statusPayment: ${statusPayment ?? 'NO ENCONTRADO'}`);
  console.log(`-> Sybase status: ${statusSybase ?? 'NO ENCONTRADO'}`);

  //Solo registramos auditoría si viene statusSybase definido
  if (!statusSybase) {
    console.log(`No se registrará auditoría para ${orderNo} porque Sybase no retornó status.`);
    return {
      statusCode: 200,
      orderNo,
      evaluado: false
    };
  }

  // Registrar auditoría (solo si hay status válido)
  await registerAudit({
    orderNo,
    statusPayment: statusPayment,
    estado: statusSybase,
    mensaje: 'Auditoría de comparacion',
    corresponsalCode: event.corresponsal?.codigo,
  });

  // Caso 1: No hay registro o fallo en Dynamo, pero Sybase dice que sí pago
  if ((!statusPayment || statusPayment === 'FAILED') && statusSybase === 'P') {
    await registerDiscrepancie('pago', event, statusSybase);
  } else if (statusPayment === 'SUCCESS' && statusSybase !== 'P') {
    await registerDiscrepancie('reverso', event, statusSybase);
  } else if (statusPayment === 'FAILED' && statusSybase === 'I') {
    await registerDiscrepancie('reverso', event, statusSybase);
  } else if (statusSybase === 'A') {
    console.log(`Estado ANULADO para orderNo: ${orderNo}, no se realiza accion.`);
  } else {
    console.log(`Sin acción requerida para orderNo: ${orderNo} con statusSybase: ${statusSybase} y statusPayment: ${statusPayment}`);
  }

  return {
    statusCode: 200,
    orderNo,
    evaluado: true
  };
};
