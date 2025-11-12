import * as Cord from '@cord.network/sdk';
import { createAccount } from '@cord.network/vc-export';
import { computeEntryDokenId } from 'doken-precomputer';
import { retryWithBackoff } from './utils';
import { CordLogger, getCordLogger } from './logger';

export interface EntryResult {
  entryId: string;
  txHash: string;
}

/**
 * Create a registry entry for a job posting
 * Uses api.tx.entry.create() directly as per CORD pallet API
 */
export async function createEntryOnChain(
  mnemonic: string,
  registryId: string,
  jobPostingData: {
    id: string;
    title: string;
    status: string;
    organizationId: string;
    organizationName: string;
    description?: string | null;
    metadata?: any;
    location?: any;
    contact?: any;
  },
  logger?: CordLogger
): Promise<EntryResult> {
  const log = logger || getCordLogger();
  log.debug({ jobPostingId: jobPostingData.id }, `📝 Creating entry for job posting ${jobPostingData.id}...`);
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      if (!api.tx || !api.tx.entry) {
        throw new Error('Entry pallet not available on this network');
      }

      const { account } = createAccount(mnemonic);
      if (!account) {
        throw new Error('Invalid account');
      }

      // Create entry blob/data
      const entryBlob = {
        jobPostingId: jobPostingData.id,
        title: jobPostingData.title,
        status: jobPostingData.status,
        organizationId: jobPostingData.organizationId,
        organizationName: jobPostingData.organizationName,
        description: jobPostingData.description || null,
        metadata: jobPostingData.metadata || {},
        location: jobPostingData.location || {},
        contact: jobPostingData.contact || {},
        createdAt: new Date().toISOString(),
      };

      const entryStringifiedBlob = JSON.stringify(entryBlob);
      
      // Get digest/hash for the entry
      const entryTxHash = await Cord.Registry.getDigestFromRawData(
        entryStringifiedBlob
      );

      // Create entry using direct API call: api.tx.entry.create(registry_id, tx_hash, blob)
      // The entry ID will be computed on-chain and emitted in events
      let entryDokenId: string | null = null;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Entry creation timeout after 60s'));
        }, 60000);

        api.tx.entry
          .create(registryId, entryTxHash, null) // registry_id, tx_hash, blob (null)
          .signAndSend(account, ({ status, events, isError }: any) => {
            if (isError) {
              clearTimeout(timeout);
              reject(new Error('Entry creation transaction failed'));
              return;
            }
            
            // Extract entry ID from events
            if (events) {
              events.forEach((record: any) => {
                const { event } = record;
                if (event && event.section === 'entry' && event.method === 'RegistryEntryCreated') {
                  // Event data: [creator, registry_id, registry_entry_id, creator_profile_id]
                  entryDokenId = event.data[2]?.toString() || null;
                }
              });
            }
            
            if (status.isInBlock) {
              log.debug({ jobPostingId: jobPostingData.id, block: status.asInBlock }, `✅ Entry created in block: ${status.asInBlock}`);
            } else if (status.isFinalized) {
              clearTimeout(timeout);
              log.debug({ jobPostingId: jobPostingData.id, block: status.asFinalized }, `✅ Entry creation finalized: ${status.asFinalized}`);
              resolve();
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      // If entry ID wasn't found in events, compute it manually
      if (!entryDokenId) {
        try {
          const profileId = await computeProfileIdFromAccount(api, account.address);
          entryDokenId = await computeEntryDokenId(
            api,
            entryTxHash,
            registryId,
            profileId
          );
        } catch (error) {
          // Fallback: use registry computation
          const { computeRegistryDokenId } = await import('doken-precomputer');
          entryDokenId = await computeRegistryDokenId(api, entryTxHash, account.address);
        }
      }

      if (!entryDokenId) {
        throw new Error('Failed to determine entry ID');
      }

      log.info({ jobPostingId: jobPostingData.id, entryId: entryDokenId }, `✅ Entry created with ID: ${entryDokenId}`);

      return {
        entryId: entryDokenId,
        txHash: entryTxHash.toString(),
      };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Entry creation failed',
      logger: log,
    }
  );
}

/**
 * Update an existing registry entry (updates the tx_hash)
 * Uses api.tx.entry.update() directly
 */
export async function updateEntryOnChain(
  mnemonic: string,
  registryId: string,
  entryId: string,
  jobPostingData: {
    id: string;
    title: string;
    status: string;
    organizationId: string;
    organizationName: string;
    description?: string | null;
    metadata?: any;
    location?: any;
    contact?: any;
  },
  logger?: CordLogger
): Promise<EntryResult> {
  const log = logger || getCordLogger();
  log.debug({ jobPostingId: jobPostingData.id, entryId }, `🔄 Updating entry ${entryId} for job posting ${jobPostingData.id}...`);
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      if (!api.tx || !api.tx.entry) {
        throw new Error('Entry pallet not available on this network');
      }

      const { account } = createAccount(mnemonic);
      if (!account) {
        throw new Error('Invalid account');
      }

      // Create updated entry blob
      const entryBlob = {
        jobPostingId: jobPostingData.id,
        title: jobPostingData.title,
        status: jobPostingData.status,
        organizationId: jobPostingData.organizationId,
        organizationName: jobPostingData.organizationName,
        description: jobPostingData.description || null,
        metadata: jobPostingData.metadata || {},
        location: jobPostingData.location || {},
        contact: jobPostingData.contact || {},
        updatedAt: new Date().toISOString(),
      };

      const entryStringifiedBlob = JSON.stringify(entryBlob);
      const newTxHash = await Cord.Registry.getDigestFromRawData(
        entryStringifiedBlob
      );

      // Update entry using direct API: api.tx.entry.update(registry_id, entry_id, tx_hash, blob)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Entry update timeout after 60s'));
        }, 60000);

        api.tx.entry
          .update(registryId, entryId, newTxHash, null)
          .signAndSend(account, ({ status, events, isError }: any) => {
            if (isError) {
              clearTimeout(timeout);
              reject(new Error('Entry update transaction failed'));
              return;
            }
            if (status.isInBlock) {
              log.debug({ jobPostingId: jobPostingData.id, entryId, block: status.asInBlock }, `✅ Entry updated in block: ${status.asInBlock}`);
            } else if (status.isFinalized) {
              clearTimeout(timeout);
              log.debug({ jobPostingId: jobPostingData.id, entryId, block: status.asFinalized }, `✅ Entry update finalized: ${status.asFinalized}`);
              resolve();
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      log.info({ jobPostingId: jobPostingData.id, entryId }, `✅ Entry updated: ${entryId}`);

      return {
        entryId,
        txHash: newTxHash.toString(),
      };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Entry update failed',
      logger: log,
    }
  );
}

/**
 * Revoke a registry entry (sets revoked = true)
 * Uses api.tx.entry.revoke() directly
 */
export async function revokeEntryOnChain(
  mnemonic: string,
  registryId: string,
  entryId: string,
  logger?: CordLogger
): Promise<void> {
  const log = logger || getCordLogger();
  log.debug({ entryId }, `🚫 Revoking entry ${entryId}...`);
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      if (!api.tx || !api.tx.entry) {
        throw new Error('Entry pallet not available on this network');
      }

      const { account } = createAccount(mnemonic);
      if (!account) {
        throw new Error('Invalid account');
      }

      // Revoke entry using direct API: api.tx.entry.revoke(registry_id, entry_id)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Entry revocation timeout after 60s'));
        }, 60000);

        api.tx.entry
          .revoke(registryId, entryId)
          .signAndSend(account, ({ status, events, isError }: any) => {
            if (isError) {
              clearTimeout(timeout);
              reject(new Error('Entry revocation transaction failed'));
              return;
            }
            if (status.isInBlock) {
              log.debug({ entryId, block: status.asInBlock }, `✅ Entry revoked in block: ${status.asInBlock}`);
            } else if (status.isFinalized) {
              clearTimeout(timeout);
              log.debug({ entryId, block: status.asFinalized }, `✅ Entry revocation finalized: ${status.asFinalized}`);
              resolve();
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      log.info({ entryId }, `✅ Entry revoked: ${entryId}`);
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Entry revocation failed',
      logger: log,
    }
  );
}

/**
 * Reinstate a revoked registry entry (sets revoked = false)
 * Uses api.tx.entry.reinstate() directly
 */
export async function reinstateEntryOnChain(
  mnemonic: string,
  registryId: string,
  entryId: string,
  logger?: CordLogger
): Promise<void> {
  const log = logger || getCordLogger();
  log.debug({ entryId }, `✅ Reinstating entry ${entryId}...`);
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      if (!api.tx || !api.tx.entry) {
        throw new Error('Entry pallet not available on this network');
      }

      const { account } = createAccount(mnemonic);
      if (!account) {
        throw new Error('Invalid account');
      }

      // Reinstate entry using direct API: api.tx.entry.reinstate(registry_id, entry_id)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Entry reinstatement timeout after 60s'));
        }, 60000);

        api.tx.entry
          .reinstate(registryId, entryId)
          .signAndSend(account, ({ status, events, isError }: any) => {
            if (isError) {
              clearTimeout(timeout);
              reject(new Error('Entry reinstatement transaction failed'));
              return;
            }
            if (status.isInBlock) {
              log.debug({ entryId, block: status.asInBlock }, `✅ Entry reinstated in block: ${status.asInBlock}`);
            } else if (status.isFinalized) {
              clearTimeout(timeout);
              log.debug({ entryId, block: status.asFinalized }, `✅ Entry reinstatement finalized: ${status.asFinalized}`);
              resolve();
            }
          })
          .catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      log.info({ entryId }, `✅ Entry reinstated: ${entryId}`);
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Entry reinstatement failed',
      logger: log,
    }
  );
}

/**
 * Helper function to get profile ID from account address
 */
async function computeProfileIdFromAccount(api: any, address: string): Promise<string> {
  const { computeProfileDokenId } = await import('doken-precomputer');
  return await computeProfileDokenId(api, address);
}
