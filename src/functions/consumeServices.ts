// NO uses captureHTTPsGlobal
import * as AWSXRay from 'aws-xray-sdk-core';
import * as https from 'https';
import * as http from 'http';
import axios, { AxiosRequestConfig } from "axios";

const tracedHttps = AWSXRay.captureHTTPs(https);
const tracedHttp = AWSXRay.captureHTTPs(http);

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function getRandomDelay() {
  const base = 100;
  const factor = Math.pow(2, Math.floor(Math.random() * 5));
  return base * factor + Math.floor(Math.random() * base);
}

export async function consumeServices(event: any): Promise<any> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment("Lambda: consumeServices");

  try {
    await delay(getRandomDelay());

    const orderNo = event?.orderNo;
    if (!orderNo) {
      throw new Error("No se proporcionó 'orderNo' en el evento.");
    }

    const baseUrl = process.env.URL_API_PRUEBA;
    if (!baseUrl) {
      throw new Error("La variable de entorno URL_API_PRUEBA no está definida.");
    }

    const finalUrl = `${baseUrl}?codeTransferencia=${encodeURIComponent(orderNo)}`;
    console.log(`[consumeServices] GET → ${finalUrl}`);

    // Agent para conexiones HTTPS con certificados no confiables (solo para DEV)
    const httpsAgent = new tracedHttps.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
    });

    const request: AxiosRequestConfig = {
      url: finalUrl,
      method: "GET",
      httpsAgent,
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 10000
    };

    const response = await axios(request);
    const data = response.data;

    console.log(`[consumeServices] response:`, data);

    if (!data || Object.keys(data).length === 0) {
      // ✅ No hay datos encontrados en Sybase
      return {
        statusCode: 404,
        body: {
          message: `No se encontró información para orderNo: ${orderNo}`
        }
      };
    }

    return data;

  } catch (err: any) {
    subsegment?.addError(err);
    console.error("[consumeServices] Error:", err.message);

    return {
      statusCode: err.response?.status || 500,
      body: {
        message: "Error al consumir el servicio",
        details: err.message
      }
    };
  } finally {
    subsegment?.close();
  }
}
