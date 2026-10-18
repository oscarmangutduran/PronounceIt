# PronounceIt (Fullstack & Mobile Android)

Plataforma inteligente de aprendizaje y práctica de pronunciación en inglés con asignación gramatical automática, tests interactivos, flashcards y verbos irregulares.

[![Download Android APK](https://img.shields.io/badge/Download-Android%20APK%20(v1.6.4)-success?style=for-the-badge&logo=android)](https://github.com/oscarmangutduran/PronounceIt/releases/download/v1.6.4/PronounceIt-v1.6.4.apk)
[![Web Live](https://img.shields.io/badge/Web%20App-Online-blue?style=for-the-badge&logo=vercel)](https://pronounceit-sand.vercel.app)

---

## 📱 Descargar la App para Android (APK)

Puedes descargar la última versión de la aplicación para instalarla directamente en tu teléfono o tablet Android:

- **Descarga directa del APK:** [PronounceIt-v1.6.4.apk](https://github.com/oscarmangutduran/PronounceIt/releases/download/v1.6.4/PronounceIt-v1.6.4.apk)
- **GitHub Release Oficial:** [Release v1.6.4](https://github.com/oscarmangutduran/PronounceIt/releases/tag/v1.6.4)

---

## 📁 Estructura del Proyecto

```
PronounceIt/
├── client/                 # Frontend (React 19 + Vite + TypeScript + Tailwind)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── server/                 # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── package.json            # Orquestador del monorepo (npm workspaces)
└── README.md
```

## 🚀 Cómo Ejecutar

### 1. Instalar dependencias (en la raíz)
```bash
npm install
```

### 2. Ejecutar en modo desarrollo
- **Solo Frontend (cliente):**
  ```bash
  npm run dev:client
  # o: npm run dev
  ```
- **Solo Backend (servidor Express en http://localhost:5000):**
  ```bash
  npm run dev:server
  ```
- **Ambos a la vez (Fullstack concurrente):**
  ```bash
  npm run dev:all
  ```

### 3. Compilar
```bash
npm run build
```
