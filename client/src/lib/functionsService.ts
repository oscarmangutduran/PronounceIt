import { getFunctions, httpsCallable, HttpsError, Functions } from 'firebase/functions';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Contrato de tipos para la función de enriquecimiento por IA
 */
export interface EnrichWordRequest {
  word: string;
  targetLanguage?: 'es' | 'en';
}

export interface EnrichWordResponse {
  word: string;
  phoneticIpa: string;
  translation: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleEs: string;
  pronunciationTips: string[];
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  timestamp: string;
}

export interface CloudFunctionResult<T> {
  data: T | null;
  error: string | null;
  errorCode: string | null;
  loading: boolean;
}

/**
 * Obtiene o inicializa la instancia de Firebase Functions de forma segura.
 * Usa exclusivamente las credenciales públicas del cliente.
 */
let cachedFunctions: Functions | null = null;

export function getSafeFunctionsInstance(): Functions {
  if (cachedFunctions) return cachedFunctions;

  let app;
  if (getApps().length > 0) {
    app = getApp();
  } else {
    // Fallback seguro usando variables públicas de entorno
    app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (process.env as any).VITE_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || (process.env as any).VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || (process.env as any).VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || (process.env as any).VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || (process.env as any).VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || (process.env as any).VITE_FIREBASE_APP_ID,
    });
  }

  // Región estándar donde se despliegan las funciones v2
  cachedFunctions = getFunctions(app, 'us-central1');
  return cachedFunctions;
}

/**
 * Mapeo exhaustivo y seguro de errores de Firebase HttpsError a mensajes comprensibles
 */
export function formatHttpsErrorMessage(error: any): { message: string; code: string } {
  if (error && typeof error === 'object' && 'code' in error) {
    const httpsError = error as HttpsError;
    const code = httpsError.code;

    switch (code) {
      case 'unauthenticated':
        return {
          code,
          message: 'Tu sesión ha expirado o no has iniciado sesión. Por favor, autentícate nuevamente.',
        };
      case 'permission-denied':
        return {
          code,
          message: 'No tienes los permisos requeridos para ejecutar esta acción.',
        };
      case 'invalid-argument':
        return {
          code,
          message: httpsError.message || 'Los datos proporcionados no son válidos.',
        };
      case 'resource-exhausted':
        return {
          code,
          message: 'Límite de peticiones de IA excedido temporalmente. Espera unos minutos.',
        };
      case 'failed-precondition':
        return {
          code,
          message: httpsError.message || 'La operación no cumple las condiciones previas del sistema.',
        };
      case 'unavailable':
        return {
          code,
          message: 'El servicio de backend no está disponible en este momento. Revisa tu conexión.',
        };
      case 'deadline-exceeded':
        return {
          code,
          message: 'El servidor tardó demasiado en responder. Inténtalo nuevamente.',
        };
      default:
        return {
          code: code || 'unknown',
          message: httpsError.message || 'Ocurrió un error inesperado al consultar el backend.',
        };
    }
  }

  return {
    code: 'unknown',
    message: error?.message || 'Error de comunicación con el servicio en la nube.',
  };
}

/**
 * Invocador tipado genérico para cualquier Cloud Function (Callable v2).
 * Gestiona automáticamente el token de autenticación del usuario actual
 * y el token de App Check si está habilitado.
 */
export async function callCloudFunction<TRequest, TResponse>(
  functionName: string,
  payload: TRequest
): Promise<TResponse> {
  const functions = getSafeFunctionsInstance();
  const auth = getAuth();

  // Verificación preliminar de sesión en el cliente
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión para invocar funciones protegidas.');
  }

  try {
    const callable = httpsCallable<TRequest, TResponse>(functions, functionName);
    const result = await callable(payload);
    return result.data;
  } catch (error: any) {
    const formatted = formatHttpsErrorMessage(error);
    console.error(`[CloudFunction:${functionName}] Error:`, formatted.code, formatted.message);
    throw new Error(`[${formatted.code}] ${formatted.message}`);
  }
}

/**
 * Función especializada de alto nivel para enriquecer vocabulario mediante IA
 * sin exponer jamás la API Key de Gemini en el bundle de React Native.
 */
export async function enrichVocabularySecurely(word: string): Promise<EnrichWordResponse> {
  return await callCloudFunction<EnrichWordRequest, EnrichWordResponse>(
    'enrichVocabularyWithAi',
    { word, targetLanguage: 'es' }
  );
}
