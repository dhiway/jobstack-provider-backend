import * as Cord from '@cord.network/sdk';
import { CordLogger, getCordLogger } from './logger';

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    errorMessage?: string;
    logger?: CordLogger;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    errorMessage = 'Operation failed after retries',
    logger = getCordLogger(),
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new Error(
          `${errorMessage}: ${error.message || error}`
        );
      }

      logger.debug(
        { attempt: attempt + 1, maxRetries, delay },
        `⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError || new Error(errorMessage);
}

/**
 * Wait for CORD API to be ready
 */
export async function waitForCordApi(
  maxWaitTime: number = 30000,
  checkInterval: number = 1000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const api = Cord.ConfigService.get('api');
    if (api && api.tx && api.tx.did) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
  
  throw new Error('CORD API not ready after waiting');
}

