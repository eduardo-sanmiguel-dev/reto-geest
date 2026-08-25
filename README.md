# Reto Backend - Monorepo Local

Este repositorio contiene 3 proyectos:

- `api`: API principal (Node + Express + TypeScript + PostgreSQL)
- `ui`: frontend (Vite + React + TypeScript)
- `notification-api`: (Node + Express + TypeScript) microservicio receptor de notificaciones

## URL de pruebas

- ui: https://geest-prueba.com
- api: https://api.geest-prueba.com
- notify: https://notify.geest-prueba.com
- api docs: https://api.geest-prueba.com/docs
- Considerar que para probar la api con postman, deben de descargar la coleccion api/docs/geest.postman_collection.json apuntando a https://api.geest-prueba.com

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL en ejecucion para la API principal

## Instalacion

Desde la raiz del proyecto:

```bash
npm install
npm run install:all
```

Esto instala:

- Dependencias del orquestador raiz (incluye `concurrently`)
- Dependencias de `api`, `ui` y `notification-api`

## Levantar todo en modo desarrollo

Con un solo comando:

```bash
npm run dev
```

Este comando levanta en paralelo:

- API principal en `api`
- UI en `ui`
- Notification API en `notification-api`

## Variables de entorno

Configura los `.env` de cada proyecto antes de levantar:

- `api/.env`
- `ui/.env`
- `notification-api/.env`

Guiate por los README internos de cada carpeta para valores exactos.

## Otros comandos utiles en la raiz

```bash
npm run build
npm run test
```

- `build`: compila los 3 proyectos
- `test`: ejecuta pruebas de la API principal
