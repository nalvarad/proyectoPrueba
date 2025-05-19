import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const docClient = new DynamoDB.DocumentClient();
const tableDiscrepancias = process.env.DISCREPANCY_TABLE || '';
const timeCache = Number(process.env.TIME_EXPIRATION_CACHE);

export async function registerDiscrepancie(
  tipo: 'pago' | 'reverso',
  item: any,
  estado: string
) {
  const expirationDateClean = Math.floor(Date.now() / 1000) + 60 * 60 * timeCache;

  const registro = {
    id: uuidv4(),
    orderNo: item.orderNo,
    secuencia: item.secuencia,
    statusPayment: item.statusPayment,
    paymentId: item.paymentId,
    fecha: item.fecha,
    monto: item.monto,
    corresponsalName: item.corresponsal?.nombre ?? 'N/A',
    corresponsalCode: item.corresponsal?.codigo ?? 'N/A',
    codetransferencia: item.orderNo,
    estado,
    numeroIntentos: 1,
    statusConciliacion: tipo.toUpperCase(),
    mensaje: `Se detectó necesidad de ${tipo}`,
    expirationDateClean,
  };

  await docClient.put({
    TableName: tableDiscrepancias,
    Item: registro,
  }).promise();

  console.log(`Discrepancia registrada: ${tipo} - orderNo: ${item.orderNo}`);
}
