import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRandomDelay() {
  const base = 100;
  const factor = Math.pow(2, Math.floor(Math.random() * 5));
  return base * factor + Math.floor(Math.random() * base);
}

export const getOnlinePayments = async () => {
  await delay(getRandomDelay());

  try {
    const result = await dynamo.scan({
      TableName: TABLE_NAME,
      ProjectionExpression: "orden, orderNo, statusPayment"
    }).promise();

    const cleanItems = (result.Items || []).map((item, index) => {
      let parsedOrden: any = {};

      try {
        if (typeof item.orden === 'string') {
          console.warn(`orden viene como string en item #${index}`);
        }

        if (item.orden) {
          parsedOrden = typeof item.orden === 'string'
            ? JSON.parse(item.orden)
            : item.orden;
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
          parsedOrden?.orden?.secuencial ??
          null,
        statusPayment: item.statusPayment || null,
        paymentId: parsedOrden?.paymentId?.S ?? parsedOrden?.paymentId ?? null,
        fecha: fechaValida ? fechaParsed : null,
        monto: parsedOrden?.monto?.N
          ? parseFloat(parsedOrden.monto.N)
          : parsedOrden?.monto ?? null,
        corresponsal: {
          nombre:
            parsedOrden?.orden?.M?.corresponsal?.M?.nombre?.S ??
            parsedOrden?.orden?.corresponsal?.nombre ??
            null,
          codigo:
            parsedOrden?.orden?.M?.corresponsal?.M?.codigo?.S ??
            parsedOrden?.orden?.corresponsal?.codigo ??
            null,
        },
      };
    });

    // Crear resultado respetando el orden original, pero solo con la fecha más reciente por orderNo
    const seenOrders: { [orderNo: string]: number } = {};
    const finalList: any[] = [];

    cleanItems.forEach((item) => {
      if (!item.fecha) return; // saltar si no tiene fecha válida

      const index = seenOrders[item.orderNo];

      if (index === undefined) {
        // Primera vez que vemos este orderNo
        seenOrders[item.orderNo] = finalList.length;
        finalList.push(item);
      } else {
        // Ya fue agregado antes -> comparar fechas
        const existing = finalList[index];
        if (new Date(item.fecha) > new Date(existing.fecha)) {
          finalList[index] = item;
        }
      }
    });

    return finalList.slice(0,10);  // Retornar solo los 5 primeros

  } catch (error) {
    console.error("Error escaneando la tabla:", error);
    return {
      error: true,
      message: "Error al consultar DynamoDB",
      detail: error
    };
  }
};
