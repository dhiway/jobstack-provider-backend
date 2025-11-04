import * as Cord from '@cord.network/sdk';
import { computeProfileDokenId } from 'doken-precomputer';
import { retryWithBackoff } from './utils';

interface RawProfileData {
  pub_name: string;
}

async function getExistingProfile(address: string): Promise<string | null> {
  console.log(`🔍 Fetching profile from chain for ${address}...`);
  const api = Cord.ConfigService.get('api');
  if (!api) return null;
  
  const profileDokenId = await computeProfileDokenId(api, address);

  if (!profileDokenId) {
    return null;
  }

  console.log(`✅ Profile found: ${profileDokenId}`);
  return profileDokenId;
}

export async function createProfileOnChain(
  account: any,
  profileData: RawProfileData
): Promise<string> {
  console.log(`📝 Creating profile for ${account.address}...`);

  return retryWithBackoff(
    async () => {
      // Hash profile data
      const hashedProfileData: [string, string][] = Object.entries(profileData).map(
        ([key, value]) => [key, Cord.blake2AsHex(value)] as [string, string]
      );

      // Create profile on chain
      await Cord.Profile.dispatchSetProfileToChain(hashedProfileData, account);
      console.log('✅ Profile created successfully');

      // Query for profile with retry for profile ID
      let retries = 5;
      while (retries > 0) {
        try {
          const profileId = await getExistingProfile(account.address);

          if (profileId) {
            console.log(`✅ Profile ID confirmed: ${profileId}`);
            return profileId;
          }

          // Wait before retry with increasing delay
          await new Promise((resolve) => setTimeout(resolve, 2000 * (6 - retries)));
          retries--;
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * (6 - retries)));
        }
      }

      throw new Error(
        `No profile found for account ${account.address} after retries`
      );
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      errorMessage: 'Profile creation failed',
    }
  );
}

