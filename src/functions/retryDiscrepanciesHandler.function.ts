import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamo = new DynamoDB.DocumentClient();
const DISCREPANCY_TABLE = process.env.DISCREPANCY_TABLE || '';
const AUDIT_TABLE = process.env.AUDIT_TABLE || '';
const TIME_REINTENTOS = process.env.TIME_REINTENTOS;
const NUM_REINTENTOS = process.env.NUM_REINTENTOS;

export const handler = async () => {
  const start = Date.now();

  // Hora local en formato legible
  const now = new Date();
  const localDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const localTimeStr = localDate.toISOString().replace('T', ' ').replace('Z', '');
  console.log(`[${localTimeStr}] Inicio de ejecución Lambda retryDiscrepancias`);

  try {
    const tiempoEntreIntentosMs = (Number(TIME_REINTENTOS) * 60 * 1000) / Number(NUM_REINTENTOS);
    const tiempoEntreIntentosSegundos = (tiempoEntreIntentosMs / 1000).toFixed(2);

    const result = await dynamo.scan({ TableName: DISCREPANCY_TABLE }).promise();
    const discrepancias = result.Items || [];

    if (discrepancias.length === 0) {
      console.log(`[${localTimeStr}] No se encontraron registros pendientes en la tabla de discrepancias.`);
    }

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

      const tipoAccion = statusConciliacion.toLowerCase();

      if (statusPayment?.toUpperCase() === 'SUCCESS') {
        console.log(`Ya fue procesado con éxito: ${orderNo}`);
        continue;
      }

      if (numeroIntentos >= Number(NUM_REINTENTOS)) {
        console.log(`Se alcanzó el máximo de reintentos para ${orderNo}`);
        continue;
      }

      const ahora = Date.now();
      const tiempoDesdeUltimoIntento = ahora - Number(lastAttempt);
      const tiempoDesdeUltimoIntentoSegundos = (tiempoDesdeUltimoIntento / 1000).toFixed(2);
      const lastAttemptReadable = lastAttempt > 0
        ? new Date(Number(lastAttempt)).toISOString().replace('T', ' ').replace('Z', '')
        : '—';

      if (lastAttempt > 0 && tiempoDesdeUltimoIntento < tiempoEntreIntentosMs) {
        console.log(`Aún no ha pasado el tiempo entre intentos para ${orderNo} - han pasado ${tiempoDesdeUltimoIntentoSegundos}s de los ${tiempoEntreIntentosSegundos}s requeridos (último intento fue: ${lastAttemptReadable})`);
        continue;
      }

      const intentoActual = numeroIntentos + 1;
      let nuevoStatus = statusPayment;
      let mensaje = `Intento #${intentoActual} para ${tipoAccion.toUpperCase()} -> `;
      let resultado = '';

      const logPrimerIntento = lastAttempt === 0
        ? ' (primer intento)'
        : ` (último intento fue hace ${tiempoDesdeUltimoIntentoSegundos}s a las ${lastAttemptReadable})`;

      console.log(`Reintentando ${tipoAccion.toUpperCase()} para ${orderNo} - intento #${intentoActual}${logPrimerIntento}`);

      // Simulación de reintento (reemplazar con lógica real)
      const exito = Math.random() < 0.5;
      if (exito) {
        nuevoStatus = 'SUCCESS';
        mensaje += 'éxito';
        resultado = 'EXITOSO';
      } else {
        mensaje += intentoActual >= Number(NUM_REINTENTOS)
          ? 'fallo definitivo (máximo alcanzado)'
          : 'fallo';
        resultado = 'FALLIDO';
      }

      // Actualizar tabla de discrepancias
      await dynamo.update({
        TableName: DISCREPANCY_TABLE,
        Key: { id, orderNo },
        UpdateExpression: 'SET statusPayment = :status, numeroIntentos = :i, lastAttempt = :now',
        ExpressionAttributeValues: {
          ':status': nuevoStatus,
          ':i': intentoActual,
          ':now': ahora
        }
      }).promise();

      // Registrar auditoría
      const auditItem = {
        id: uuidv4(),
        orderNo,
        codetransferencia,
        corresponsalCode,
        estado,
        expirationDateClean,
        fecha: item.fecha,
        fechaIntentos: new Date().toISOString(),
        mensaje,
        numeroIntentos: intentoActual,
        resultado,
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
