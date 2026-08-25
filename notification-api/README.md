# Notification API (Express + TypeScript)

Servicio receptor de notificaciones para GEEST.

Recibe eventos cuando una tarea se archiva, valida el body con Zod y escribe logs para trazabilidad.

## Stack

- Node.js + TypeScript
- Express 5
- Zod

## Variables de entorno

Crear archivo `.env`:

- PORT=4000

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Levantar en desarrollo:

```bash
npm run dev
```

3. Build:

```bash
npm run build
```

4. Ejecutar build:

```bash
npm run start
```

## Endpoints

- GET /health
- POST /notify

### Contrato de POST /notify

Body esperado:

```json
{
  "taskId": 1,
  "title": "Preparar reporte",
  "archivedAt": "2026-08-24T18:00:00.000Z"
}
```

Reglas de validacion:

- `taskId`: entero positivo
- `title`: string no vacio
- `archivedAt`: datetime ISO8601 con zona horaria

Respuesta exitosa:

```json
{
  "message": "Notificacion recibida y validada"
}
```

## Logs

En cada notificacion valida, el servicio imprime el payload recibido.

Ejemplo:

```text
[notification-api] payload recibido: { taskId: 1, title: '...', archivedAt: '...' }
```

## Integracion con API principal

En la carpeta `api`, configurar:

- NOTIFY_URL=http://localhost:4000/notify

Con eso, cuando una tarea se archiva completamente, la API principal intentara enviar la notificacion a este servicio.
