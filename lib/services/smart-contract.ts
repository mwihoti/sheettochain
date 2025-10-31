/**
 * Hedera Smart Contract Service (HSCS)
 * 
 * Provides integration with the DatasetRegistry smart contract on Hedera.
 * Enables on-chain dataset registration, validation, and verification.
 */

import { 
  Client, 
  ContractExecuteTransaction, 
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  AccountId
} from '@hashgraph/sdk';

export interface ContractDataset {
  hash: string;
  uploader: string;
  timestamp: number;
  rowCount: number;
  columnCount: number;
  tokenId: number;
  verified: boolean;
  fileName: string;
}

export interface ContractStats {
  totalDatasets: number;
  totalUploaders: number;
}

/**
 * Smart Contract Service for Dataset Registry
 */
export class SmartContractService {
  private client: Client;
  private contractId: ContractId;
  private operatorId: AccountId;

  /**
   * Initialize smart contract service
   * 
   * @param client Hedera client instance
   * @param contractAddress Contract ID (e.g., "0.0.123456")
   * @param operatorId Operator account ID
   */
  constructor(client: Client, contractAddress: string, operatorId: string) {
    this.client = client;
    this.contractId = ContractId.fromString(contractAddress);
    this.operatorId = AccountId.fromString(operatorId);
  }

  /**
   * Register dataset on smart contract
   * 
   * @param hash SHA-256 hash of CSV data (as hex string)
   * @param rowCount Number of rows
   * @param columnCount Number of columns
   * @param fileName File name (max 50 chars)
   * @returns Transaction result
   */
  async registerDataset(
    hash: string,
    rowCount: number,
    columnCount: number,
    fileName: string
  ): Promise<{ success: boolean; transactionId: string; error?: string }> {
    try {
      console.log('📝 Registering dataset on smart contract...');
      console.log(`   Hash: ${hash.substring(0, 16)}...`);
      console.log(`   Rows: ${rowCount}, Columns: ${columnCount}`);
      console.log(`   File: ${fileName}`);

      // Convert hex hash to bytes32
      const hashBytes = this.hexToBytes32(hash);

      // Prepare contract function parameters
      const params = new ContractFunctionParameters()
        .addBytes32(hashBytes)              // bytes32 _hash
        .addUint256(rowCount)               // uint256 _rowCount
        .addUint256(columnCount)            // uint256 _columnCount
        .addString(fileName.substring(0, 50)); // string _fileName (truncate to 50)

      // Execute contract function
      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(500000)  // Increased gas for storage operations
        .setFunction('registerDataset', params)
        .setMaxTransactionFee(new Hbar(2));

      const submitTx = await contractExecTx.execute(this.client);
      const receipt = await submitTx.getReceipt(this.client);

      console.log('✅ Dataset registered on-chain!');
      console.log(`   Transaction: ${submitTx.transactionId}`);
      console.log(`   Status: ${receipt.status.toString()}`);

      return {
        success: true,
        transactionId: submitTx.transactionId.toString()
      };
    } catch (error: any) {
      console.error('❌ Smart contract registration failed:', error.message);
      
      return {
        success: false,
        transactionId: '',
        error: error.message
      };
    }
  }

  /**
   * Link HTS token ID to registered dataset
   * 
   * @param hash Dataset hash
   * @param tokenId HTS token ID
   * @returns Transaction result
   */
  async linkToken(
    hash: string,
    tokenId: string
  ): Promise<{ success: boolean; transactionId: string }> {
    try {
      console.log('🔗 Linking token to dataset...');
      console.log(`   Hash: ${hash.substring(0, 16)}...`);
      console.log(`   Token ID: ${tokenId}`);

      const hashBytes = this.hexToBytes32(hash);
      const tokenIdNum = parseInt(tokenId.split('.')[2]); // Extract from "0.0.123456"

      const params = new ContractFunctionParameters()
        .addBytes32(hashBytes)
        .addUint256(tokenIdNum);

      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunction('linkToken', params)
        .setMaxTransactionFee(new Hbar(1));

      const submitTx = await contractExecTx.execute(this.client);
      const receipt = await submitTx.getReceipt(this.client);

      console.log('✅ Token linked on-chain!');
      console.log(`   Transaction: ${submitTx.transactionId}`);

      return {
        success: true,
        transactionId: submitTx.transactionId.toString()
      };
    } catch (error: any) {
      console.error('❌ Token linking failed:', error.message);
      return {
        success: false,
        transactionId: ''
      };
    }
  }

  /**
   * Check if dataset hash exists on contract
   * 
   * @param hash Dataset hash
   * @returns Whether dataset exists
   */
  async datasetExists(hash: string): Promise<boolean> {
    try {
      const hashBytes = this.hexToBytes32(hash);

      const params = new ContractFunctionParameters()
        .addBytes32(hashBytes);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction('datasetExists', params);

      const result = await query.execute(this.client);
      
      // Parse boolean result
      const exists = result.getBool(0);
      
      console.log(`📊 Dataset exists check: ${exists}`);
      return exists;
    } catch (error: any) {
      console.error('❌ Dataset exists query failed:', error.message);
      return false;
    }
  }

  /**
   * Check if dataset is verified
   * 
   * @param hash Dataset hash
   * @returns Verification status
   */
  async isVerified(hash: string): Promise<boolean> {
    try {
      const hashBytes = this.hexToBytes32(hash);

      const params = new ContractFunctionParameters()
        .addBytes32(hashBytes);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction('isVerified', params);

      const result = await query.execute(this.client);
      const verified = result.getBool(0);
      
      console.log(`✅ Verification status: ${verified}`);
      return verified;
    } catch (error: any) {
      console.error('❌ Verification query failed:', error.message);
      return false;
    }
  }

  /**
   * Get contract statistics
   * 
   * @returns Total datasets and uploaders
   */
  async getStats(): Promise<ContractStats> {
    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction('getStats');

      const result = await query.execute(this.client);
      
      const totalDatasets = result.getUint256(0).toNumber();
      const totalUploaders = result.getUint256(1).toNumber();
      
      console.log(`📊 Contract stats:`);
      console.log(`   Total datasets: ${totalDatasets}`);
      console.log(`   Total uploaders: ${totalUploaders}`);

      return { totalDatasets, totalUploaders };
    } catch (error: any) {
      console.error('❌ Stats query failed:', error.message);
      return { totalDatasets: 0, totalUploaders: 0 };
    }
  }

  /**
   * Get uploader's dataset count
   * 
   * @param uploaderAddress Uploader account ID
   * @returns Number of datasets
   */
  async getUploaderDatasetCount(uploaderAddress: string): Promise<number> {
    try {
      const params = new ContractFunctionParameters()
        .addAddress(uploaderAddress);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction('getUploaderDatasetCount', params);

      const result = await query.execute(this.client);
      const count = result.getUint256(0).toNumber();
      
      console.log(`📊 Uploader ${uploaderAddress} has ${count} datasets`);
      return count;
    } catch (error: any) {
      console.error('❌ Count query failed:', error.message);
      return 0;
    }
  }

  /**
   * Convert hex string to bytes32
   * 
   * @param hex Hex string (with or without 0x prefix)
   * @returns Bytes32 array
   */
  private hexToBytes32(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Ensure 64 characters (32 bytes)
    const paddedHex = cleanHex.padEnd(64, '0');
    
    // Convert to byte array
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(paddedHex.substr(i * 2, 2), 16);
    }
    
    return bytes;
  }
}
