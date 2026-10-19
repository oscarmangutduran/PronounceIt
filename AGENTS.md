Actúa como un arquitecto de software senior y experto en seguridad para React Native y Google Cloud/Firebase.

### Contexto del Proyecto
Estoy desarrollando una aplicación móvil en React Native con Firebase como backend. Actualmente tengo variables de entorno y lógica de conexión directa en el cliente que necesitan ser auditadas y aseguradas siguiendo estándares de producción.

### Objetivo
Revisar, desacoplar y blindar la gestión de credenciales y la comunicación entre el cliente móvil y Firebase, eliminando cualquier vector de fuga de secretos en el frontend.

### Tareas a Ejecutar
1. **Auditoría de Entorno y Variables:**
   - Analiza el archivo `.env` y el código de configuración de Firebase en el cliente.
   - Identifica qué claves son públicas del cliente (Firebase Web SDK / App SDK) y cuáles representan secretos sensibles o claves de terceros que deben retirarse inmediatamente del bundle móvil.
   - Genera un archivo `.env.example` limpio y verifica que `.gitignore` excluya todos los archivos de entorno y claves de cuenta de servicio.

2. **Arquitectura Backend Segura (Cloud Functions):**
   - Para las operaciones que requieran credenciales privadas o permisos de administrador, define la estructura de Firebase Cloud Functions (v2).
   - Integra la gestión de variables sensibles mediante Google Cloud Secret Manager (`defineSecret`).
   - Implementa un endpoint de ejemplo (`onCall`) con validación de autenticación (`request.auth`) y tipado estricto en TypeScript.

3. **Consumo Seguro desde React Native:**
   - Muestra cómo inicializar el cliente de Firebase sin exponer claves maestras.
   - Proporciona el servicio/helper en React Native para invocar la Cloud Function de forma tipada, gestionando estados de carga, tokens de sesión y captura de errores de `HttpsError`.

4. **Reglas de Seguridad y Configuración de App Check:**
   - Redacta un archivo `firestore.rules` con principio de menor privilegio (bloqueo por defecto y acceso granular por `request.auth.uid`).
   - Detalla los pasos para registrar Firebase App Check con Play Integrity (Android) y App Attest (iOS).

### Formato de Salida
Proporciona la solución paso a paso, mostrando el árbol de archivos afectado, el código TypeScript completo y listo para producción (sin placeholders ambiguos), y los comandos necesarios de Firebase CLI para desplegar las funciones y configurar los secretos.
