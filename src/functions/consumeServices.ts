// NO uses captureHTTPsGlobal
import * as AWSXRay from 'aws-xray-sdk-core';
import * as https from 'https';
import * as http from 'http';

// 👇 Usas esto en vez de captureHTTPsGlobal
const tracedHttps = AWSXRay.captureHTTPs(https);
const tracedHttp = AWSXRay.captureHTTPs(http);

// Luego axios
import axios, { AxiosRequestConfig } from "axios";



export async function consumeServices(event: any): Promise<any> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment("Hit inicia Lambda consumeServices");

  try {
    console.log("Evento recibido", event);

    if (!process.env.URL_API_PRUEBA) {
      throw new Error("La variable URL_API_PRUEBA no está definida.");
    }

    const httpsAgent = new tracedHttps.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
    });
    
    const headerParams = {
      "Content-Type": "application/json",
    };

    const request: AxiosRequestConfig = {
      httpsAgent,
      url: process.env.URL_API_PRUEBA,
      method: "GET", // CAMBIAMOS a GET
      headers: headerParams,
      timeout: 10000,
    };

    const response = await axios(request);

    console.log("Respuesta desde API local:", response.data);

    // Filtrar solo los de status 'P'
    const filteredData = (response.data || []).filter((item: any) => item.status === "P");

    return {
      statusCode: 200,
      body: filteredData,
    };

  } catch (err: any) {
    subsegment?.addError(err);
    console.error("Error al consumir servicio local:", err.message);

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
