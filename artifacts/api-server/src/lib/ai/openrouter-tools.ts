import {
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Schema,
} from "@google/generative-ai";

export type OpenRouterTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

function geminiSchemaToJsonSchema(
  schema: Schema | FunctionDeclarationSchema | undefined,
): Record<string, unknown> {
  if (!schema?.type) {
    return { type: "object", properties: {} };
  }

  switch (schema.type) {
    case SchemaType.STRING:
      return {
        type: "string",
        ...(schema.description ? { description: schema.description } : {}),
      };
    case SchemaType.NUMBER:
      return {
        type: "number",
        ...(schema.description ? { description: schema.description } : {}),
      };
    case SchemaType.INTEGER:
      return {
        type: "integer",
        ...(schema.description ? { description: schema.description } : {}),
      };
    case SchemaType.BOOLEAN:
      return {
        type: "boolean",
        ...(schema.description ? { description: schema.description } : {}),
      };
    case SchemaType.ARRAY:
      return {
        type: "array",
        items: geminiSchemaToJsonSchema((schema as Schema & { items?: Schema }).items),
        ...(schema.description ? { description: schema.description } : {}),
      };
    case SchemaType.OBJECT:
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(schema.properties ?? {}).map(([key, value]) => [
            key,
            geminiSchemaToJsonSchema(value as Schema),
          ]),
        ),
        ...(schema.required?.length ? { required: schema.required } : {}),
        ...(schema.description ? { description: schema.description } : {}),
      };
    default:
      return { type: "object", properties: {} };
  }
}

export function toOpenRouterTools(declarations: FunctionDeclaration[]): OpenRouterTool[] {
  return declarations.map((declaration) => ({
    type: "function",
    function: {
      name: declaration.name ?? "unknown",
      description: declaration.description,
      parameters: geminiSchemaToJsonSchema(declaration.parameters),
    },
  }));
}
