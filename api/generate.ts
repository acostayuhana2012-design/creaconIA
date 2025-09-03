// Nota: Este archivo está diseñado para ejecutarse en un entorno de servidor (como Vercel o Netlify), no en el navegador.

import { GoogleGenAI, Type } from "@google/genai";
import type { Slide } from '../types';

// La firma de esta función (req, res) es un patrón común en entornos de servidor como Node.js.
// Representa la solicitud entrante (request) y la respuesta que enviaremos (response).
export default async function handler(req: Request, res: Response) {
  // Solo permitimos solicitudes POST a este endpoint.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const text = body.text;

    if (!text) {
      return new Response(JSON.stringify({ message: 'El contenido de texto es requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // --- LÓGICA DE GEMINI MOVIDA AQUÍ ---
    // Esta es la misma lógica que estaba en geminiService.ts, pero ahora se ejecuta de forma segura en el servidor.
    
    const MODEL_NAME = 'gemini-2.5-flash';

    if (!process.env.API_KEY) {
      console.error("La variable de entorno API_KEY no está configurada en el servidor.");
      return new Response(JSON.stringify({ message: 'Error de configuración en el servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Eres un experto diseñador instruccional y creador de presentaciones. Tu tarea es convertir el siguiente texto extraído de un documento en una presentación de diapositivas clara, concisa y atractiva.

    Reglas:
    1.  Cada diapositiva debe tener un título claro y descriptivo.
    2.  El contenido de cada diapositiva debe ser una lista de viñetas (bullet points) que resuman los puntos clave. Usa frases cortas.
    3.  Crea "notas del orador" para cada diapositiva. Estas notas deben proporcionar un contexto más profundo, explicaciones o puntos de conversación para el presentador. Deben ser conversacionales.
    4.  Analiza el texto completo y estructura la presentación de manera lógica. Comienza con una introducción, desarrolla los puntos principales y termina con una conclusión o resumen.
    5.  No crees más de 10-12 diapositivas para mantener la presentación enfocada.
    6.  El idioma de la presentación debe ser el mismo que el del texto proporcionado.

    Aquí está el texto del documento:
    ---
    ${text}
    ---
    `;

    const geminiResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    slides: {
                        type: Type.ARRAY,
                        description: "El conjunto de diapositivas de la presentación.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: 'El título de la diapositiva.' },
                                content: { type: Type.ARRAY, description: 'Una lista de viñetas (bullet points) para el contenido de la diapositiva.', items: { type: Type.STRING } },
                                speakerNotes: { type: Type.STRING, description: 'Notas detalladas para el orador sobre el contenido de la diapositiva.' }
                            },
                            required: ["title", "content", "speakerNotes"]
                        }
                    }
                },
                required: ["slides"]
            },
        },
    });
    
    const jsonText = geminiResponse.text.trim();
    const result = JSON.parse(jsonText);

    if (result && result.slides) {
      // Si todo va bien, enviamos las diapositivas de vuelta al frontend.
      return new Response(JSON.stringify({ slides: result.slides }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error("La IA devolvió un formato de datos inesperado.");
    }
    
  } catch (error: any) {
    console.error("Error en la función API:", error);
    return new Response(JSON.stringify({ message: error.message || 'No se pudo generar la presentación.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}