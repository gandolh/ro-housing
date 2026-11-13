import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify, { type FastifyInstance } from "fastify";
import { errors } from "../plugins/errors.ts";
import { shutdown } from "../plugins/shutdown.ts";

/**
 * One feature, or several, alone: a bare Fastify with the zod compilers and the error handler, the way
 * `buildApp` sets them, and no sign-in. The test registers the plugins it covers, each with its options,
 * and closes the app after.
 *
 *     const app = await testApp(async (app) => {
 *       await app.register(sourcesRoutes);
 *     });
 */
export async function testApp(register: (app: FastifyInstance) => unknown): Promise<FastifyInstance> {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(errors);
  await app.register(shutdown);
  await register(app);
  await app.ready();
  return app;
}
