import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';
const FECHA = process.env.FECHA || new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // ISO con hora

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
        IndexName: "OrderNoStatusIndex",
        KeyConditionExpression: 'orderNo = :orderNo',
        ExpressionAttributeValues: {
          ':orderNo': orderNo
        },
        ScanIndexForward: false, // Más reciente primero
        Limit: 1
      }).promise();

      items = result.Items || [];
      return items.map(parseItem);
    } else {
      /// MODO AUTOMÁTICO: Query por statusPayment con filtro de fecha

      const fechaIniDate = new Date(FECHA);
      const estados = ['FAILED', 'SUCCESS'];
      let allItems: any[] = [];

      for (const status of estados) {
        const result = await dynamo.query({
          TableName: TABLE_NAME,
          IndexName: 'StatusPaymentIndex',
          KeyConditionExpression: 'statusPayment = :status',
          ExpressionAttributeValues: {
            ':status': status
          }
        }).promise();

        console.log(`→ Resultados query con status=${status}: ${result.Items?.length}`);

        let discardedCount = 0;

        const itemsFiltrados = (result.Items || [])
          .map((item, index) => {
            const parsed = parseItem(item, index);
            if (!parsed) discardedCount++;
            return parsed;
          })
          .filter(item => item && item.fecha && new Date(item.fecha) >= fechaIniDate);

        console.log(`→ Ítems válidos con fecha ≥ ${FECHA}: ${itemsFiltrados.length}`);
        console.log(`→ Ítems descartados por errores de parseo: ${discardedCount}`);

        allItems.push(...itemsFiltrados); // <<<<<< IMPORTANTE: antes esto faltaba
      }

      // Agrupar por orderNo y quedarse con el más reciente por fecha
      const seenOrders: { [orderNo: string]: number } = {};
      const finalList: any[] = [];

      allItems.forEach((item) => {
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
      finalList.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      return finalList.slice(0, 10); // Limitar si se desea
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
  const orderNo = item?.orderNo || '(orderNo desconocido)';
  const rawOrden = item?.orden;

  // Ignorar ítems con orden vacío, nulo o incorrecto
  if (!rawOrden || (typeof rawOrden === 'string' && rawOrden.trim() === '')) {
    console.warn(`Item #${index} ignorado: campo 'orden' vacío o inválido (orderNo=${orderNo})`);
    return null;
  }

  let parsedOrden: any = {};

  try {
    if (typeof rawOrden === 'string') {
      parsedOrden = JSON.parse(rawOrden);
    } else if (typeof rawOrden === 'object') {
      parsedOrden = rawOrden;
    } else {
      console.warn(`Item #${index} ignorado: 'orden' no es string ni objeto válido (orderNo=${orderNo})`);
      return null;
    }
  } catch (err) {
    console.error(`Error parseando JSON de orden en item #${index} (orderNo=${orderNo}):`, err);
    return null;
  }

  const fechaParsed = parsedOrden?.fecha?.S ?? parsedOrden?.fecha ?? null;
  const fechaValida = fechaParsed && !isNaN(new Date(fechaParsed).getTime());

  return {
    orderNo: item.orderNo || null,
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
