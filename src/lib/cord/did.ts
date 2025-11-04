import * as Cord from '@cord.network/sdk';
import { retryWithBackoff } from './utils';

export async function createDidForUser(account: any): Promise<string> {
  console.log(`📝 Creating DID for ${account.address}...`);
  
  // Try to create DID on-chain first
  // The DID module will load lazily when accessed
  try {
    return await retryWithBackoff(
      async () => {
        const api = Cord.ConfigService.get('api');
        if (!api) throw new Error('Cord API not initialized');
        
        // Check if tx module exists
        if (!api.tx) {
          throw new Error('Cord API tx module not available');
        }
        
        // Try to access the DID module - this will trigger lazy loading if available
        // If it doesn't exist, accessing it might throw or return undefined
        let didModule;
        try {
          didModule = api.tx.did;
        } catch (err) {
          // Module doesn't exist on this network
          console.log(`⚠️  DID pallet not available on this network. Using account address as DID identifier.`);
          return account.address;
        }
        
        // If module exists but doesn't have createFromAccount, check after a short wait
        if (!didModule || !didModule.createFromAccount) {
          // Wait a bit for lazy loading
          await new Promise((resolve) => setTimeout(resolve, 2000));
          didModule = api.tx.did;
          
          if (!didModule || !didModule.createFromAccount) {
            console.log(`⚠️  DID pallet createFromAccount not available. Using account address as DID identifier.`);
            return account.address;
          }
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

          didModule.createFromAccount(authKey).signAndSend(
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
  } catch (error: any) {
    // If DID creation fails for any reason, fall back to using account address
    const errorMsg = error?.message || 'Unknown error';
    console.log(`⚠️  DID creation failed, using account address as DID identifier: ${errorMsg}`);
    return account.address;
  }
}

