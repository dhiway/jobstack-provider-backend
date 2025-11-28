#!/usr/bin/env node
import 'dotenv/config';
import { syncSandbox, setupSandbox } from './sync.js';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'sync':
        await syncSandbox();
        break;
      case 'setup':
        await setupSandbox();
        break;
      default:
        console.log(`
Usage: tsx src/scripts/sandbox/index.ts <command>

Commands:
  setup  - Create sandbox database schema only
  sync   - Sync schema and data with anonymization

Environment variables required:
  DATABASE_URL          - Source database connection string
  SANDBOX_DATABASE_URL  - Target sandbox database connection string
  SANDBOX_SALT          - Salt for anonymization hashing
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

