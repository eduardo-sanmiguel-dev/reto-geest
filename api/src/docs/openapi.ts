export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "GEEST Work Management API",
    version: "1.0.0",
    description:
      "API REST para gestion de tareas, asignaciones, finalizacion por usuario, archivado automatico e idempotencia.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
      IdempotencyKey: {
        type: "apiKey",
        in: "header",
        name: "Idempotency-Key",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Healthcheck",
        responses: {
          "200": { description: "Service healthy" },
        },
      },
    },
    "/users": {
      post: {
        summary: "Create user",
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "lastName", "email"],
                properties: {
                  name: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        summary: "List users with pending tasks",
        responses: { "200": { description: "OK" } },
      },
    },
    "/users/{idUser}/tasks": {
      get: {
        summary: "List tasks assigned to a user",
        parameters: [
          {
            name: "idUser",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not found" },
        },
      },
    },
    "/tasks": {
      post: {
        summary: "Create task",
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
          "400": { description: "Validation error" },
        },
      },
      get: {
        summary: "List tasks",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["open", "archived"] },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/tasks/{idTask}": {
      get: {
        summary: "Get task detail",
        parameters: [
          {
            name: "idTask",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not found" },
        },
      },
    },
    "/tasks/{idTask}/assign": {
      post: {
        summary: "Assign users to task",
        parameters: [
          {
            name: "idTask",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userIds"],
                properties: {
                  userIds: {
                    type: "array",
                    items: { type: "integer" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not found" },
        },
      },
    },
    "/tasks/{idTask}/complete": {
      post: {
        summary: "Complete user part in task",
        parameters: [
          {
            name: "idTask",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK" },
          "400": { description: "Validation error" },
          "404": { description: "Not found" },
        },
      },
    },
    "/tasks/{idTask}/notifications": {
      get: {
        summary: "List notification attempts",
        parameters: [
          {
            name: "idTask",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "OK" },
          "404": { description: "Not found" },
        },
      },
    },
  },
} as const;
