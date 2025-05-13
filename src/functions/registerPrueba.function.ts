import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

interface PaymentItem {
  paymentId: string;
  code: string;
  message: string;
  orden: string;
  orderNo: string;
  secuencia: string;
  statusPayment: string;
}

interface ResponseItem {
  paymentId?: string;
  status: 'OK' | 'ERROR';
  error?: any;
}

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const tableName = process.env.TABLA_DATA_NAME || '';
  const results: ResponseItem[] = [];

  let bodyParsed: any;

  try {
    bodyParsed = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? event;
  } catch (e: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ status: 'ERROR', message: 'JSON malformado', error: e.message }),
    };
  }

  // Detecta si es un arreglo directo o un objeto con campo 'data'
  const data: any[] = Array.isArray(bodyParsed)
    ? bodyParsed
    : Array.isArray(bodyParsed.data)
    ? bodyParsed.data
    : [bodyParsed];

  for (const record of data) {
    if (!record || typeof record !== 'object') {
      console.error('❌ Registro inválido:', record);
      results.push({ status: 'ERROR', error: 'Formato de registro inválido' });
      continue;
    }

    if (!record.paymentId) {
      console.error('❌ paymentId ausente:', record);
      results.push({ status: 'ERROR', error: 'paymentId faltante' });
      continue;
    }

    const item: PaymentItem = {
      paymentId: record.paymentId,
      code: record.code,
      message: record.message,
      orden: record.orden,
      orderNo: record.orderNo,
      secuencia: record.secuencia,
      statusPayment: record.statusPayment,
    };

    const params = {
      TableName: tableName,
      Item: item,
    };

    try {
      await dynamoDb.put(params).promise();
      console.log('✅ Insertado:', item.paymentId);
      results.push({ paymentId: item.paymentId, status: 'OK' });
    } catch (error) {
      console.error('❌ Error insertando item:', item.paymentId, error);
      results.push({ paymentId: item.paymentId, status: 'ERROR', error });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results),
  };
};
