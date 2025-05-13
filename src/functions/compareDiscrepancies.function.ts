import { StepFunctions } from 'aws-sdk';

const step = new StepFunctions();

export const compareDiscrepancies = async (event: any) => {
  const dynamoData = event["Consultar datos en DynamoDB"];
  const sybaseData = event["Consultar datos en OnPremise"];


  const acciones: any[] = [];

  for (const giroSybase of sybaseData) {
    const matchingGiro = dynamoData.find((g: { orderNo: string; statusPayment: string }) =>
      g.orderNo === giroSybase.orderNo
    );


    if (giroSybase.estado === 'PAGADO' && (!matchingGiro || matchingGiro.statusPayment === 'FAILED')) {
      acciones.push({
        tipo: 'pago',
        orderNo: giroSybase.orderNo,
      });
    } else if (matchingGiro?.statusPayment === 'SUCCESS' && giroSybase.estado !== 'PAGADO') {
      acciones.push({
        tipo: 'reverso',
        orderNo: giroSybase.orderNo,
      });
    } else if (matchingGiro?.statusPayment === 'FAILED' && giroSybase.estado === 'INGRESADO') {
      acciones.push({
        tipo: 'reverso',
        orderNo: giroSybase.orderNo,
      });
    }
  }

  // En este punto ya tienes una lista de acciones que deberías procesar
  console.log("Acciones a ejecutar:", acciones);

  return {
    statusCode: 200,
    acciones,
    huboDiscrepancia: acciones.length > 0,
    tipoAccion: acciones.length > 0 ? acciones[0].tipo : null // puedes ajustar según caso
  };

};
