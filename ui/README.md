# GEEST UI (Vite + React + TypeScript)

Interfaz web para operar la API GEEST: crear usuarios y tareas, asignar usuarios, completar tareas por usuario y revisar notificaciones.

## Stack

- Vite
- React + TypeScript
- Axios

## Variables de entorno

Crear archivo `.env` en esta carpeta:

- VITE_API_BASE_URL=http://localhost:3000
- VITE_API_KEY=123

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Levantar en desarrollo:

```bash
npm run dev
```

3. Build de produccion:

```bash
npm run build
```

4. Previsualizar build:

```bash
npm run preview
```

## Funcionalidades

- Crear usuario
- Crear tarea
- Asignar usuarios a una tarea
- Completar tarea por usuario
- Ver detalle de tarea
- Ver intentos de notificacion
- Filtro de tareas por estado
- Paginacion de listados

## Paginacion en UI

La UI consume paginacion server-side en:

- Listado de usuarios
- Listado de tareas
- Tareas del usuario seleccionado
- Intentos de notificacion de la tarea seleccionada

Cada bloque usa botones `Anterior` y `Siguiente` y muestra `pagina`, `totalPages` y `total`.

## Dependencias de backend

Para que la UI funcione correctamente:

1. Levantar `api` en `http://localhost:3000` (o ajustar `VITE_API_BASE_URL`).
2. Incluir el mismo valor de `x-api-key` en `VITE_API_KEY`.
3. Para probar flujo completo de archivado con notificaciones, levantar tambien `notification-api`.
