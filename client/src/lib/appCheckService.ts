import { FirebaseApp } from 'firebase/app';

/**
 * Servicio de inicialización de Firebase App Check
 * Protege los recursos de backend (Cloud Functions, Firestore, Cloud Storage)
 * asegurando que las peticiones provienen exclusivamente de tu app genuina
 * (Play Integrity en Android y DeviceCheck / App Attest en iOS).
 */

export interface AppCheckConfig {
  debugToken?: string;
  isDevelopment?: boolean;
}

/**
 * Inicializa App Check en el entorno Web o React Native Web
 */
export async function initializeClientAppCheck(app: FirebaseApp, config: AppCheckConfig = {}): Promise<void> {
  // Evitar ejecución en entornos sin navegador (SSR o testing)
  if (typeof window === 'undefined') return;

  try {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } = await import('firebase/app-check');

    // Configuración de Token de Depuración para entornos de desarrollo/emulador
    if (config.isDevelopment || process.env.NODE_ENV === 'development') {
      // Activa el modo debug en la consola para obtener el debug token
      // y registrarlo en Firebase Console > App Check > Apps > Manage debug tokens
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = config.debugToken || true;
      console.info('[AppCheck] Modo depuración activado.');
    }

    // Proveedor web con ReCaptcha Enterprise o Custom Provider
    const siteKey = (process.env as any).VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Clave de test o configurada

    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    console.info('[AppCheck] Inicializado correctamente en el cliente web.');
  } catch (err) {
    console.warn('[AppCheck] Advertencia al inicializar App Check:', err);
  }
}

/**
 * GUÍA DE CONFIGURACIÓN NATIVA PARA REACT NATIVE (ANDROID / IOS)
 * 
 * Para builds nativos (Expo prebuild / React Native CLI), se utiliza @react-native-firebase/app-check:
 * 
 * 1. Instalar la librería:
 *    npx expo install @react-native-firebase/app-check @react-native-firebase/app
 * 
 * 2. En el punto de entrada de la aplicación móvil (App.tsx / index.js):
 * 
 * ```typescript
 * import appCheck from '@react-native-firebase/app-check';
 * 
 * async function setupAppCheck() {
 *   const rnAppCheck = appCheck();
 *   
 *   // Proveedor para Play Integrity (Android) y App Attest (iOS)
 *   const defaultProvider = rnAppCheck.newReactNativeFirebaseAppCheckProvider();
 *   defaultProvider.configure({
 *     android: {
 *       provider: __DEV__ ? 'debug' : 'playIntegrity',
 *       debugToken: 'YOUR_DEBUG_TOKEN_REGISTERED_IN_FIREBASE_CONSOLE',
 *     },
 *     apple: {
 *       provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
 *       debugToken: 'YOUR_DEBUG_TOKEN_REGISTERED_IN_FIREBASE_CONSOLE',
 *     },
 *   });
 * 
 *   await rnAppCheck.initializeAppCheck({
 *     provider: defaultProvider,
 *     isTokenAutoRefreshEnabled: true,
 *   });
 * }
 * ```
 */
