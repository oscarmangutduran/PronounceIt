# PronounceIt (Fullstack)

Estructura modular dividida en **client** (Frontend) y **server** (Backend).

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
