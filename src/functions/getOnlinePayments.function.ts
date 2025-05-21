import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';
const ORDERNO_INDEX = 'OrderNoStatusIndex';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function getRandomDelay() {
  const base = 100;
  const factor = Math.pow(2, Math.floor(Math.random() * 5));
  return base * factor + Math.floor(Math.random() * base);
}

export const getOnlinePayments = async (event: any = {}) => {
  await delay(getRandomDelay());

  const orderNo = event.orderNo ?? null;

  try {
    let items: any[] = [];

    if (orderNo) {
      // MODO MANUAL: traer el registro más reciente para el orderNo
      const result = await dynamo.query({
        TableName: TABLE_NAME,
        IndexName: ORDERNO_INDEX,
        KeyConditionExpression: 'orderNo = :orderNo',
        ExpressionAttributeValues: {
          ':orderNo': orderNo
        },
        ScanIndexForward: false, // Más reciente primero
        Limit: 1
      }).promise();

      items = result.Items || [];

      // No necesitas limpiar más de uno, solo uno vendrá
      return items.map(parseItem);
    } else {
      // MODO AUTOMÁTICO: traer todo y filtrar los más recientes
      const result = await dynamo.scan({
        TableName: TABLE_NAME,
        ProjectionExpression: 'orden, orderNo, statusPayment'
      }).promise();

      const allItems = result.Items || [];
      const cleanItems = allItems.map(parseItem);

      // Agrupar por orderNo y quedarte con el más reciente
      const seenOrders: { [orderNo: string]: number } = {};
      const finalList: any[] = [];

      cleanItems.forEach((item) => {
        if (!item.fecha) return;

        const index = seenOrders[item.orderNo];
        if (index === undefined) {
          seenOrders[item.orderNo] = finalList.length;
          finalList.push(item);
        } else {
          const existing = finalList[index];
          if (new Date(item.fecha) > new Date(existing.fecha)) {
            finalList[index] = item;
          }
        }
      });

      return finalList.slice(0, 10); // Limitar a 10
    }
  } catch (error) {
    console.error('Error al consultar DynamoDB:', error);
    return {
      error: true,
      message: 'Error al consultar DynamoDB',
      detail: error
    };
  }
};

// === Función de parseo reutilizable ===
function parseItem(item: any, index = 0) {
  let parsedOrden: any = {};

  try {
    if (typeof item.orden === 'string') {
      parsedOrden = JSON.parse(item.orden);
    } else {
      parsedOrden = item.orden || {};
    }
  } catch (err) {
    console.error(`Error parseando JSON de orden en item #${index}:`, err);
  }

  const fechaParsed = parsedOrden?.fecha?.S ?? parsedOrden?.fecha ?? null;
  const fechaValida = fechaParsed && !isNaN(new Date(fechaParsed).getTime());

  return {
    orderNo: item.orderNo,
    secuencia:
      parsedOrden?.secuencia?.S ??
      parsedOrden?.orden?.M?.secuencial?.S ??
      parsedOrden?.secuencia ??
      parsedOrden?.orden?.secuencial ?? null,
    statusPayment: item.statusPayment || null,
    paymentId: parsedOrden?.paymentId?.S ?? parsedOrden?.paymentId ?? null,
    fecha: fechaValida ? fechaParsed : null,
    monto: parsedOrden?.monto?.N
      ? parseFloat(parsedOrden.monto.N)
      : parsedOrden?.monto ?? null,
    corresponsal: {
      nombre:
        parsedOrden?.orden?.M?.corresponsal?.M?.nombre?.S ??
        parsedOrden?.orden?.corresponsal?.nombre ?? null,
      codigo:
        parsedOrden?.orden?.M?.corresponsal?.M?.codigo?.S ??
        parsedOrden?.orden?.corresponsal?.codigo ?? null,
    },
  };
}
