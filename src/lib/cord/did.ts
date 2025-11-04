import * as Cord from '@cord.network/sdk';
import { retryWithBackoff } from './utils';

/**
 * Check if DID module is available
 */
function isDidModuleAvailable(): boolean {
  try {
    const api = Cord.ConfigService.get('api');
    return !!(api && api.tx && api.tx.did && api.tx.did.createFromAccount);
  } catch {
    return false;
  }
}

/**
 * Wait for DID module to be available (it may load lazily)
 * Returns true if available, false if timeout
 */
async function waitForDidModule(maxWaitTime: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 1000;
  
  while (Date.now() - startTime < maxWaitTime) {
    if (isDidModuleAvailable()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
  
  return false;
}

export async function createDidForUser(account: any): Promise<string> {
  console.log(`📝 Creating DID for ${account.address}...`);
  
  // Check if DID module is available
  const didModuleAvailable = await waitForDidModule(30000);
  
  if (!didModuleAvailable) {
    console.log(`⚠️  DID pallet not available on this network. Using account address as DID identifier.`);
    // In CORD, the DID identifier is derived from the account address
    // If DID pallet isn't available, we can still use the address as identifier
    return account.address;
  }
  
  // Try to create DID on-chain
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      
      if (!api.tx || !api.tx.did) {
        throw new Error('Cord API tx.did module not available');
      }

      // Get authentication key from account
      const authKey = {
        publicKey: account.publicKey,
        keyType: 'sr25519' as const,
      };

      // Create DID using create_from_account
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('DID creation timeout after 60s'));
        }, 60000);

        api.tx.did.createFromAccount(authKey).signAndSend(
          account,
          ({ status, events, isError }) => {
            if (isError) {
              clearTimeout(timeout);
              reject(new Error('DID creation transaction failed'));
              return;
            }
            if (status.isInBlock) {
              console.log(`✅ DID created in block: ${status.asInBlock}`);
            } else if (status.isFinalized) {
              clearTimeout(timeout);
              console.log(`✅ DID creation finalized: ${status.asFinalized}`);
              resolve();
            }
          }
        ).catch((err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // DID identifier is derived from account address
      const didIdentifier = account.address;
      console.log(`✅ DID created: ${didIdentifier}`);
      
      return didIdentifier;
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'DID creation failed',
    }
  );
}

