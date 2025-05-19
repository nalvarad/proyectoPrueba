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

  // Construir mensaje personalizado para auditoría
  let mensajeAudit = '';

  if ((!statusPayment || statusPayment === 'FAILED') && statusSybase === 'P') {
    mensajeAudit = 'Se detectó posible PAGO: Sybase confirmó pero Dynamo no refleja';
    await registerDiscrepancie('pago', event, statusSybase);
  } else if (statusPayment === 'SUCCESS' && statusSybase !== 'P') {
    mensajeAudit = 'Se detectó posible REVERSO: Dynamo SUCCESS pero Sybase no refleja';
    await registerDiscrepancie('reverso', event, statusSybase);
  } else if (statusPayment === 'FAILED' && statusSybase === 'I') {
    mensajeAudit = 'Se detectó posible REVERSO: Sybase esta como Ingresado';
    await registerDiscrepancie('reverso', event, statusSybase);
  } else if (statusSybase === 'A') {
    mensajeAudit = 'Estado ANULADO detectado. No se toma acción.';
    console.log(mensajeAudit);
  } else {
    mensajeAudit = 'Comparación sin discrepancias relevantes';
    console.log(mensajeAudit);
  }

  // Registrar auditoría solo si hay status válido
  await registerAudit({
    orderNo,
    statusPayment,
    estado: statusSybase,
    mensaje: mensajeAudit,
    corresponsalCode: event.corresponsal?.codigo,
  });

  return {
    statusCode: 200,
    orderNo,
    evaluado: true
  };
};
