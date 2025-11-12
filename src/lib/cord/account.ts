import * as Cord from '@cord.network/sdk';
import { createAccount } from '@cord.network/vc-export';
import { decryptMnemonic, encryptMnemonic } from './mnemonic';
import { organizationCordAccount, userCordAccount } from '@db/schema';
import { db } from '@db/setup';
import { createRegistryOnChain } from './registry';
import { createProfileOnChain } from './profile';
import { createDidForUser } from './did';
import { retryWithBackoff } from './utils';
import { CordLogger, getCordLogger } from './logger';

const { STASH_ACC_MNEMONIC } = process.env;
const TRANSFER_AMOUNT = 100 * 10 ** 12; // 100 WAY

export async function fundAccount(
  api: any,
  recipientAddress: string,
  amount: number,
  logger?: CordLogger
): Promise<void> {
  const log = logger || getCordLogger();
  
  if (!STASH_ACC_MNEMONIC) {
    throw new Error('STASH_ACC_MNEMONIC is not set');
  }
  
  const stash = createAccount(STASH_ACC_MNEMONIC);
  if (!stash.account) throw new Error('Failed to load stash account');

  return new Promise((resolve, reject) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('Funding timeout after 30s'));
      }
    }, 30_000);

    api.tx.balances
      .transferKeepAlive(recipientAddress, amount)
      .signAndSend(stash.account, (result: any) => {
        if (done) return;

        if (result.status.isInBlock) {
          done = true;
          clearTimeout(timeout);
          log.info(
            { recipientAddress, amount: amount / 10 ** 12 },
            `Funded ${recipientAddress} with ${amount / 10 ** 12} WAY`
          );
          resolve();
        }

        if (result.isError) {
          done = true;
          clearTimeout(timeout);
          reject(new Error(`Funding failed: ${result.toString()}`));
        }
      })
      .catch((err: Error) => {
        if (!done) {
          done = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
  });
}

/**
 * Create CORD account for a user and anchor DID
 */
export async function createCordAccountForUser(
  userId: string,
  userName: string,
  logger?: CordLogger
) {
  const log = logger || getCordLogger();
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');
      
      if (!api.tx || !api.tx.balances) {
        throw new Error('Cord API tx.balances module not available');
      }

      const { account, mnemonic } = createAccount();
      if (!account || !mnemonic) throw new Error('Failed to create Cord account');

      const encMnemonic = encryptMnemonic(mnemonic);
      const publicKey = `0x${Buffer.from(account.publicKey).toString('hex')}`;

      // Fund the new user account
      await fundAccount(api, account.address, TRANSFER_AMOUNT, log);
      
      // Create DID for user (DID module will be checked/loaded inside createDidForUser)
      const didId = await createDidForUser(account, log);

      if (!didId) {
        throw new Error('No DID ID found');
      }

      await db.insert(userCordAccount).values({
        userId: userId,
        cordAddress: account.address,
        cordPublicKey: publicKey,
        cordMnemonicEnc: encMnemonic,
        cordDid: didId,
      });
      
      log.info(
        { userId, address: account.address, didId },
        `Cord account created for user ${userId}: ${account.address}`
      );
      return { didId, address: account.address };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      errorMessage: 'Failed to create CORD account for user',
      logger: log,
    }
  );
}

/**
 * Create CORD account for an organization with profile and registry
 */
export async function createCordAccountForOrganization(
  orgId: string,
  orgSlug: string,
  logger?: CordLogger
) {
  const log = logger || getCordLogger();
  log.info({ orgId, orgSlug }, `🔄 [CORD] Starting organization account creation for org ${orgId}...`);
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');

      log.debug({ orgId }, `📝 [CORD] Creating account for org ${orgId}...`);
      const { account, mnemonic } = createAccount();
      if (!account || !mnemonic) throw new Error('Failed to create Cord account');

      const encMnemonic = encryptMnemonic(mnemonic);
      const publicKey = `0x${Buffer.from(account.publicKey).toString('hex')}`;

      log.debug({ orgId, address: account.address }, `💰 [CORD] Funding account ${account.address} for org ${orgId}...`);
      // Fund the new org account
      await fundAccount(api, account.address, TRANSFER_AMOUNT, log);
      
      log.debug({ orgId }, `📋 [CORD] Creating profile for org ${orgId}...`);
      const profileId = await createProfileOnChain(account, { pub_name: orgSlug }, log);
      
      log.debug({ orgId }, `📑 [CORD] Creating registry for org ${orgId}...`);
      const registry = await createRegistryOnChain(mnemonic, {}, log);

      if (!profileId) {
        throw new Error('No Profile Id found');
      }

      if (!registry.registryId) {
        throw new Error('No Registry Id found');
      }

      log.debug({ orgId }, `💾 [CORD] Saving to database for org ${orgId}...`);
      await db.insert(organizationCordAccount).values({
        orgId: orgId,
        cordAddress: account.address,
        cordPublicKey: publicKey,
        cordMnemonicEnc: encMnemonic,
        cordRegistryId: registry?.registryId ?? null,
        cordProfileId: profileId ?? null,
      });
      
      log.info(
        { orgId, address: account.address, profileId, registryId: registry.registryId },
        `✅ [CORD] Account created for org ${orgId}: ${account.address}`
      );
      return { profileId, registryId: registry.registryId, address: account.address };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      errorMessage: 'Failed to create CORD account for organization',
      logger: log,
    }
  );
}

/**
 * Get organization CORD account from database
 */
export async function getOrgCordAccount(orgId: string) {
  const record = await db.query.organizationCordAccount.findFirst({
    where: (a, { eq }) => eq(a.orgId, orgId),
  });

  if (!record) throw new Error('No Cord account found for organization');

  const mnemonic = decryptMnemonic(record.cordMnemonicEnc);
  const { account } = createAccount(mnemonic);

  return account;
}

/**
 * Get user CORD account from database
 */
export async function getUserCordAccount(userId: string) {
  const record = await db.query.userCordAccount.findFirst({
    where: (a, { eq }) => eq(a.userId, userId),
  });

  if (!record) throw new Error('No Cord account found for user');

  const mnemonic = decryptMnemonic(record.cordMnemonicEnc);
  const { account } = createAccount(mnemonic);

  return account;
}

