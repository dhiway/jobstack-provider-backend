import { FastifyRequest, HTTPMethods } from 'fastify';

interface LogActivityOptions {
  message: Record<string, any> | string;
  methods: HTTPMethods[];
}

export function logActivity(
  request: FastifyRequest,
  options: LogActivityOptions
) {
  const flag = process.env.LOG_ACTIVITY;
  if (flag !== 'true') return null;

  const { message, methods } = options;
  if (methods.length === 0 || methods.includes(request.method)) {
    request.log.debug(message);
  }
}
