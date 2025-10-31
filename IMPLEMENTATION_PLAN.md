# CSV-to-HTS Token Minting Feature - Implementation Plan

## 🎯 Feature Overview

**Goal:** Build a tool that reads CSV files, validates them, and mints HTS tokens (NFTs or fungible tokens) representing each row/dataset with metadata stored on-chain.

**Use Case:** "Tokenized Data Marketplace for Analytics Datasets"

---

## 🏗️ Architecture

```
┌─────────────┐
│  CSV File   │
│  Upload     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Parse & Validate│
│  - Schema check  │
│  - Data quality  │
│  - Size limits   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Create Metadata │─────▶│ Optional:    │
│ - Hash CSV      │      │ Submit to    │
│ - Summary stats │      │ HCS Topic    │
│ - Schema info   │      │ (immutable)  │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│  Mint HTS Token │
│  - NFT or FT    │
│  - Metadata CID │
│  - Associate    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Display in     │
│  Dashboard      │
│  - Token list   │
│  - Metadata     │
│  - Transfer UI  │
└─────────────────┘
```

---

## 📋 Implementation Steps

### Phase 1: CSV Processing Service (2-3 hours)

**File:** `lib/services/csv-processor.ts`

```typescript
import Papa from 'papaparse';
import { createHash } from 'crypto';

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  sampleData: any[];
  hash: string;
  estimatedSize: number;
}

export interface CSVMetadata {
  fileName: string;
  uploadDate: string;
  hash: string;
  rowCount: number;
  columns: string[];
  schema: Record<string, string>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

export class CSVProcessor {
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxRows = 10000;

  async parseAndValidate(file: File): Promise<CSVValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of 10MB`);
    }

    // Read file
    const text = await file.text();
    const hash = createHash('sha256').update(text).digest('hex');

    // Parse CSV
    const parseResult = await new Promise<Papa.ParseResult<any>>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: (error) => {
          errors.push(`Parse error: ${error.message}`);
        }
      });
    });

    const data = parseResult.data;
    const columns = parseResult.meta.fields || [];

    // Row count validation
    if (data.length === 0) {
      errors.push('CSV file is empty');
    } else if (data.length > this.maxRows) {
      warnings.push(`File has ${data.length} rows. Only first ${this.maxRows} will be processed.`);
    }

    // Column validation
    if (columns.length === 0) {
      errors.push('No columns detected in CSV');
    } else if (columns.length > 50) {
      warnings.push(`File has ${columns.length} columns. This may impact performance.`);
    }

    // Data quality checks
    const emptyRows = data.filter(row => 
      Object.values(row).every(val => !val || val === '')
    ).length;

    if (emptyRows > 0) {
      warnings.push(`Found ${emptyRows} empty rows that will be skipped`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      rowCount: data.length,
      columnCount: columns.length,
      columns,
      sampleData: data.slice(0, 5),
      hash,
      estimatedSize: file.size
    };
  }

  async createMetadata(file: File, validationResult: CSVValidationResult): Promise<CSVMetadata> {
    const text = await file.text();
    const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
    const data = parseResult.data;

    // Infer schema
    const schema: Record<string, string> = {};
    if (data.length > 0) {
      const firstRow = data[0] as any;
      for (const [key, value] of Object.entries(firstRow)) {
        schema[key] = this.inferType(value);
      }
    }

    return {
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      hash: validationResult.hash,
      rowCount: validationResult.rowCount,
      columns: validationResult.columns,
      schema,
      summary: {
        totalRows: validationResult.rowCount,
        validRows: validationResult.rowCount - (validationResult.warnings.length > 0 ? 1 : 0),
        invalidRows: 0
      }
    };
  }

  private inferType(value: any): string {
    if (value === null || value === undefined || value === '') return 'string';
    if (!isNaN(Number(value))) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (Date.parse(value)) return 'date';
    return 'string';
  }

  async calculateStats(file: File): Promise<Record<string, any>> {
    const text = await file.text();
    const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
    const data = parseResult.data;

    const stats: Record<string, any> = {
      rowCount: data.length,
      columnCount: parseResult.meta.fields?.length || 0
    };

    // Calculate numeric column statistics
    if (parseResult.meta.fields && data.length > 0) {
      for (const field of parseResult.meta.fields) {
        const values = data.map((row: any) => row[field]).filter(v => !isNaN(Number(v)));
        
        if (values.length > 0) {
          const numbers = values.map(Number);
          stats[field] = {
            count: numbers.length,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
            sum: numbers.reduce((a, b) => a + b, 0)
          };
        }
      }
    }

    return stats;
  }
}
```

---

### Phase 2: HTS Token Minting Service (3-4 hours)

**File:** `lib/services/token-minting.ts`

```typescript
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
  Hbar
} from "@hashgraph/sdk";
import { CSVMetadata } from './csv-processor';

export interface TokenMintResult {
  tokenId: string;
  serialNumber?: number;
  transactionId: string;
  timestamp: string;
  explorerUrl: string;
}

export interface DatasetToken {
  tokenId: string;
  name: string;
  symbol: string;
  metadata: CSVMetadata;
  mintedAt: string;
  serialNumber?: number;
  ownerAccountId: string;
}

export class TokenMintingService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private network: 'testnet' | 'mainnet';
  
  // Collection token ID (created once, reused for all datasets)
  private collectionTokenId?: TokenId;

  constructor(
    accountId: string,
    privateKey: string,
    network: 'testnet' | 'mainnet' = 'testnet'
  ) {
    this.network = network;
    this.client = network === 'testnet' 
      ? Client.forTestnet() 
      : Client.forMainnet();
    
    this.operatorId = AccountId.fromString(accountId);
    this.operatorKey = PrivateKey.fromString(privateKey);
    
    this.client.setOperator(this.operatorId, this.operatorKey);
  }

  /**
   * Create NFT collection for datasets (one-time operation)
   */
  async createDatasetCollection(): Promise<TokenId> {
    if (this.collectionTokenId) {
      return this.collectionTokenId;
    }

    const transaction = new TokenCreateTransaction()
      .setTokenName("Analytics Dataset NFTs")
      .setTokenSymbol("DATASET")
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(this.operatorId)
      .setSupplyKey(this.operatorKey)
      .setAdminKey(this.operatorKey)
      .setMaxTransactionFee(new Hbar(50));

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    
    this.collectionTokenId = receipt.tokenId!;
    
    console.log(`✅ Created NFT Collection: ${this.collectionTokenId}`);
    return this.collectionTokenId;
  }

  /**
   * Mint NFT for a single dataset
   */
  async mintDatasetNFT(metadata: CSVMetadata): Promise<TokenMintResult> {
    // Ensure collection exists
    const tokenId = this.collectionTokenId || await this.createDatasetCollection();

    // Create metadata JSON
    const nftMetadata = {
      name: `Dataset: ${metadata.fileName}`,
      description: `Analytics dataset with ${metadata.rowCount} rows and ${metadata.columns.length} columns`,
      type: "analytics-dataset",
      properties: {
        fileName: metadata.fileName,
        uploadDate: metadata.uploadDate,
        dataHash: metadata.hash,
        rowCount: metadata.rowCount,
        columns: metadata.columns,
        schema: metadata.schema,
        summary: metadata.summary
      },
      created: new Date().toISOString()
    };

    // Convert to bytes
    const metadataBytes = Buffer.from(JSON.stringify(nftMetadata));

    // Mint NFT
    const mintTx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .addMetadata(metadataBytes)
      .setMaxTransactionFee(new Hbar(20));

    const mintTxResponse = await mintTx.execute(this.client);
    const mintReceipt = await mintTxResponse.getReceipt(this.client);
    
    const serialNumber = mintReceipt.serials[0].toNumber();
    const timestamp = mintReceipt.consensusTimestamp?.toString() || new Date().toISOString();

    return {
      tokenId: tokenId.toString(),
      serialNumber,
      transactionId: mintTxResponse.transactionId.toString(),
      timestamp,
      explorerUrl: `https://hashscan.io/${this.network}/transaction/${mintTxResponse.transactionId}`
    };
  }

  /**
   * Mint fungible tokens representing data rows
   * Each token = 1 row of data
   */
  async mintDataRowTokens(metadata: CSVMetadata): Promise<TokenMintResult> {
    // Create fungible token
    const createTx = new TokenCreateTransaction()
      .setTokenName(`Rows: ${metadata.fileName}`)
      .setTokenSymbol("ROW")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(metadata.rowCount) // Mint 1 token per row
      .setTreasuryAccountId(this.operatorId)
      .setSupplyKey(this.operatorKey)
      .setAdminKey(this.operatorKey)
      .setMaxTransactionFee(new Hbar(50));

    const txResponse = await createTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);
    const tokenId = receipt.tokenId!;

    return {
      tokenId: tokenId.toString(),
      transactionId: txResponse.transactionId.toString(),
      timestamp: receipt.consensusTimestamp?.toString() || new Date().toISOString(),
      explorerUrl: `https://hashscan.io/${this.network}/token/${tokenId}`
    };
  }

  /**
   * Associate token with an account before transfer
   */
  async associateToken(accountId: string, tokenId: string): Promise<void> {
    const associateTx = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([TokenId.fromString(tokenId)])
      .freezeWith(this.client);

    const signedTx = await associateTx.sign(this.operatorKey);
    const txResponse = await signedTx.execute(this.client);
    await txResponse.getReceipt(this.client);
  }

  /**
   * Transfer NFT to another account
   */
  async transferNFT(
    tokenId: string,
    serialNumber: number,
    toAccountId: string
  ): Promise<string> {
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

    return txResponse.transactionId.toString();
  }

  /**
   * Get token metadata from Hedera
   */
  async getTokenInfo(tokenId: string): Promise<any> {
    const baseUrl = this.network === 'testnet' 
      ? 'https://testnet.mirrornode.hedera.com'
      : 'https://mainnet-public.mirrornode.hedera.com';
    
    const response = await fetch(`${baseUrl}/api/v1/tokens/${tokenId}`);
    return response.json();
  }

  /**
   * Get NFT metadata
   */
  async getNFTMetadata(tokenId: string, serialNumber: number): Promise<any> {
    const baseUrl = this.network === 'testnet' 
      ? 'https://testnet.mirrornode.hedera.com'
      : 'https://mainnet-public.mirrornode.hedera.com';
    
    const response = await fetch(
      `${baseUrl}/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
    );
    const data = await response.json();
    
    // Decode metadata
    if (data.metadata) {
      const metadataString = Buffer.from(data.metadata, 'base64').toString();
      data.decodedMetadata = JSON.parse(metadataString);
    }
    
    return data;
  }
}
```

---

### Phase 3: Frontend Components (3-4 hours)

#### A. CSV Upload Component

**File:** `components/CSVTokenizer.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { CSVProcessor, CSVValidationResult, CSVMetadata } from '@/lib/services/csv-processor';
import toast from 'react-hot-toast';

interface Props {
  onTokenMinted?: (result: any) => void;
}

export default function CSVTokenizer({ onTokenMinted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<CSVValidationResult | null>(null);
  const [metadata, setMetadata] = useState<CSVMetadata | null>(null);
  const [processing, setProcessing] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<any>(null);

  const processor = new CSVProcessor();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setValidation(null);
    setMetadata(null);
    setMintResult(null);
    setProcessing(true);

    try {
      const result = await processor.parseAndValidate(selectedFile);
      setValidation(result);

      if (result.isValid) {
        const meta = await processor.createMetadata(selectedFile, result);
        setMetadata(meta);
        toast.success('CSV validated successfully!');
      } else {
        toast.error('CSV validation failed');
      }
    } catch (error: any) {
      toast.error(`Error processing CSV: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleMintNFT = async () => {
    if (!metadata) return;

    setMinting(true);
    try {
      // Call API route to mint token
      const response = await fetch('/api/mint-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) {
        throw new Error('Failed to mint token');
      }

      const result = await response.json();
      setMintResult(result);
      toast.success('Dataset NFT minted successfully!');
      
      if (onTokenMinted) {
        onTokenMinted(result);
      }
    } catch (error: any) {
      toast.error(`Minting failed: ${error.message}`);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Tokenize CSV Dataset
      </h2>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload CSV File
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {file ? file.name : 'Click to upload CSV file'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Max 10MB, up to 10,000 rows</p>
          </label>
        </div>
      </div>

      {/* Processing Indicator */}
      {processing && (
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validating CSV...</span>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${
            validation.isValid 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-semibold ${
                validation.isValid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                {validation.isValid ? 'Validation Passed' : 'Validation Failed'}
              </span>
            </div>

            {validation.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Warnings:</p>
                <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                  {validation.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.isValid && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Rows:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                    {validation.rowCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Columns:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                    {validation.columnCount}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Hash:</span>
                  <p className="font-mono text-xs text-gray-900 dark:text-white break-all mt-1">
                    {validation.hash}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample Data Preview */}
      {validation?.isValid && validation.sampleData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Sample Data (first 5 rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {validation.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validation.sampleData.map((row, i) => (
                  <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                    {validation.columns.map((col, j) => (
                      <td key={j} className="px-3 py-2 text-gray-900 dark:text-white">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mint Button */}
      {validation?.isValid && metadata && !mintResult && (
        <button
          onClick={handleMintNFT}
          disabled={minting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
        >
          {minting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Minting Dataset NFT...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Mint Dataset NFT on Hedera
            </>
          )}
        </button>
      )}

      {/* Mint Result */}
      {mintResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">
              NFT Minted Successfully!
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Token ID:</span>
              <p className="font-mono text-gray-900 dark:text-white">{mintResult.tokenId}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Serial Number:</span>
              <p className="font-mono text-gray-900 dark:text-white">{mintResult.serialNumber}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
              <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                {mintResult.transactionId}
              </p>
            </div>
          </div>

          <a
            href={mintResult.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            View on HashScan
          </a>
        </div>
      )}
    </div>
  );
}
```

---

#### B. Tokenized Data Dashboard

**File:** `app/tokenized-data/page.tsx`

```typescript
import { Suspense } from 'react';
import CSVTokenizer from '@/components/CSVTokenizer';
import { Database, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TokenizedDataPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tokenized Datasets
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Transform CSV data into Hedera NFTs
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <CSVTokenizer />
          </div>

          {/* Info Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                How It Works
              </h3>
              <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600">1.</span>
                  <span>Upload your CSV file (max 10MB)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600">2.</span>
                  <span>System validates data quality and structure</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600">3.</span>
                  <span>Metadata is hashed for integrity</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600">4.</span>
                  <span>NFT is minted on Hedera with metadata</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600">5.</span>
                  <span>Token can be transferred or traded</span>
                </li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Use Cases</h3>
              <ul className="space-y-2 text-sm">
                <li>• Data Marketplace</li>
                <li>• Research Attribution</li>
                <li>• Supply Chain Records</li>
                <li>• Financial Reports</li>
                <li>• IoT Data Streams</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

### Phase 4: API Route (1-2 hours)

**File:** `app/api/mint-dataset/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TokenMintingService } from '@/lib/services/token-minting';
import { TopicMessageSubmitTransaction, TopicId, Client } from '@hashgraph/sdk';

export async function POST(request: NextRequest) {
  try {
    const { metadata } = await request.json();

    // Initialize minting service
    const mintingService = new TokenMintingService(
      process.env.HEDERA_ACCOUNT_ID!,
      process.env.HEDERA_PRIVATE_KEY!,
      'testnet'
    );

    // Optional: Submit hash to HCS for immutability
    let hcsTimestamp = null;
    if (process.env.HCS_TOPIC_ID) {
      const client = Client.forTestnet();
      client.setOperator(
        process.env.HEDERA_ACCOUNT_ID!,
        process.env.HEDERA_PRIVATE_KEY!
      );

      const hcsMessage = {
        type: 'dataset-verification',
        hash: metadata.hash,
        fileName: metadata.fileName,
        rowCount: metadata.rowCount,
        timestamp: new Date().toISOString()
      };

      const submitTx = new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(process.env.HCS_TOPIC_ID))
        .setMessage(JSON.stringify(hcsMessage));

      const submitResponse = await submitTx.execute(client);
      const submitReceipt = await submitResponse.getReceipt(client);
      hcsTimestamp = submitReceipt.consensusTimestamp?.toString();
    }

    // Mint NFT
    const result = await mintingService.mintDatasetNFT(metadata);

    return NextResponse.json({
      ...result,
      hcsTimestamp,
      metadata
    });

  } catch (error: any) {
    console.error('Minting error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mint token' },
      { status: 500 }
    );
  }
}
```

---

### Phase 5: Environment Setup

**File:** `.env.local`

```bash
# Hedera Credentials
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=302e...

# Optional: HCS Topic for verification
HCS_TOPIC_ID=0.0.YOUR_TOPIC_ID

# Network
HEDERA_NETWORK=testnet
```

---

### Phase 6: Dependencies

**Add to `package.json`:**

```json
{
  "dependencies": {
    "@hashgraph/sdk": "^2.76.0",
    "papaparse": "^5.4.1",
    // ... existing deps
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14",
    // ... existing deps
  }
}
```

---

## 🚀 Testing Plan

### 1. Create Sample CSV

**File:** `public/examples/sample-sales.csv`

```csv
date,product,quantity,price,customer_id
2024-01-01,Widget A,10,29.99,C001
2024-01-02,Widget B,5,49.99,C002
2024-01-03,Widget A,15,29.99,C003
2024-01-04,Widget C,8,79.99,C001
2024-01-05,Widget B,12,49.99,C004
```

### 2. Test Flow

1. Navigate to `/tokenized-data`
2. Upload `sample-sales.csv`
3. Verify validation passes
4. Click "Mint Dataset NFT"
5. Wait for confirmation
6. Click "View on HashScan"
7. Verify NFT metadata on explorer

---

## 📊 Impact on Hackathon Score

### Before This Feature: 25%
- ✅ UI/UX
- ✅ Mirror Node
- ❌ No DLT integration

### After This Feature: 70-75%
- ✅ Legacy Data Import (CSV)
- ✅ HTS Tokenization (NFTs)
- ✅ Real-world Use Case (Data Marketplace)
- ✅ Hedera SDK Integration
- ⚠️ Still need: Smart Contracts (optional)

### With Smart Contract Addition: 85-90%
Add validation contract that verifies CSV hash before minting.

---

## 🎯 Next Steps

1. Install `papaparse` dependency
2. Implement CSV processor
3. Implement token minting service
4. Build UI components
5. Create API route
6. Test with sample data
7. Document in README
8. Create demo video

**Estimated Time:** 10-14 hours total

---

## 💡 Enhanced Features (Optional)

1. **Batch Minting**: Mint 1 NFT per CSV row
2. **Data Marketplace**: List/buy/sell dataset NFTs
3. **Smart Contract Validator**: On-chain CSV schema validation
4. **IPFS Storage**: Store full CSV on IPFS, only hash on-chain
5. **Access Control**: Burn tokens to unlock CSV download
6. **Analytics**: Dashboard showing all minted datasets

This feature would transform your project from a "blockchain viewer" to a "DLT-powered data platform"! 🚀
