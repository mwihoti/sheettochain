/**
 * API Route for minting dataset NFTs on Hedera
 * 
 * POST /api/mint-dataset
 * 
 * Request body:
 * {
 *   metadata: CSVMetadata
 * }
 * 
 * Response:
 * {
 *   tokenId: string,
 *   serialNumber: number,
 *   transactionId: string,
 *   explorerUrl: string,
 *   hcsTimestamp?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { TokenMintingService } from '@/lib/services/token-minting';
import { CSVMetadata } from '@/lib/services/csv-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadata } = body as { metadata: CSVMetadata };

    if (!metadata) {
      return NextResponse.json(
        { error: 'Missing metadata in request body' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = (process.env.HEDERA_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'previewnet';

    if (!accountId || !privateKey) {
      return NextResponse.json(
        { 
          error: 'Hedera credentials not configured',
          details: 'Please set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env.local'
        },
        { status: 500 }
      );
    }

    console.log('🚀 Starting dataset tokenization...');
    console.log(`   File: ${metadata.fileName}`);
    console.log(`   Rows: ${metadata.rowCount}`);
    console.log(`   Hash: ${metadata.hash.substring(0, 16)}...`);

    // Initialize minting service
    const mintingService = new TokenMintingService(
      accountId,
      privateKey,
      network
    );

    // Optional: Submit hash to HCS for immutable audit trail
    let hcsResult = null;
    const hcsTopicId = process.env.HCS_TOPIC_ID;

    if (hcsTopicId) {
      try {
        console.log('📝 Submitting hash to HCS...');
        hcsResult = await mintingService.submitToHCS(hcsTopicId, metadata);
        console.log(`✅ HCS submission successful`);
      } catch (error: any) {
        console.warn('⚠️ HCS submission failed (non-critical):', error.message);
        // Continue with minting even if HCS fails
      }
    } else {
      console.log('ℹ️ HCS_TOPIC_ID not set, skipping consensus submission');
    }

    // Mint NFT on Hedera Token Service
    console.log('🔨 Minting NFT...');
    const mintResult = await mintingService.mintDatasetNFT(metadata);
    console.log(`✅ NFT minted successfully!`);

    // Close client
    mintingService.close();

    // Return result
    return NextResponse.json({
      success: true,
      ...mintResult,
      hcsTimestamp: hcsResult?.consensusTimestamp,
      hcsSequenceNumber: hcsResult?.sequenceNumber,
      metadata: {
        fileName: metadata.fileName,
        rowCount: metadata.rowCount,
        hash: metadata.hash
      }
    });

  } catch (error: any) {
    console.error('❌ Minting API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to mint dataset NFT',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
