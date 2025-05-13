import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';

export const getOnlinePayments = async () => {
  try {
    const result = await dynamo.scan({
      TableName: TABLE_NAME,
      ProjectionExpression: "orden, orderNo, statusPayment"
    }).promise();

    const cleanItems = (result.Items || []).map(item => {
      const orden = item.orden || {};

      return {
        orderNo: item.orderNo || null,
        secuencia: orden?.secuencia?.S || null,
        statusPayment: item.statusPayment || null,
        paymentId: orden?.paymentId?.S || null,
        fecha: orden?.fecha?.S || null,
        monto: orden?.monto?.N ? parseFloat(orden.monto.N) : null,
        corresponsal: {
          nombre: orden?.orden?.M?.corresponsal?.M?.nombre?.S || null,
          codigo: orden?.orden?.M?.corresponsal?.M?.codigo?.S || null
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
