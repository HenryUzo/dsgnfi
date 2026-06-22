declare module "openai/helpers/zod" {
  import type { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses";
  import type { z } from "zod";

  export function zodTextFormat(
    zodObject: z.ZodTypeAny,
    name: string,
    props?: Record<string, unknown>,
  ): ResponseFormatTextJSONSchemaConfig;
}
