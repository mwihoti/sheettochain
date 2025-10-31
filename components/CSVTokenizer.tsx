'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, ExternalLink, Hash } from 'lucide-react';
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
      toast.loading('Minting dataset NFT on Hedera...', { id: 'minting' });

      // Call API route to mint token
      const response = await fetch('/api/mint-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mint token');
      }

      const result = await response.json();
      setMintResult(result);
      
      // Save to localStorage for gallery
      const nftRecord = {
        tokenId: result.tokenId,
        serialNumber: result.serialNumber,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        explorerUrl: result.explorerUrl
      };
      
      const existing = localStorage.getItem('minted-nfts');
      const nfts = existing ? JSON.parse(existing) : [];
      nfts.unshift(nftRecord); // Add to beginning
      localStorage.setItem('minted-nfts', JSON.stringify(nfts));
      
      toast.success('Dataset NFT minted successfully!', { id: 'minting' });
      
      if (onTokenMinted) {
        onTokenMinted(result);
      }
    } catch (error: any) {
      toast.error(`Minting failed: ${error.message}`, { id: 'minting' });
    } finally {
      setMinting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setMetadata(null);
    setMintResult(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Tokenize CSV Dataset
      </h2>

      {/* File Upload */}
      {!file && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload CSV File
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Click to upload CSV file
              </p>
              <p className="text-sm text-gray-500 mt-2">Max 10MB, up to 10,000 rows</p>
            </label>
          </div>
        </div>
      )}

      {/* File Info */}
      {file && !mintResult && (
        <div className="mb-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
            <span className="text-sm text-gray-500">
              ({(file.size / 1024).toFixed(2)} KB)
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}

      {/* Processing Indicator */}
      {processing && (
        <div className="flex items-center gap-2 text-blue-600 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
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
                {validation.isValid ? 'Validation Passed ✓' : 'Validation Failed ✗'}
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
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rows</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {validation.rowCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Columns</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {validation.columnCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {(validation.estimatedSize / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample Data Preview */}
      {validation?.isValid && validation.sampleData.length > 0 && !mintResult && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Sample Data (first 5 rows)
          </h3>
          <div className="overflow-x-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-300 dark:border-gray-600">
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
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                    {validation.columns.map((col, j) => (
                      <td key={j} className="px-3 py-2 text-gray-900 dark:text-white">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Hash */}
      {metadata && !mintResult && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Data Integrity Hash (SHA-256)
              </p>
              <p className="font-mono text-xs text-blue-900 dark:text-blue-200 break-all">
                {metadata.hash}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                This hash will be stored on Hedera Consensus Service for immutable verification
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mint Button */}
      {validation?.isValid && metadata && !mintResult && (
        <button
          onClick={handleMintNFT}
          disabled={minting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold transition-colors"
        >
          {minting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Minting Dataset NFT on Hedera...
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
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-bold text-green-800 dark:text-green-300 text-xl">
                NFT Minted Successfully!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your dataset has been tokenized on Hedera
              </p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Token ID</p>
              <p className="font-mono text-gray-900 dark:text-white font-semibold">
                {mintResult.tokenId}
              </p>
            </div>
            
            {mintResult.serialNumber && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial Number</p>
                <p className="font-mono text-gray-900 dark:text-white font-semibold">
                  #{mintResult.serialNumber}
                </p>
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transaction ID</p>
              <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                {mintResult.transactionId}
              </p>
            </div>

            {mintResult.hcsTimestamp && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  HCS Verification ✓
                </p>
                <p className="text-xs text-gray-900 dark:text-white">
                  Hash submitted to Hedera Consensus Service
                </p>
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Seq: {mintResult.hcsSequenceNumber}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <a
              href={mintResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              View on HashScan
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Mint Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
