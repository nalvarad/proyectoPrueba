import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamo = new DynamoDB.DocumentClient();
const DISCREPANCY_TABLE = process.env.DISCREPANCY_TABLE || '';
const AUDIT_TABLE = process.env.AUDIT_TABLE || '';
const NUM_REINTENTOS = Number(process.env.NUM_REINTENTOS || '3');
const TIEMPO_REINTENTOS = Number(process.env.TIME_REINTENTOS || '30'); // en minutos

export const handler = async () => {
  try {
    const now = Date.now();

    // Obtener discrepancias pendientes
    const result = await dynamo.scan({ TableName: DISCREPANCY_TABLE }).promise();
    const discrepancias = result.Items || [];

    const tiempoEntreIntentos = TIEMPO_REINTENTOS / NUM_REINTENTOS; // ej: 30 / 3 = 10 minutos

    for (const item of discrepancias) {
      const { orderNo, statusPayment, tipoAccion, intentos = 0, lastAttempt = 0 } = item;

      if (intentos >= NUM_REINTENTOS) {
        console.log(`Máximo de reintentos alcanzado para ${orderNo}`);
        continue;
      }

      const minutosDesdeUltimoIntento = (now - lastAttempt) / 60000;
      if (minutosDesdeUltimoIntento < tiempoEntreIntentos) {
        console.log(`Aún no ha pasado el tiempo entre intentos para ${orderNo}`);
        continue;
      }

      console.log(`Reintentando acción para ${orderNo}, intento #${intentos + 1}`);

      // Simulación de acción (luego aquí irá tu integración real de pago o reverso)
      const exito = Math.random() < 0.5;
      const nuevoStatus = exito ? 'SUCCESS' : 'FAILED';

      // Actualizar tabla de discrepancias
      await dynamo.update({
        TableName: DISCREPANCY_TABLE,
        Key: { id: item.id, orderNo },
        UpdateExpression: 'SET statusPayment = :status, intentos = :i, lastAttempt = :now',
        ExpressionAttributeValues: {
          ':status': nuevoStatus,
          ':i': intentos + 1,
          ':now': now
        }
      }).promise();

      // Insertar en tabla de auditoría
      const auditItem = {
        id: uuidv4(),
        orderNo,
        fecha: new Date().toISOString(),
        tipoAccion,
        statusPayment: nuevoStatus,
        mensaje: `Intento #${intentos + 1} → ${tipoAccion}`,
        resultado: exito ? 'EXITOSO' : 'FALLIDO'
      };

      await dynamo.put({
        TableName: AUDIT_TABLE,
        Item: auditItem
      }).promise();
    }

    return {
      statusCode: 200,
      body: 'Proceso de reintentos ejecutado.'
    };

  } catch (error) {
    console.error('Error en retryDiscrepanciasHandler:', error);
    return {
      statusCode: 500,
      body: 'Error al procesar reintentos.'
    };
  }
};
