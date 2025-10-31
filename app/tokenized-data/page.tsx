'use client';

import CSVTokenizer from '@/components/CSVTokenizer';
import { Database, TrendingUp, Coins, Shield, Zap, Globe, Layers } from 'lucide-react';
import Link from 'next/link';

export default function TokenizedDataPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Tokenized Datasets
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transform CSV data into Hedera NFTs with immutable verification
                </p>
              </div>
            </div>
            <Link 
              href="/token-gallery"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Layers className="w-4 h-4" />
              View Gallery
            </Link>
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
            {/* How It Works */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                How It Works
              </h3>
              <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">1.</span>
                  <span>Upload your CSV file (max 10MB)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">2.</span>
                  <span>System validates data quality and structure</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">3.</span>
                  <span>SHA-256 hash generated for integrity</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">4.</span>
                  <span>NFT minted on Hedera with metadata</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">5.</span>
                  <span>Hash submitted to HCS for audit trail</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-600 min-w-[20px]">6.</span>
                  <span>Token can be transferred or traded</span>
                </li>
              </ol>
            </div>

            {/* Hedera Features */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Hedera Features
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-semibold">HTS Tokenization</p>
                    <p className="text-purple-100 text-xs">Native NFT minting with on-chain metadata</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-semibold">HCS Verification</p>
                    <p className="text-purple-100 text-xs">Immutable timestamp and hash on consensus service</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-semibold">Public Verification</p>
                    <p className="text-purple-100 text-xs">Anyone can verify on HashScan explorer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                Real-World Use Cases
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>Data Marketplace:</strong> Sell proprietary datasets as NFTs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>Research Attribution:</strong> Prove data ownership and provenance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>Supply Chain:</strong> Tokenize shipment and inventory records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>Financial Reports:</strong> Immutable quarterly earnings data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>IoT Data Streams:</strong> Tokenize sensor data for verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span><strong>Compliance Reports:</strong> Auditable regulatory submissions</span>
                </li>
              </ul>
            </div>

            {/* Technical Details */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Technical Implementation
              </h4>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                <li>✓ Hedera Token Service (HTS) for NFT creation</li>
                <li>✓ Hedera Consensus Service (HCS) for hash verification</li>
                <li>✓ SHA-256 hashing for data integrity</li>
                <li>✓ On-chain metadata storage</li>
                <li>✓ Mirror Node API for data retrieval</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
