# CORD Chain Integration - Implementation Summary

## Overview
CORD chain integration has been successfully implemented in the jobstack-provider-backend project, following the same pattern as Digi-Attest-Backend.

## What Was Implemented

### 1. Dependencies Installed
- `@cord.network/sdk@0.9.6-10` - CORD SDK
- `@cord.network/vc-export@0.9.6-11` - VC export utilities
- `doken-precomputer@^0.0.5` - Doken ID computation

### 2. Database Schema
Created `src/db/schema/cord.ts` with two tables:
- **`organizationCordAccount`** - Stores CORD account, profile, and registry for organizations
- **`userCordAccount`** - Stores CORD account and DID for users

### 3. CORD Utility Modules (`src/lib/cord/`)

#### `mnemonic.ts`
- Encrypts/decrypts mnemonics using AES-256-GCM
- Required: `MNEMONIC_SECRET_KEY` environment variable (32 characters)

#### `init.ts`
- Initializes CORD connection to blockchain
- Uses `NETWORK_ADDRESS` environment variable

#### `did.ts`
- Creates DIDs for users using `create_from_account`
- DID identifier is derived from the account address

#### `profile.ts`
- Creates profiles on-chain for organizations
- Uses doken-precomputer to compute profile IDs
- Includes retry logic for profile ID retrieval

#### `registry.ts`
- Creates revocation registries for organizations
- Used for credential revocation tracking

#### `account.ts`
- **`createCordAccountForUser()`** - Creates CORD account + DID for users
- **`createCordAccountForOrganization()`** - Creates CORD account + profile + registry for orgs
- **`fundAccount()`** - Funds new accounts from stash account
- **`getOrgCordAccount()`** - Retrieves organization CORD account
- **`getUserCordAccount()`** - Retrieves user CORD account

### 4. Integration Points

#### User Creation Flow
- **File**: `src/lib/auth/plugins/unifiedOtp.ts`
- **Trigger**: When user verifies email/phone
- **Action**: Creates CORD account and DID automatically
- **Error Handling**: Non-blocking (user creation succeeds even if CORD fails)

#### Organization Creation Flow
- **File**: `src/routes/v1/dialFlow/createJobPosting.ts`
- **Trigger**: When new organization is created via dialflow
- **Action**: Creates CORD account, profile, and registry automatically
- **Error Handling**: Non-blocking (organization creation succeeds even if CORD fails)

#### Server Initialization
- **File**: `src/server.ts`
- **Action**: Connects to CORD chain on startup if `CORD_ENABLED=true`

## Environment Variables Required

Add these to your `.env` file:

```bash
# CORD Chain Configuration
CORD_ENABLED=true
NETWORK_ADDRESS=wss://staging.cord.network

# CORD Account Funding (Stash account for funding new accounts)
STASH_ACC_MNEMONIC=your_stash_account_mnemonic_here

# Mnemonic Encryption Key (32 characters for AES-256)
MNEMONIC_SECRET_KEY=your_32_character_secret_key_here
```

### Generating `MNEMONIC_SECRET_KEY`
You can generate a 32-character key using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Migration

After adding the schema, run:
```bash
pnpm db:generate
pnpm db:migrate
```

## How It Works

### For Users:
1. User verifies email/phone → OTP verification succeeds
2. System checks if user already has CORD account
3. If not, creates new CORD account and funds it
4. Creates DID on-chain using `create_from_account`
5. Stores encrypted mnemonic and DID in `userCordAccount` table

### For Organizations:
1. Organization is created (via dialflow or other means)
2. System checks if organization already has CORD account
3. If not, creates new CORD account and funds it
4. Creates profile on-chain with organization slug
5. Creates registry on-chain (for credential revocation)
6. Stores encrypted mnemonic, profile ID, and registry ID in `organizationCordAccount` table

## Security Features

1. **Encrypted Storage**: All mnemonics are encrypted using AES-256-GCM before storing in database
2. **Non-blocking**: CORD operations don't block user/org creation if they fail
3. **Idempotent**: Checks for existing accounts before creating new ones
4. **Error Handling**: Comprehensive error handling with logging

## Next Steps

1. Set up environment variables
2. Run database migrations
3. Ensure stash account has sufficient CORD tokens (WAY)
4. Test user creation flow
5. Test organization creation flow
6. (Optional) Implement credential revocation functionality using the registry

## Notes

- The registry created for organizations supports credential revocation (entries can be revoked individually)
- Users get DIDs, organizations get profiles + registries
- All operations are asynchronous and non-blocking
- Failed CORD operations are logged but don't prevent user/org creation

