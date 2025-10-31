#!/usr/bin/env node

/**
 * HCS Topic Creation Utility (JavaScript version)
 * 
 * Run: node scripts/create-hcs-topic.mjs
 */

import { Client, TopicCreateTransaction, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function createHCSTopic() {
  console.log('🚀 Creating HCS Topic for CSV Dataset Verification...\n');

  // Validate environment variables
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!accountId || !privateKey) {
    console.error('❌ Error: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env.local');
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
    const key = PrivateKey.fromStringED25519(privateKey);
    client.setOperator(accountId, key);

    console.log(`✅ Connected as: ${accountId}\n`);

    // Create topic
    console.log('📝 Creating HCS topic...');
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo('CSV Dataset Hash Verification - Hedera Analytics Dashboard')
      .setAdminKey(key.publicKey)
      .setSubmitKey(key.publicKey);

    const topicCreateSubmit = await topicCreateTx.execute(client);
    const topicCreateReceipt = await topicCreateSubmit.getReceipt(client);
    const topicId = topicCreateReceipt.topicId;

    if (!topicId) {
      throw new Error('Failed to create topic');
    }

    console.log('✅ Topic created successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📋 Topic ID: ${topicId.toString()}`);
    console.log(`🔗 Network: ${network}`);
    console.log(`👤 Admin: ${accountId}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Next Steps:');
    console.log('1. Add this to your .env.local file:');
    console.log(`   HCS_TOPIC_ID=${topicId.toString()}\n`);
    console.log('2. Restart your development server:');
    console.log('   pnpm dev\n');
    console.log('3. CSV dataset hashes will now be submitted to this topic!\n');

    // Explorer URL
    const explorerUrl = network === 'mainnet'
      ? `https://hashscan.io/mainnet/topic/${topicId.toString()}`
      : `https://hashscan.io/${network}/topic/${topicId.toString()}`;

    console.log(`🔍 View on HashScan: ${explorerUrl}\n`);

    client.close();

  } catch (error) {
    console.error('❌ Error creating topic:', error.message);
    if (error.status) {
      console.error(`Status: ${error.status}`);
    }
    process.exit(1);
  }
}

// Run the function
createHCSTopic().catch(console.error);
