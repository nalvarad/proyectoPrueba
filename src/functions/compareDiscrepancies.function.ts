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

  const comparacion = event || [];
  const acciones: any[] = [];

  for (const item of comparacion) {
    const orderNo = item.orderNo;
    const statusPayment = item.statusPayment?.toUpperCase();
    const statusSybase = item.statusSybase?.toUpperCase();

    console.log(`Comparando orderNo: ${orderNo}`);
    console.log(`→ DynamoDB statusPayment: ${statusPayment ?? 'NO ENCONTRADO'}`);
    console.log(`→ Sybase status: ${statusSybase ?? 'NO ENCONTRADO'}`);

    //Registrar auditoría (siempre)
    await registerAudit({
      orderNo,
      statusPayment: statusPayment ?? 'N/A',
      estado: statusSybase ?? 'N/A',
      mensaje: 'Auditoría de comparación',
      corresponsalCode: item.corresponsal?.codigo ?? 'N/A',
    });

    //Lógica de discrepancias
    if (!statusPayment && statusSybase === 'P') {
      acciones.push({ tipo: 'pago', orderNo });
      await registerDiscrepancie('pago', item, statusSybase);
    } else if (statusSybase === 'P' && statusPayment === 'FAILED') {
      acciones.push({ tipo: 'pago', orderNo });
      await registerDiscrepancie('pago', item, statusSybase);
    } else if (statusPayment === 'SUCCESS' && statusSybase !== 'P') {
      acciones.push({ tipo: 'reverso', orderNo });
      await registerDiscrepancie('reverso', item, statusSybase);
    } else if (statusPayment === 'FAILED' && statusSybase === 'I') {
      acciones.push({ tipo: 'reverso', orderNo });
      await registerDiscrepancie('reverso', item, statusSybase);
    } else {
      console.log(`Sin acción requerida para orderNo: ${orderNo}`);
    }
  }

  return {
    statusCode: 200,
    acciones,
    huboDiscrepancia: acciones.length > 0,
    tipoAccion: acciones.length > 0 ? acciones[0].tipo : null,
  };
};
