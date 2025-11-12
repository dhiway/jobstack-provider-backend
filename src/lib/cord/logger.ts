/**
 * Logger utility for CORD operations
 * Provides a logger interface compatible with Fastify logger
 * Falls back to console if no logger is provided
 */

export interface CordLogger {
  error: (obj: any, msg?: string) => void;
  info: (obj: any, msg?: string) => void;
  debug: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
}

// Default logger using console as fallback
const defaultLogger: CordLogger = {
  error: (obj: any, msg?: string) => {
    if (msg) {
      console.error(`[CORD] ${msg}`, obj);
    } else {
      console.error('[CORD]', obj);
    }
  },
  info: (obj: any, msg?: string) => {
    if (msg) {
      console.log(`[CORD] ${msg}`, obj);
    } else {
      console.log('[CORD]', obj);
    }
  },
  debug: (obj: any, msg?: string) => {
    if (msg) {
      console.log(`[CORD] ${msg}`, obj);
    } else {
      console.log('[CORD]', obj);
    }
  },
  warn: (obj: any, msg?: string) => {
    if (msg) {
      console.warn(`[CORD] ${msg}`, obj);
    } else {
      console.warn('[CORD]', obj);
    }
  },
};

// Global logger instance (can be set from server.ts)
let globalLogger: CordLogger | null = null;

/**
 * Set the global logger instance (called from server.ts)
 */
export function setCordLogger(logger: CordLogger): void {
  globalLogger = logger;
}

/**
 * Get the logger instance
 * Returns the global logger if set, otherwise returns default console logger
 */
export function getCordLogger(): CordLogger {
  return globalLogger || defaultLogger;
}

/**
 * Create a logger from Fastify logger instance
 */
export function createLoggerFromFastify(fastifyLogger: any): CordLogger {
  return {
    error: (obj: any, msg?: string) => {
      if (msg) {
        fastifyLogger.error(obj, msg);
      } else {
        fastifyLogger.error(obj);
      }
    },
    info: (obj: any, msg?: string) => {
      if (msg) {
        fastifyLogger.info(obj, msg);
      } else {
        fastifyLogger.info(obj);
      }
    },
    debug: (obj: any, msg?: string) => {
      if (msg) {
        fastifyLogger.debug(obj, msg);
      } else {
        fastifyLogger.debug(obj);
      }
    },
    warn: (obj: any, msg?: string) => {
      if (msg) {
        fastifyLogger.warn(obj, msg);
      } else {
        fastifyLogger.warn(obj);
      }
    },
  };
}

