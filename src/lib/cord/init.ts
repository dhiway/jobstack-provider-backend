import * as Cord from '@cord.network/sdk';

const { NETWORK_ADDRESS } = process.env;

export async function initializeCordConnection() {
  const networkAddress = NETWORK_ADDRESS || 'wss://staging.cord.network';
  if (!networkAddress) {
    throw new Error(
      'Network address is not defined. Please set NETWORK_ADDRESS.'
    );
  }
  
  console.log(`🔗 Connecting to CORD at ${networkAddress}...`);
  Cord.ConfigService.set({ submitTxResolveOn: Cord.Chain.IS_IN_BLOCK });
  await Cord.connect(networkAddress);
  console.log(`✅ WebSocket connected`);
  
  // Wait for essential API modules (tx and balances) - DID module loads lazily
  console.log('⏳ Waiting for CORD API modules to be ready...');
  const maxWaitTime = 60000; // 60 seconds
  const checkInterval = 2000; // Check every 2 seconds
  const startTime = Date.now();
  
  let ready = false;
  let attempt = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    attempt++;
    const api = Cord.ConfigService.get('api');
    
    if (api) {
      const hasTx = !!api.tx;
      const hasBalances = !!(api.tx && api.tx.balances);
      
      // Only require tx and balances - DID module loads lazily when first accessed
      if (hasTx && hasBalances) {
        ready = true;
        const hasDid = !!(api.tx && api.tx.did);
        console.log(`✅ CORD API ready after ${Math.round((Date.now() - startTime) / 1000)}s - DID module: ${hasDid ? 'available' : 'will load on first use'}`);
        break;
      }
      
      if (attempt % 5 === 0) {
        // Log progress every 10 seconds
        console.log(`⏳ Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s) - tx: ${hasTx}, balances: ${hasBalances}`);
      }
    } else {
      if (attempt % 5 === 0) {
        console.log(`⏳ Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s) - API not yet available`);
      }
    }
    
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
  
  if (!ready) {
    const api = Cord.ConfigService.get('api');
    const hasTx = api && !!api.tx;
    const hasBalances = api && api.tx && !!api.tx.balances;
    
    throw new Error(
      `CORD API not ready after ${Math.round(maxWaitTime / 1000)}s. ` +
      `Status: api=${!!api}, tx=${hasTx}, balances=${hasBalances}`
    );
  }
  
  console.log(`✅ Connected to CORD at ${networkAddress} - API ready`);
  return;
}

