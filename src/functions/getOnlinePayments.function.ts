import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLA_DATA_NAME || '';

export const getOnlinePayments = async () => {
  try {
    const result = await dynamo.scan({
      TableName: TABLE_NAME,
      ProjectionExpression: "orderNo, statusPayment, orden"
    }).promise();

    return {
      statusCode: 200,
      body: result.Items || [],
    };
  } catch (error) {
    console.error("Error escaneando la tabla:", error);
    return {
      statusCode: 500,
      body: 'Error al consultar la tabla',
    };
  }
};
