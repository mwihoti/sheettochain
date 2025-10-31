#!/usr/bin/env node

/**
 * Test Hedera Connection
 * 
 * Verifies that your credentials are correct and you can connect to Hedera.
 * Run: node scripts/test-connection.mjs
 */

import { Client, AccountBalanceQuery, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function testConnection() {
  console.log('🧪 Testing Hedera Connection...\n');

  // Validate environment variables
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  console.log('📋 Configuration:');
  console.log(`   Account ID: ${accountId || '❌ NOT SET'}`);
  console.log(`   Private Key: ${privateKey ? '✅ SET (hidden)' : '❌ NOT SET'}`);
  console.log(`   Network: ${network}\n`);

  if (!accountId || !privateKey) {
    console.error('❌ Error: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env.local');
    console.error('\n💡 Tips:');
    console.error('   1. Copy .env.local.example to .env.local');
    console.error('   2. Add your Hedera credentials');
    console.error('   3. Make sure to use ED25519 private key (starts with 302e...)\n');
    process.exit(1);
  }

  try {
    // Initialize Hedera client
    console.log(`📡 Connecting to Hedera ${network}...`);
    let client;
    
    switch (network) {
      case 'mainnet':
        client = Client.forMainnet();
        break;
      case 'previewnet':
        client = Client.forPreviewnet();
        break;
      default:
        client = Client.forTestnet();
    }

    // Set operator
    try {
      const key = PrivateKey.fromStringED25519(privateKey);
      client.setOperator(accountId, key);
      console.log('✅ Client initialized\n');
    } catch (error) {
      console.error('❌ Error: Invalid private key format');
      console.error('   Make sure you are using ED25519 private key (DER-encoded)');
      console.error('   It should start with: 302e020100300506032b6570...\n');
      process.exit(1);
    }

    // Test 1: Query account balance
    console.log('🔍 Test 1: Querying account balance...');
    const balanceQuery = new AccountBalanceQuery()
      .setAccountId(accountId);
    
    const balance = await balanceQuery.execute(client);
    const hbarBalance = balance.hbars.toString();
    
    console.log(`✅ Balance: ${hbarBalance}\n`);

    // Test 2: Verify account has funds
    if (balance.hbars.toTinybars().toNumber() === 0) {
      console.warn('⚠️  Warning: Account balance is 0 HBAR');
      console.warn('   You need testnet HBAR to mint tokens');
      console.warn('   Get free testnet HBAR at: https://portal.hedera.com/\n');
    } else {
      console.log('✅ Account has sufficient balance for testing\n');
    }

    // Success summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`👤 Account: ${accountId}`);
    console.log(`💰 Balance: ${hbarBalance}`);
    console.log(`🌐 Network: ${network}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🎉 Your Hedera credentials are working correctly!');
    console.log('   You can now mint dataset NFTs.\n');

    console.log('📝 Next Steps:');
    console.log('   1. Create HCS topic: node scripts/create-hcs-topic.mjs');
    console.log('   2. Start dev server: pnpm dev');
    console.log('   3. Go to: http://localhost:3000/tokenized-data');
    console.log('   4. Upload a CSV file and mint your first NFT!\n');

    client.close();

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(`   ${error.message}\n`);
    
    if (error.status) {
      console.error(`   Status code: ${error.status.toString()}`);
      
      if (error.status.toString().includes('INVALID_SIGNATURE')) {
        console.error('\n💡 Tips:');
        console.error('   - Make sure Account ID and Private Key match');
        console.error('   - Use ED25519 key, not ECDSA');
        console.error('   - Verify the private key is correct\n');
      }
    }
    
    process.exit(1);
  }
}

// Run the function
testConnection().catch(console.error);
