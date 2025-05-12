import * as AWS from 'aws-sdk';


const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const registerDiscrepancies = async (event: any) => {
  const tableName = process.env.TABLA_DATA_NAME || "";

  const body = event.body ? JSON.parse(event.body) : event;
  const data = Array.isArray(body.data) ? body.data : [body];
  //const expirationDateClean = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 días
  const expirationDateClean = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // 1 día

  const results = [];

  for (const discrepancia of data) {
    const item = {
      id: discrepancia.id,
      orderNo: discrepancia.orderNo,
      secuencia: discrepancia.secuencia,
      statusPayment: discrepancia.statusPayment,
      paymentId: discrepancia.paymentId,
      fecha: discrepancia.fecha,
      monto: discrepancia.monto,
      corresponsalName: discrepancia.corresponsalName,
      corresponsalCode: discrepancia.corresponsalCode,
      codetransferencia: discrepancia.codetransferencia, //Me parece que es el orderNo
      estado: discrepancia.estado, //Estado de sybase
      numeroIntentos: discrepancia.numeroIntentos,
      statusConciliacion: discrepancia.statusConciliacion,
      mensaje: discrepancia.mensaje,
      expirationDateClean
    };

    const params = {
      TableName: tableName,
      Item: item
    };

    try {
      await dynamoDb.put(params).promise();
      console.log('Inserting item:', results);
      results.push({ id: item.id, status: 'OK' });
    } catch (error) {
      console.error('Error inserting item:', error);
      results.push({ id: item.id, status: 'ERROR', error });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};
