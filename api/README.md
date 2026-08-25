# GEEST API (Node.js + TypeScript)

API REST para gestion de trabajo empresarial, construida con Express, TypeORM, PostgreSQL y Zod.

## Stack

- Node.js + TypeScript
- Express 5
- PostgreSQL
- TypeORM
- Zod (validacion)
- Scalar (documentacion OpenAPI)
- Jest + Supertest (tests)

## Variables de entorno

Crear archivo `.env` a partir de `.env.example`:

- NODE_ENV=development
- PORT=3000
- API_KEY=123
- NOTIFY_URL=http://localhost:4000/notify
- DB_HOST=127.0.0.1
- DB_PORT=5432
- DB_USERNAME=postgres
- DB_PASSWORD=123
- DB_NAME=geest_dev

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en desarrollo:

```bash
npm run dev
```

3. Build de produccion:

```bash
npm run build
```

4. Ejecutar build:

```bash
npm run start
```

## Comando de tests

```bash
npm test
```

## Comandos de base de datos

- Ejecutar migraciones pendientes:

```bash
npm run db:migrate
```

- Restaurar estructura completa (reset de schema + migraciones):

```bash
npm run db:reset
```

## Seguridad

Las rutas de negocio requieren header:

- x-api-key: 123

Si falta o es invalido, responde 401.

Rutas publicas sin api-key:

- /docs
- /docs/\*
- /favicon.ico
- /.well-known/\*

## Paginacion en listados

Se agrego paginacion en:

- GET /users
- GET /tasks
- GET /users/:idUser/tasks
- GET /tasks/:idTask/notifications

Query params disponibles:

- page (default: 1)
- limit (default: 10, max: 100)

Formato de respuesta paginada:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

`GET /users/:idUser/tasks` mantiene el bloque `user` y agrega `pagination` al lado de `tasks`.

## Idempotencia y confiabilidad

Todos los endpoints POST requieren header:

- Idempotency-Key: valor-unico

Comportamiento implementado:

- Mismo Idempotency-Key + mismo body + misma ruta/metodo: una sola ejecucion real y respuestas identicas.
- Mismo Idempotency-Key + body distinto: error 409.
- Soporta requests duplicados en paralelo.
- Completar tareas en concurrencia no duplica archivado.
- Notificacion al archivar se envia exactamente una vez.
- Reintentos de notificacion: hasta 3 intentos con backoff exponencial ante 5xx o timeout.
- Intentos registrados y consultables en GET /tasks/:idTask/notifications.

## Logging

La API agrega logging estructurado en JSON con:

- `requestId` por request (acepta `x-request-id` externo o genera UUID)
- metodo, path, status, tiempo de respuesta y content-length
- errores de negocio y errores inesperados con contexto de request

Esto facilita trazabilidad y correlacion de incidencias en desarrollo y produccion.

## Endpoints requeridos

- POST /users
- POST /tasks
- POST /tasks/:idTask/assign
- POST /tasks/:idTask/complete
- GET /tasks
- GET /users
- GET /users/:idUser/tasks
- GET /tasks/:idTask
- GET /tasks/:idTask/notifications

Errores centralizados con formato:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

## Documentacion API

- Scalar UI: /docs
- Coleccion Postman: docs/geest.postman_collection.json

## Notification API

Para la funcionalidad de archivado con notificacion, levantar el servicio en `../notification-api` y configurar `NOTIFY_URL`.

## Esquema SQL y UML

- Migracion versionada: src/database/migrations/1724500000000-InitialSchema.ts
- Script SQL: docs/schema.sql
- UML (Mermaid ER): docs/uml.mmd

## Mejora extra implementada

Se agrego GET /health (protegido por x-api-key) con chequeo real de base de datos.

Problema que resuelve:

- Permite monitorear disponibilidad de la API y conectividad con PostgreSQL en runtime.

## Supuestos realizados

- Idempotency-Key es obligatorio para todos los POST.
- Si se reusa un Idempotency-Key con payload distinto, se rechaza con 409.
- En notificaciones, respuestas 4xx no se reintentan.
