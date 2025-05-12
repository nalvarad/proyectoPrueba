import * as AWS from 'aws-sdk';


const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const registerAudit = async (event: any) => {
  const tableName = process.env.TABLA_DATA_NAME || "";

  const body = event.body ? JSON.parse(event.body) : event;
  const data = Array.isArray(body.data) ? body.data : [body];
  //const expirationDateClean = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 días
  const expirationDateClean = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // 1 día
    
  const results = [];

  for (const auditoria of data) {
    const item = {
      id: auditoria.id,
      orderNo: auditoria.orderNo,
      statusPayment: auditoria.statusPayment,
      codetransferencia: auditoria.codetransferencia, //Me parece que es el orderNo
      estado: auditoria.estado, //Estado de sybase
      numeroIntentos: auditoria.numeroIntentos,
      fechaIntentos: auditoria.fechaIntentos,
      corresponsalCode: auditoria.corresponsalCode,
      mensaje: auditoria.mensaje,
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
