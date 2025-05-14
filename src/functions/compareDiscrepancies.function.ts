import { StepFunctions } from 'aws-sdk';

const step = new StepFunctions();

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function getRandomDelay() {
  const base = 100;
  const factor = Math.pow(2, Math.floor(Math.random() * 5));
  return base * factor + Math.floor(Math.random() * base);
}

export const compareDiscrepancies = async (event: any) => {
  await delay(getRandomDelay());

  //  Cambiado según nuevo input de Step Function
  const dynamoData = event.dynamoData;
  const sybaseData = event.sybaseData;

  const acciones: any[] = [];

  for (const itemDynamo of dynamoData) {
    const { orderNo, statusPayment } = itemDynamo;

    const matchingSybase = sybaseData.find(
      (s: { transferencia: string }) => s.transferencia === orderNo
    );

    if (!matchingSybase) {
      console.log(`No existe transferencia en Sybase para orderNo: ${orderNo}`);
      continue;
    }

    const statusSybase = matchingSybase.status;

    console.log(`Comparando orderNo: ${orderNo}`);
    console.log(`DynamoDB statusPayment: ${statusPayment}`);
    console.log(`Sybase status: ${statusSybase}`);

    if (statusSybase === 'P' && statusPayment === 'FAILED') {
      console.log(` INSERT pago para orderNo: ${orderNo}`);
      acciones.push({ tipo: 'pago', orderNo });
    } else if (statusPayment === 'SUCCESS' && statusSybase !== 'P') {
      console.log(` INSERT reverso para orderNo: ${orderNo}`);
      acciones.push({ tipo: 'reverso', orderNo });
    } else if (statusPayment === 'FAILED' && statusSybase === 'I') {
      console.log(` INSERT reverso por INGRESADO para orderNo: ${orderNo}`);
      acciones.push({ tipo: 'reverso', orderNo });
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
