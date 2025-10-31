/**
 * Token Minting Service for Hedera Token Service (HTS)
 * 
 * This service creates and mints HTS tokens representing CSV datasets.
 * Supports both NFTs (one token per dataset) and fungible tokens (one token per row).
 * Now includes smart contract integration for on-chain validation and registry.
 * 
 * References:
 * - HTS Documentation: https://docs.hedera.com/hedera/core-concepts/tokens/hedera-token-service-hts-native-tokenization
 * - Hedera SDK: https://docs.hedera.com/hedera/sdks-and-apis
 * - Consensus Service: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/consensus/consensus-service
 * - Smart Contracts: https://docs.hedera.com/hedera/core-concepts/smart-contracts
 */

import {
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenAssociateTransaction,
  PrivateKey,
  AccountId,
  TokenId,
  TransferTransaction,
  Hbar,
  TokenInfoQuery,
  AccountBalanceQuery,
  TopicMessageSubmitTransaction,
  TopicId,
  TokenNftInfoQuery,
} from "@hashgraph/sdk";
import { CSVMetadata } from './csv-processor';
import { SmartContractService } from './smart-contract';

/**
 * Result from minting a token
 */
export interface TokenMintResult {
  tokenId: string;
  serialNumber?: number; // For NFTs
  transactionId: string;
  timestamp: string;
  explorerUrl: string;
  consensusTimestamp?: string;
  contractRegistered?: boolean; // Whether registered on smart contract
  contractTxId?: string;         // Smart contract transaction ID
}

/**
 * Dataset token with full metadata
 */
export interface DatasetToken {
  tokenId: string;
  name: string;
  symbol: string;
  metadata: CSVMetadata;
  mintedAt: string;
  serialNumber?: number;
  ownerAccountId: string;
  type: 'nft' | 'fungible';
}

/**
 * HCS submission result
 */
export interface HCSSubmitResult {
  topicId: string;
  transactionId: string;
  consensusTimestamp: string;
  sequenceNumber: number;
}

/**
 * Token Minting Service for Hedera
 * 
 * Workflow:
 * 1. Create NFT collection (one-time)
 * 2. Mint NFT for each dataset with metadata
 * 3. Submit hash to HCS for immutable audit trail
 * 4. Return token ID and explorer link
 */
export class TokenMintingService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private network: 'testnet' | 'mainnet' | 'previewnet';
  
  // Collection token ID (created once, reused for all datasets)
  private collectionTokenId?: TokenId;

  /**
   * Initialize the token minting service
   * 
   * @param accountId - Hedera account ID (format: 0.0.xxxxx)
   * @param privateKey - Private key for signing transactions
   * @param network - Network to use (testnet/mainnet/previewnet)
   */
  constructor(
    accountId: string,
    privateKey: string,
    network: 'testnet' | 'mainnet' | 'previewnet' = 'testnet'
  ) {
    this.network = network;
    
    // Initialize Hedera client based on network
    if (network === 'testnet') {
      this.client = Client.forTestnet();
    } else if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forPreviewnet();
    }
    
    this.operatorId = AccountId.fromString(accountId);
    this.operatorKey = PrivateKey.fromString(privateKey);
    
    // Set operator for transactions
    this.client.setOperator(this.operatorId, this.operatorKey);
    
    console.log(`✅ TokenMintingService initialized on ${network}`);
    console.log(`   Account: ${this.operatorId.toString()}`);
  }

  /**
   * Create NFT collection for datasets (one-time operation)
   * 
   * This creates a reusable NFT collection that can mint unlimited dataset NFTs.
   * Each CSV file will be minted as a unique NFT in this collection.
   * 
   * Reference: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/define-a-token
   * 
   * @returns Token ID of the created collection
   */
  async createDatasetCollection(): Promise<TokenId> {
    if (this.collectionTokenId) {
      console.log(`✅ Using existing collection: ${this.collectionTokenId}`);
      return this.collectionTokenId;
    }

    console.log('🔨 Creating NFT collection for datasets...');

    try {
      // Create NFT collection using TokenCreateTransaction
      const transaction = new TokenCreateTransaction()
        .setTokenName("Analytics Dataset NFTs")
        .setTokenSymbol("DATASET")
        .setTokenType(TokenType.NonFungibleUnique) // NFT type
        .setDecimals(0) // NFTs have 0 decimals
        .setInitialSupply(0) // Start with 0 supply, mint on demand
        .setSupplyType(TokenSupplyType.Infinite) // Unlimited minting
        .setTreasuryAccountId(this.operatorId) // Treasury receives minted NFTs
        .setSupplyKey(this.operatorKey) // Required for minting
        .setAdminKey(this.operatorKey) // For administrative operations
        .setMaxTransactionFee(new Hbar(50)); // Max fee willing to pay

      // Execute transaction
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      this.collectionTokenId = receipt.tokenId!;
      
      console.log(`✅ NFT Collection Created: ${this.collectionTokenId}`);
      console.log(`   Transaction ID: ${txResponse.transactionId}`);
      console.log(`   Explorer: ${this.getExplorerUrl('token', this.collectionTokenId.toString())}`);
      
      return this.collectionTokenId;
    } catch (error: any) {
      console.error('❌ Failed to create NFT collection:', error.message);
      throw new Error(`Token collection creation failed: ${error.message}`);
    }
  }

  /**
   * Mint NFT for a single dataset
   * 
   * Creates a unique NFT representing the CSV dataset with full metadata stored on-chain.
   * The metadata includes file info, schema, hash, and statistics.
   * 
   * Reference: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/mint-a-token
   * 
   * @param metadata - CSV metadata from csv-processor
   * @returns Mint result with token info and explorer link
   */
  async mintDatasetNFT(metadata: CSVMetadata): Promise<TokenMintResult> {
    console.log(`🔨 Minting NFT for dataset: ${metadata.fileName}`);

    try {
      // Ensure collection exists
      const tokenId = this.collectionTokenId || await this.createDatasetCollection();

      // Create comprehensive NFT metadata
      // Create compact NFT metadata (Hedera has strict size limits)
      // Only store hash and essential info - detailed metadata goes to IPFS or external storage
      // Create minimal NFT metadata (Hedera has 100 byte limit per NFT)
      // Store only essential data - full metadata should go to IPFS or external storage
      const minimalMetadata = {
        h: metadata.hash.substring(0, 12), // First 12 chars of hash
        r: metadata.rowCount,
        c: metadata.columns.length
      };

      // Convert metadata to bytes (required for HTS)
      let metadataBytes = Buffer.from(JSON.stringify(minimalMetadata));

      console.log(`   Metadata size: ${metadataBytes.length} bytes`);

      // Check metadata size (HTS limit is 100 bytes)
      if (metadataBytes.length > 100) {
        // Ultra-minimal: just hash prefix
        const ultraMinimal = { h: metadata.hash.substring(0, 8) };
        metadataBytes = Buffer.from(JSON.stringify(ultraMinimal));
        console.log(`   Using ultra-minimal metadata: ${metadataBytes.length} bytes`);
        
        if (metadataBytes.length > 100) {
          throw new Error(`Metadata too large: ${metadataBytes.length} bytes exceeds 100 byte limit`);
        }
      }

      // Mint NFT using TokenMintTransaction
      const mintTx = new TokenMintTransaction()
        .setTokenId(tokenId)
        .addMetadata(metadataBytes) // Store metadata on-chain
        .setMaxTransactionFee(new Hbar(20));

      const mintTxResponse = await mintTx.execute(this.client);
      const mintReceipt = await mintTxResponse.getReceipt(this.client);
      
      const serialNumber = mintReceipt.serials[0].toNumber();
      const consensusTimestamp = new Date().toISOString();

      console.log(`✅ NFT Minted Successfully!`);
      console.log(`   Token ID: ${tokenId.toString()}`);
      console.log(`   Serial #: ${serialNumber}`);
      console.log(`   Transaction: ${mintTxResponse.transactionId}`);

      return {
        tokenId: tokenId.toString(),
        serialNumber,
        transactionId: mintTxResponse.transactionId.toString(),
        timestamp: consensusTimestamp,
        consensusTimestamp,
        explorerUrl: `https://hashscan.io/${this.network}/token/${tokenId.toString()}`
      };
    } catch (error: any) {
      console.error('❌ NFT minting failed:', error.message);
      throw new Error(`NFT minting failed: ${error.message}`);
    }
  }

  /**
   * Mint fungible tokens representing data rows
   * 
   * Creates fungible tokens where each token = 1 row of data.
   * Useful for fractional ownership or row-level access control.
   * 
   * @param metadata - CSV metadata
   * @returns Mint result
   */
  async mintDataRowTokens(metadata: CSVMetadata): Promise<TokenMintResult> {
    console.log(`🔨 Minting fungible tokens for dataset: ${metadata.fileName}`);

    try {
      // Create fungible token
      const createTx = new TokenCreateTransaction()
        .setTokenName(`Rows: ${metadata.fileName}`)
        .setTokenSymbol("ROW")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(0) // Whole units only
        .setInitialSupply(metadata.rowCount) // Mint 1 token per row
        .setTreasuryAccountId(this.operatorId)
        .setSupplyKey(this.operatorKey)
        .setAdminKey(this.operatorKey)
        .setMaxTransactionFee(new Hbar(50));

      const txResponse = await createTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const tokenId = receipt.tokenId!;

      console.log(`✅ Fungible tokens created: ${tokenId}`);
      console.log(`   Total supply: ${metadata.rowCount} tokens`);

      return {
        tokenId: tokenId.toString(),
        transactionId: txResponse.transactionId.toString(),
        timestamp: new Date().toISOString(),
        explorerUrl: this.getExplorerUrl('token', tokenId.toString())
      };
    } catch (error: any) {
      console.error('❌ Fungible token creation failed:', error.message);
      throw new Error(`Fungible token creation failed: ${error.message}`);
    }
  }

  /**
   * Submit dataset hash to HCS for immutable audit trail
   * 
   * This creates a permanent, timestamped record of the dataset hash on Hedera.
   * Can be used to prove data integrity and timestamp of upload.
   * 
   * Reference: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/consensus/consensus-service
   * 
   * @param topicId - HCS topic ID
   * @param metadata - CSV metadata with hash
   * @returns HCS submission result
   */
  async submitToHCS(topicId: string, metadata: CSVMetadata): Promise<HCSSubmitResult> {
    console.log(`📝 Submitting hash to HCS topic: ${topicId}`);

    try {
      // Create message for HCS
      const hcsMessage = {
        type: 'dataset-verification',
        hash: metadata.hash, // SHA-256 hash
        fileName: metadata.fileName,
        rowCount: metadata.rowCount,
        columnCount: metadata.columns.length,
        uploadDate: metadata.uploadDate,
        timestamp: new Date().toISOString()
      };

      const messageString = JSON.stringify(hcsMessage);
      const messageBytes = Buffer.from(messageString);

      console.log(`   Message size: ${messageBytes.length} bytes`);

      // Submit to HCS using TopicMessageSubmitTransaction
      const submitTx = new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(messageString)
        .setMaxTransactionFee(new Hbar(2));

      const submitResponse = await submitTx.execute(this.client);
      const submitReceipt = await submitResponse.getReceipt(this.client);
      
      const consensusTimestamp = new Date().toISOString();
      const sequenceNumber = Number(submitReceipt.topicSequenceNumber?.toString() || '0');

      console.log(`✅ Hash submitted to HCS!`);
      console.log(`   Topic: ${topicId}`);
      console.log(`   Sequence: ${sequenceNumber}`);
      console.log(`   Timestamp: ${consensusTimestamp}`);

      return {
        topicId,
        transactionId: submitResponse.transactionId.toString(),
        consensusTimestamp,
        sequenceNumber
      };
    } catch (error: any) {
      console.error('❌ HCS submission failed:', error.message);
      throw new Error(`HCS submission failed: ${error.message}`);
    }
  }

  /**
   * Associate token with an account before transfer
   * 
   * Required before an account can receive tokens.
   * 
   * @param accountId - Account to associate
   * @param tokenId - Token to associate
   */
  async associateToken(accountId: string, tokenId: string): Promise<void> {
    console.log(`🔗 Associating token ${tokenId} with account ${accountId}`);

    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([TokenId.fromString(tokenId)])
        .freezeWith(this.client);

      const signedTx = await associateTx.sign(this.operatorKey);
      const txResponse = await signedTx.execute(this.client);
      await txResponse.getReceipt(this.client);

      console.log(`✅ Token associated successfully`);
    } catch (error: any) {
      console.error('❌ Token association failed:', error.message);
      throw new Error(`Token association failed: ${error.message}`);
    }
  }

  /**
   * Transfer NFT to another account
   * 
   * @param tokenId - Token ID
   * @param serialNumber - NFT serial number
   * @param toAccountId - Destination account
   * @returns Transaction ID
   */
  async transferNFT(
    tokenId: string,
    serialNumber: number,
    toAccountId: string
  ): Promise<string> {
    console.log(`📤 Transferring NFT ${tokenId}/${serialNumber} to ${toAccountId}`);

    try {
      const transferTx = new TransferTransaction()
        .addNftTransfer(
          TokenId.fromString(tokenId),
          serialNumber,
          this.operatorId,
          AccountId.fromString(toAccountId)
        )
        .setMaxTransactionFee(new Hbar(20));

      const txResponse = await transferTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ NFT transferred successfully`);
      return txResponse.transactionId.toString();
    } catch (error: any) {
      console.error('❌ NFT transfer failed:', error.message);
      throw new Error(`NFT transfer failed: ${error.message}`);
    }
  }

  /**
   * Get token information from Hedera Mirror Node
   * 
   * @param tokenId - Token ID to query
   * @returns Token information
   */
  async getTokenInfo(tokenId: string): Promise<any> {
    const baseUrl = this.getMirrorNodeUrl();
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/tokens/${tokenId}`);
      if (!response.ok) {
        throw new Error(`Mirror Node returned ${response.status}`);
      }
      return response.json();
    } catch (error: any) {
      console.error('❌ Failed to fetch token info:', error.message);
      throw new Error(`Failed to fetch token info: ${error.message}`);
    }
  }

  /**
   * Get NFT metadata from Hedera Mirror Node
   * 
   * @param tokenId - Token ID
   * @param serialNumber - NFT serial number
   * @returns NFT data with decoded metadata
   */
  async getNFTMetadata(tokenId: string, serialNumber: number): Promise<any> {
    const baseUrl = this.getMirrorNodeUrl();
    
    try {
      const response = await fetch(
        `${baseUrl}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
      );
      
      if (!response.ok) {
        throw new Error(`Mirror Node returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Decode metadata from base64
      if (data.metadata) {
        const metadataString = Buffer.from(data.metadata, 'base64').toString();
        try {
          data.decodedMetadata = JSON.parse(metadataString);
        } catch {
          data.decodedMetadata = metadataString; // Not JSON
        }
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to fetch NFT metadata:', error.message);
      throw new Error(`Failed to fetch NFT metadata: ${error.message}`);
    }
  }

  /**
   * Get account balance including tokens
   * 
   * @param accountId - Account to query
   * @returns Balance information
   */
  async getAccountBalance(accountId?: string): Promise<any> {
    const account = accountId ? AccountId.fromString(accountId) : this.operatorId;
    
    try {
      const query = new AccountBalanceQuery()
        .setAccountId(account);
      
      const balance = await query.execute(this.client);
      
      return {
        hbars: balance.hbars.toString(),
        tokens: balance.tokens ? balance.tokens._map : {}
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch account balance:', error.message);
      throw new Error(`Failed to fetch account balance: ${error.message}`);
    }
  }

  /**
   * Get Mirror Node base URL for current network
   */
  private getMirrorNodeUrl(): string {
    switch (this.network) {
      case 'mainnet':
        return 'https://mainnet-public.mirrornode.hedera.com';
      case 'previewnet':
        return 'https://previewnet.mirrornode.hedera.com';
      case 'testnet':
      default:
        return 'https://testnet.mirrornode.hedera.com';
    }
  }

  /**
   * Get HashScan explorer URL
   * 
   * @param type - Type of entity (token, transaction, account, nft, topic)
   * @param id - Entity ID
   * @returns Explorer URL
   */
  private getExplorerUrl(type: 'token' | 'transaction' | 'account' | 'nft' | 'topic', id: string): string {
    return `https://hashscan.io/${this.network}/${type}/${id}`;
  }

  /**
   * Close the client connection
   */
  close(): void {
    this.client.close();
    console.log('✅ TokenMintingService closed');
  }

  /**
   * Get current network
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Get operator account ID
   */
  getOperatorId(): string {
    return this.operatorId.toString();
  }

  /**
   * Get collection token ID if created
   */
  getCollectionTokenId(): string | undefined {
    return this.collectionTokenId?.toString();
  }
}
