import * as Cord from '@cord.network/sdk';
import { createAccount } from '@cord.network/vc-export';
import { computeRegistryDokenId } from 'doken-precomputer';
import { retryWithBackoff } from './utils';

export async function createRegistryOnChain(mnemonic: string, schema?: object) {
  console.log('\n🔄 Creating registry...');
  
  return retryWithBackoff(
    async () => {
      const api = Cord.ConfigService.get('api');
      if (!api) throw new Error('Cord API not initialized');

      const { account: issuerAccount } = createAccount(mnemonic);
      if (!issuerAccount) {
        throw new Error('Invalid issuer account');
      }

      const registryBlob = {
        title: 'Organization registry',
        schema: JSON.stringify(schema),
        date: new Date().toISOString(),
      };

      const registryStringifiedBlob = JSON.stringify(registryBlob);
      const registryTxHash = await Cord.Registry.getDigestFromRawData(
        registryStringifiedBlob
      );

      const registryProperties = await Cord.Registry.registryCreateProperties(
        registryTxHash,
        null // no blob
      );

      const registryDokenId = await computeRegistryDokenId(
        api,
        registryTxHash,
        issuerAccount.address
      );

      await Cord.Registry.dispatchCreateToChain(
        registryProperties,
        issuerAccount as Cord.CordKeyringPair
      );

      console.log(`✅ Registry created with URI: ${registryDokenId}`);

      return {
        message: 'Registry created successfully',
        registryId: registryDokenId,
        schema,
      };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Registry creation failed',
    }
  );
}

