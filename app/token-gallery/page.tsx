'use client';

import React, { useState, useEffect } from 'react';
import { Database, ExternalLink, Loader2, AlertCircle, FileText, Hash, Calendar, Layers, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface MintedNFT {
  tokenId: string;
  serialNumber: number;
  metadata: any;
  timestamp: string;
  explorerUrl: string;
}

export default function TokenGalleryPage() {
  const [nfts, setNfts] = useState<MintedNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load NFTs from localStorage (in production, this would come from backend/blockchain)
  useEffect(() => {
    const loadNFTs = () => {
      try {
        const stored = localStorage.getItem('minted-nfts');
        if (stored) {
          const parsed = JSON.parse(stored);
          setNfts(parsed);
        }
      } catch (err) {
        console.error('Failed to load NFTs:', err);
        setError('Failed to load minted tokens');
      } finally {
        setLoading(false);
      }
    };

    loadNFTs();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const stored = localStorage.getItem('minted-nfts');
      if (stored) {
        setNfts(JSON.parse(stored));
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Token Gallery
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your tokenized datasets on Hedera
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/tokenized-data"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Mint New Dataset
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading your tokens...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && nfts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <Database className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Tokens Minted Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start by tokenizing your first CSV dataset
            </p>
            <Link
              href="/tokenized-data"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              <Database className="w-5 h-5" />
              Tokenize Dataset
            </Link>
          </div>
        )}

        {!loading && !error && nfts.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Minted Tokens
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {nfts.length} {nfts.length === 1 ? 'token' : 'tokens'} found
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft, index) => (
                <div
                  key={`${nft.tokenId}-${nft.serialNumber}-${index}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span className="font-semibold">Dataset NFT</span>
                      </div>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        #{nft.serialNumber}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* File Name */}
                    {nft.metadata?.fileName && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">File Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {nft.metadata.fileName}
                        </p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rows</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {nft.metadata?.rowCount?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Columns</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {nft.metadata?.columns?.length || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Token ID */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Token ID</p>
                      <p className="font-mono text-sm text-gray-900 dark:text-white">
                        {nft.tokenId}
                      </p>
                    </div>

                    {/* Hash */}
                    {nft.metadata?.hash && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          Data Hash
                        </p>
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
                          {nft.metadata.hash}
                        </p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Minted
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {new Date(nft.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {/* View on HashScan */}
                    <a
                      href={nft.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      View on HashScan
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info Box */}
        {!loading && !error && nfts.length > 0 && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> This gallery shows tokens stored locally. In production, 
              this would query the Hedera Mirror Node API to fetch all NFTs owned by your account.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
