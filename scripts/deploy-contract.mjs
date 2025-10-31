#!/usr/bin/env node

/**
 * Deploy DatasetRegistry Smart Contract to Hedera
 * 
 * This script compiles and deploys the DatasetRegistry.sol contract
 * to Hedera testnet/mainnet.
 * 
 * Prerequisites:
 * 1. Solidity compiler (solc) installed
 * 2. Hedera account with HBAR balance
 * 3. Environment variables set in .env.local
 * 
 * Usage: node scripts/deploy-contract.mjs
 */

import { 
  Client, 
  ContractCreateFlow,
  PrivateKey,
  Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function deployContract() {
  console.log('🚀 Deploying DatasetRegistry Smart Contract...\n');

  // Validate environment
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!accountId || !privateKey) {
    console.error('❌ Error: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set');
    process.exit(1);
  }

  try {
    // Initialize client
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

    const key = PrivateKey.fromStringED25519(privateKey);
    client.setOperator(accountId, key);
    console.log(`✅ Connected as: ${accountId}\n`);

    // Step 1: Compile contract
    console.log('🔨 Compiling Solidity contract...');
    const contractPath = join(__dirname, '..', 'contracts', 'DatasetRegistry.sol');
    
    // Read contract source
    const source = readFileSync(contractPath, 'utf8');
    
    // Prepare input for solc
    const input = {
      language: 'Solidity',
      sources: {
        'DatasetRegistry.sol': {
          content: source
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        }
      }
    };

    // Compile
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    // Check for errors
    if (output.errors) {
      const errors = output.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        console.error('❌ Compilation errors:');
        errors.forEach(err => console.error(err.formattedMessage));
        process.exit(1);
      }
    }

    // Extract bytecode
    const contract = output.contracts['DatasetRegistry.sol']['DatasetRegistry'];
    if (!contract) {
      console.error('❌ Could not extract contract from compilation output');
      process.exit(1);
    }

    const bytecode = contract.evm.bytecode.object;
    console.log(`✅ Contract compiled successfully`);
    console.log(`   Bytecode size: ${bytecode.length / 2} bytes\n`);

    // Step 2: Deploy contract
    console.log('📤 Deploying contract to Hedera...');
    console.log('   This may take 10-30 seconds...\n');

    const contractCreateTx = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(2000000)  // Increased gas for complex contract (2M)
      .setMaxChunks(30) // Allow larger bytecode
      .setConstructorParameters() // No constructor params
      .setAdminKey(key.publicKey);

    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateReceipt.contractId;

    if (!contractId) {
      throw new Error('Failed to get contract ID from receipt');
    }

    console.log('✅ Contract deployed successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📋 Contract ID: ${contractId.toString()}`);
    console.log(`🔗 Network: ${network}`);
    console.log(`👤 Admin: ${accountId}`);
    console.log(`⛽ Gas used: 2,000,000`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Next Steps:');
    console.log('1. Add this to your .env.local file:');
    console.log(`   SMART_CONTRACT_ID=${contractId.toString()}\n`);
    console.log('2. Restart your development server:');
    console.log('   pnpm dev\n');
    console.log('3. Datasets will now be registered on-chain!\n');

    // Explorer URL
    const explorerUrl = network === 'mainnet'
      ? `https://hashscan.io/mainnet/contract/${contractId.toString()}`
      : `https://hashscan.io/${network}/contract/${contractId.toString()}`;

    console.log(`🔍 View on HashScan: ${explorerUrl}\n`);

    client.close();

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    process.exit(1);
  }
}

// Run deployment
deployContract().catch(console.error);
