import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { BuildConfig } from '../../config/buildConfig'; // Ajusta si la ruta es distinta

const dynamo = new DynamoDB.DocumentClient();
const DISCREPANCY_TABLE = process.env.DISCREPANCY_TABLE || '';
const AUDIT_TABLE = process.env.AUDIT_TABLE || '';

export const handler = async () => {
  const start = Date.now();

  // Obtener hora local en formato ISO ajustado a UTC-5
  const now = new Date();
  const localDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const localTimeStr = localDate.toISOString().replace('T', ' ').replace('Z', '');
  console.log(`[${localTimeStr}] Inicio de ejecución Lambda retryDiscrepancias`);

  try {
    // Cargar configuración desde SSM usando tu clase BuildConfig
    const buildConfig = new BuildConfig();
    await buildConfig.getConfig();
    const { TIME_REINTENTOS, NUM_REINTENTOS } = buildConfig.getRetryConfig();
    const tiempoEntreIntentos = TIME_REINTENTOS / NUM_REINTENTOS;

    const result = await dynamo.scan({ TableName: DISCREPANCY_TABLE }).promise();
    const discrepancias = result.Items || [];

    for (const item of discrepancias) {
      const {
        id,
        orderNo,
        statusPayment,
        statusConciliacion,
        numeroIntentos = 0,
        lastAttempt = 0,
        codetransferencia,
        corresponsalCode,
        estado,
        expirationDateClean
      } = item;

      if (!orderNo || !statusConciliacion) {
        console.warn(`Registro incompleto, se omite: ${JSON.stringify(item)}`);
        continue;
      }

      const tipoAccion = statusConciliacion.toLowerCase(); // "pago" o "reverso"

      if (statusPayment?.toUpperCase() === 'SUCCESS') {
        console.log(`Ya fue procesado con éxito: ${orderNo}`);
        continue;
      }

      if (numeroIntentos >= NUM_REINTENTOS) {
        console.log(`Máximo de reintentos alcanzado para ${orderNo}`);

        const auditItem = {
          id: uuidv4(),
          orderNo,
          codetransferencia,
          corresponsalCode,
          estado,
          expirationDateClean,
          fecha: item.fecha,
          fechaIntentos: new Date().toISOString(),
          mensaje: `Intento #${numeroIntentos} para ${tipoAccion.toUpperCase()} -> Excedió número máximo de reintentos`,
          numeroIntentos: numeroIntentos,
          resultado: 'FALLIDO',
          statusPayment
        };

        await dynamo.put({
          TableName: AUDIT_TABLE,
          Item: auditItem
        }).promise();

        continue;
      }

      const minutosDesdeUltimo = (Date.now() - lastAttempt) / 60000;
      if (minutosDesdeUltimo < tiempoEntreIntentos) {
        console.log(`Aún no ha pasado el tiempo entre intentos para ${orderNo}`);
        continue;
      }

      const intentoActual = numeroIntentos + 1;
      const mensaje = `Intento #${intentoActual} para ${tipoAccion.toUpperCase()} ->`;

      console.log(`Reintentando ${tipoAccion.toUpperCase()} para ${orderNo} - intento #${intentoActual}`);

      // Simulación (reemplazar por lógica real de pago/reverso)
      const exito = Math.random() < 0.5;
      const nuevoStatus = exito ? 'SUCCESS' : statusPayment;

      await dynamo.update({
        TableName: DISCREPANCY_TABLE,
        Key: { id, orderNo },
        UpdateExpression: 'SET statusPayment = :status, numeroIntentos = :i, lastAttempt = :now',
        ExpressionAttributeValues: {
          ':status': nuevoStatus,
          ':i': intentoActual,
          ':now': Date.now()
        }
      }).promise();

      const auditItem = {
        id: uuidv4(),
        orderNo,
        codetransferencia,
        corresponsalCode,
        estado,
        expirationDateClean,
        fecha: item.fecha,
        fechaIntentos: new Date().toISOString(),
        mensaje: `${mensaje}${exito ? 'éxito' : 'fallo'}`,
        numeroIntentos: intentoActual,
        resultado: exito ? 'EXITOSO' : 'FALLIDO',
        statusPayment: nuevoStatus
      };

      await dynamo.put({
        TableName: AUDIT_TABLE,
        Item: auditItem
      }).promise();
    }

    const duration = Date.now() - start;
    console.log(`[${localTimeStr}] Lambda finalizó en ${duration} ms`);

    return {
      statusCode: 200,
      body: 'Proceso de reintentos ejecutado correctamente.'
    };

  } catch (error) {
    console.error('Error en retryDiscrepanciasHandler:', error);
    return {
      statusCode: 500,
      body: 'Error al procesar reintentos.'
    };
  }
};
