import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const docClient = new DynamoDB.DocumentClient();
const tableAudit = process.env.AUDIT_TABLE || '';
const timeCache = Number(process.env.TIME_EXPIRATION_CACHE);

export async function registerAudit(input: {
  orderNo: string;
  statusPayment: string;
  estado: string;
  mensaje: string;
  corresponsalCode?: string;
}) {
  const now = new Date().toISOString();
  const expirationDateClean = Math.floor(Date.now() / 1000) + 60 * 60 * timeCache; //OJO CAMBIAR

  const item = {
    id: uuidv4(),
    orderNo: input.orderNo,
    codetransferencia: input.orderNo,
    statusPayment: input.statusPayment,
    estado: input.estado,
    numeroIntentos: 1,
    fechaIntentos: now,
    corresponsalCode: input.corresponsalCode ?? 'N/A',
    mensaje: input.mensaje,
    expirationDateClean,
  };

  await docClient.put({
    TableName: tableAudit,
    Item: item,
  }).promise();

  console.log(`Registro de auditoría guardado para orderNo: ${input.orderNo}`);
}
