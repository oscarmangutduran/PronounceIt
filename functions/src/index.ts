import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { EnrichWordRequest, EnrichWordResponse, DeleteUserAccountRequest, DeleteUserAccountResponse } from './types';

// Inicialización de Firebase Admin SDK con privilegios del entorno del servidor
initializeApp();
const db = getFirestore();
const auth = getAuth();

// ==============================================================================
// 1. GESTIÓN DE SECRETOS MEDIANTE GOOGLE CLOUD SECRET MANAGER
// ==============================================================================
// El secreto nunca se expone en código ni en el bundle del cliente.
// Se inyecta en tiempo de ejecución solo a las funciones autorizadas.
export const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ==============================================================================
// 2. ENDPOINT SEGURO: ENRIQUECIMIENTO DE VOCABULARIO CON GEMINI AI
// ==============================================================================
export const enrichVocabularyWithAi = onCall<EnrichWordRequest, Promise<EnrichWordResponse>>(
  {
    region: 'us-central1',
    secrets: [geminiApiKey],
    // Activa 'enforceAppCheck: true' cuando Play Integrity / App Attest estén registrados
    enforceAppCheck: false,
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    // A. Verificación estricta de autenticación
    if (!request.auth) {
      logger.warn('[Security] Intento de invocación no autenticado a enrichVocabularyWithAi', {
        rawRequestIp: request.rawRequest.ip,
      });
      throw new HttpsError(
        'unauthenticated',
        'Debes iniciar sesión para utilizar las funciones de enriquecimiento por IA.'
      );
    }

    const uid = request.auth.uid;
    const { word, targetLanguage: _targetLanguage = 'es' } = request.data || {};

    // B. Validación y saneamiento de entradas
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'El parámetro "word" es obligatorio y debe ser una cadena válida.');
    }

    const cleanWord = word.trim().slice(0, 80); // Limitar longitud para evitar abusos

    // C. Obtención segura del secreto
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      logger.error('[Config] La clave GEMINI_API_KEY no está configurada en Secret Manager');
      throw new HttpsError('failed-precondition', 'El servicio de IA no está configurado en el servidor.');
    }

    logger.info(`[AI Service] Procesando palabra "${cleanWord}" solicitada por el usuario ${uid}`);

    // D. Invocación a Gemini API REST con formato estructurado
    const prompt = `Actúa como un lingüista y profesor de inglés para hispanohablantes.
Analiza la siguiente palabra o frase en inglés: "${cleanWord}".
Proporciona la respuesta en formato JSON estrictamente válido, sin bloques de markdown adicionales (sin \`\`\`json ni texto extra), con las siguientes propiedades:
{
  "word": "${cleanWord}",
  "phoneticIpa": "Transcripción fonética IPA precisa (ej: /ˈwɔːtər/)",
  "translation": "Traducción más común al español",
  "partOfSpeech": "sustantivo | verbo | adjetivo | adverbio | modismo",
  "exampleEn": "Frase de ejemplo natural en inglés",
  "exampleEs": "Traducción de la frase de ejemplo al español",
  "pronunciationTips": ["Consejo clave 1 enfocado en errores comunes de hispanohablantes", "Consejo 2"],
  "difficulty": "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Gemini API Error]', { status: response.status, errorText });
        if (response.status === 429) {
          throw new HttpsError('resource-exhausted', 'Cuota de IA excedida. Inténtalo de nuevo en unos minutos.');
        }
        throw new HttpsError('internal', 'Error al comunicarse con el modelo de IA.');
      }

      const jsonResult = await response.json();
      const rawText = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new HttpsError('internal', 'Respuesta vacía recibida del proveedor de IA.');
      }

      const parsedData = JSON.parse(rawText);

      return {
        word: parsedData.word || cleanWord,
        phoneticIpa: parsedData.phoneticIpa || '',
        translation: parsedData.translation || '',
        partOfSpeech: parsedData.partOfSpeech || 'general',
        exampleEn: parsedData.exampleEn || '',
        exampleEs: parsedData.exampleEs || '',
        pronunciationTips: Array.isArray(parsedData.pronunciationTips) ? parsedData.pronunciationTips : [],
        difficulty: parsedData.difficulty || 'B1',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err instanceof HttpsError) {
        throw err;
      }
      logger.error('[Execution Error] Fallo al procesar IA:', err);
      throw new HttpsError('internal', 'Fallo interno al procesar el enriquecimiento de vocabulario.');
    }
  }
);

// ==============================================================================
// 3. ENDPOINT ADMINISTRATIVO: ELIMINACIÓN DE CUENTA DE USUARIO
// ==============================================================================
// Demuestra ejecución de privilegios administrativos sin exponer credenciales
// del Admin SDK en el cliente.
export const deleteUserAccount = onCall<DeleteUserAccountRequest, Promise<DeleteUserAccountResponse>>(
  {
    region: 'us-central1',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta operación.');
    }

    const { confirmation } = request.data || {};
    if (!confirmation) {
      throw new HttpsError('invalid-argument', 'Debes confirmar expresamente la eliminación de la cuenta.');
    }

    const uid = request.auth.uid;
    logger.info(`[Account] Solicitud de eliminación para el UID: ${uid}`);

    try {
      // 1. Eliminar datos del usuario en Firestore (subcolecciones y documento)
      const userRef = db.collection('users').doc(uid);
      const subcollections = await userRef.listCollections();
      for (const subcol of subcollections) {
        const docs = await subcol.listDocuments();
        const batch = db.batch();
        docs.forEach((docSnap) => batch.delete(docSnap));
        await batch.commit();
      }
      await userRef.delete();

      // 2. Eliminar cuenta de autenticación en Firebase Auth
      await auth.deleteUser(uid);

      return {
        success: true,
        message: 'Cuenta y datos asociados eliminados exitosamente.',
        deletedUid: uid,
      };
    } catch (error: any) {
      logger.error(`[Account Delete Error] Fallo al eliminar usuario ${uid}:`, error);
      throw new HttpsError('internal', 'No se pudo completar la eliminación de la cuenta.');
    }
  }
);
