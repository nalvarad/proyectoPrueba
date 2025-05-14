import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRandomDelay() {
  const base = 100; // milisegundos
  const factor = Math.pow(2, Math.floor(Math.random() * 5)); // 1, 2, 4, 8, 16
  return base * factor + Math.floor(Math.random() * base); // backoff + jitter
}

export const getOnlinePayments = async () => {
  await delay(getRandomDelay()); // espera aleatoria al inicio

  try {
    const result = await dynamo.scan({
      TableName: TABLE_NAME,
      ProjectionExpression: "orden, orderNo, statusPayment"
    }).promise();

    const cleanItems = (result.Items || []).map((item, index) => {
      let parsedOrden: any = {};

      try {
        if (item.orden) {
          parsedOrden = typeof item.orden === 'string'
            ? JSON.parse(item.orden)
            : item.orden;
        }
      } catch (err) {
        console.error(`❌ Error parseando JSON de orden en item #${index}:`, err);
      }

      console.log(`===== Item #${index} =====`);
      console.log('Parsed orden:', JSON.stringify(parsedOrden, null, 2));

      return {
        orderNo: item.orderNo || null,
        secuencia: parsedOrden?.secuencia?.S || parsedOrden?.orden?.M?.secuencial?.S || null,
        statusPayment: item.statusPayment || null,
        paymentId: parsedOrden?.paymentId?.S || null,
        fecha: parsedOrden?.fecha?.S || null,
        monto: parsedOrden?.monto?.N ? parseFloat(parsedOrden.monto.N) : null,
        corresponsal: {
          nombre: parsedOrden?.orden?.M?.corresponsal?.M?.nombre?.S || null,
          codigo: parsedOrden?.orden?.M?.corresponsal?.M?.codigo?.S || null
        }
      };
    });


    return cleanItems;

  } catch (error) {
    console.error("Error escaneando la tabla:", error);
    return {
      error: true,
      message: "Error al consultar DynamoDB",
      detail: error
    };
  }
};
