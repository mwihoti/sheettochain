'use client';

import React, { useState } from 'react';
import { CSVProcessor, CSVValidationResult, CSVMetadata } from '@/lib/services/csv-processor';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Info } from 'lucide-react';

export default function CSVTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validation, setValidation] = useState<CSVValidationResult | null>(null);
  const [metadata, setMetadata] = useState<CSVMetadata | null>(null);
  const [stats, setStats] = useState<any>(null);

  const processor = new CSVProcessor();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setValidation(null);
    setMetadata(null);
    setStats(null);
    setProcessing(true);

    try {
      // Validate CSV
      console.log('Starting validation...');
      const validationResult = await processor.parseAndValidate(selectedFile);
      console.log('Validation result:', validationResult);
      setValidation(validationResult);

      if (validationResult.isValid) {
        // Create metadata
        console.log('Creating metadata...');
        const meta = await processor.createMetadata(selectedFile, validationResult);
        console.log('Metadata:', meta);
        setMetadata(meta);

        // Calculate stats
        console.log('Calculating stats...');
        const statistics = await processor.calculateStats(selectedFile);
        console.log('Stats:', statistics);
        setStats(statistics);
      }
    } catch (error: any) {
      console.error('Error processing CSV:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            CSV Processor Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Phase 1 Implementation - Testing CSV parsing and validation
          </p>

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
              <span>Processing CSV...</span>
            </div>
          )}

          {/* Validation Results */}
          {validation && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Validation Results
              </h2>
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

                {/* Errors */}
                {validation.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                      {validation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {validation.warnings.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                      {validation.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary Stats */}
                {validation.isValid && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rows</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {validation.rowCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Columns</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {validation.columnCount}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">File Size</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {(validation.estimatedSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                )}

                {/* SHA-256 Hash */}
                {validation.isValid && (
                  <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SHA-256 Hash (for HCS):</p>
                    <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                      {validation.hash}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sample Data Preview */}
          {validation?.isValid && validation.sampleData.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Sample Data (first 5 rows)
              </h2>
              <div className="overflow-x-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <table className="min-w-full text-sm">
                  <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                    <tr>
                      {validation.columns.map((col, i) => (
                        <th key={i} className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.sampleData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                        {validation.columns.map((col, j) => (
                          <td key={j} className="px-4 py-2 text-gray-900 dark:text-white">
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

          {/* Metadata */}
          {metadata && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                HTS Metadata (for NFT)
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">File Name</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{metadata.fileName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upload Date</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{metadata.uploadDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Rows</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{metadata.summary.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Valid Rows</p>
                    <p className="text-lg font-bold text-green-600">{metadata.summary.validRows}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Schema (inferred types):</p>
                  <div className="bg-white dark:bg-gray-800 rounded p-3">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                      {JSON.stringify(metadata.schema, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Full Metadata JSON:</p>
                  <div className="bg-white dark:bg-gray-800 rounded p-3">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Statistical Summary
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-2">Phase 1 Complete ✓</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV parsing and validation working</li>
                  <li>Metadata generation for HTS NFT ready</li>
                  <li>SHA-256 hash calculated for HCS submission</li>
                  <li>Schema inference and statistics working</li>
                  <li>Ready for Phase 2: Token Minting Service</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
