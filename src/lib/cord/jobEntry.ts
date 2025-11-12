import { db } from '@db/setup';
import { organizationCordAccount, jobPostingCordEntry } from '@db/schema';
import { jobPosting } from '@db/schema/job';
import { decryptMnemonic } from './mnemonic';
import {
  createEntryOnChain,
  updateEntryOnChain,
  revokeEntryOnChain,
  reinstateEntryOnChain,
} from './entry';
import { eq } from 'drizzle-orm';
import { CordLogger, getCordLogger } from './logger';

/**
 * Get organization's CORD registry info
 */
async function getOrgRegistryInfo(orgId: string) {
  const orgCordAccount = await db.query.organizationCordAccount.findFirst({
    where: (a, { eq }) => eq(a.orgId, orgId),
  });

  if (!orgCordAccount || !orgCordAccount.cordRegistryId || !orgCordAccount.cordMnemonicEnc) {
    throw new Error(`Organization ${orgId} does not have a CORD registry`);
  }

  return {
    registryId: orgCordAccount.cordRegistryId,
    mnemonic: decryptMnemonic(orgCordAccount.cordMnemonicEnc),
  };
}

/**
 * Create or update registry entry for a job posting
 * This function handles the synchronization between job posting state and CORD entry state
 */
export async function syncJobPostingToChain(
  jobPostingId: string,
  logger?: CordLogger
) {
  const log = logger || getCordLogger();
  
  if (process.env.CORD_ENABLED !== 'true') {
    log.debug({ jobPostingId }, '⚠️  CORD not enabled, skipping entry sync');
    return;
  }

  try {
    // Get job posting
    const posting = await db.query.jobPosting.findFirst({
      where: (a, { eq }) => eq(a.id, jobPostingId),
    });

    if (!posting) {
      throw new Error(`Job posting ${jobPostingId} not found`);
    }

    // Get organization registry info
    const { registryId, mnemonic } = await getOrgRegistryInfo(posting.organizationId);

    // Check if entry already exists
    const existingEntry = await db.query.jobPostingCordEntry.findFirst({
      where: (a, { eq }) => eq(a.jobPostingId, jobPostingId),
    });

    if (existingEntry) {
      // Entry exists - update it based on status
      if (posting.status === 'archived') {
        // Archive = revoke entry if not already revoked
        if (!existingEntry.revoked) {
          await revokeEntryOnChain(mnemonic, registryId, existingEntry.cordEntryId, log);
          await db
            .update(jobPostingCordEntry)
            .set({ 
              revoked: true, 
              updatedAt: new Date() 
            })
            .where(eq(jobPostingCordEntry.id, existingEntry.id));
        }
      } else {
        // Non-archived status - update entry hash or reinstate if revoked
        if (existingEntry.revoked) {
          // Reinstate if previously revoked
          await reinstateEntryOnChain(mnemonic, registryId, existingEntry.cordEntryId, log);
        }
        
        // Update entry with new hash (reflects current status)
        const result = await updateEntryOnChain(
          mnemonic, 
          registryId, 
          existingEntry.cordEntryId, 
          {
            id: posting.id,
            title: posting.title,
            status: posting.status,
            organizationId: posting.organizationId,
            organizationName: posting.organizationName,
            description: posting.description,
            metadata: posting.metadata,
            location: posting.location,
            contact: posting.contact,
          },
          log
        );
        
        await db
          .update(jobPostingCordEntry)
          .set({ 
            revoked: false,
            txHash: result.txHash,
            updatedAt: new Date(),
          })
          .where(eq(jobPostingCordEntry.id, existingEntry.id));
      }
    } else {
      // Entry doesn't exist - create it
      const result = await createEntryOnChain(
        mnemonic, 
        registryId, 
        {
          id: posting.id,
          title: posting.title,
          status: posting.status,
          organizationId: posting.organizationId,
          organizationName: posting.organizationName,
          description: posting.description,
          metadata: posting.metadata,
          location: posting.location,
          contact: posting.contact,
        },
        log
      );
      
      await db.insert(jobPostingCordEntry).values({
        jobPostingId: posting.id,
        cordEntryId: result.entryId,
        registryId: registryId,
        txHash: result.txHash,
        revoked: posting.status === 'archived',
      });
    }

    log.info({ jobPostingId }, `✅ Synced job posting ${jobPostingId} to CORD chain`);
  } catch (error: any) {
    log.error(
      { err: error, jobPostingId, errorMessage: error.message, errorStack: error.stack },
      `❌ Failed to sync job posting ${jobPostingId} to chain: ${error.message}`
    );
    // Don't throw - allow job posting operations to continue even if CORD fails
  }
}
