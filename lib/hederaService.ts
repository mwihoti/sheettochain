// lib/hederaService.ts
class HederaService {
  private baseUrl: string;

  constructor(network: 'testnet' | 'mainnet' | 'previewnet' = 'testnet') {
    const urls = {
      mainnet: 'https://mainnet-public.mirrornode.hedera.com',
      testnet: 'https://testnet.mirrornode.hedera.com',
      previewnet: 'https://previewnet.mirrornode.hedera.com'
    };
    this.baseUrl = urls[network];
  }

  async getTransactions(limit: number = 10, order: 'asc' | 'desc' = 'desc') {
    const response = await fetch(
      `${this.baseUrl}/api/v1/transactions?limit=${limit}&order=${order}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }

  async getAccountTransactions(accountId: string, limit: number = 100) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`,
      { next: { revalidate: 60 } }
    );
    if (!response.ok) throw new Error('Failed to fetch account transactions');
    return response.json();
  }

  async getAccountInfo(accountId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/accounts/${accountId}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    if (!response.ok) throw new Error('Failed to fetch account info');
    return response.json();
  }

  async getTokenInfo(tokenId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/tokens/${tokenId}`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) throw new Error('Failed to fetch token info');
    return response.json();
  }

  async getNetworkNodes() {
    const response = await fetch(
      `${this.baseUrl}/api/v1/network/nodes`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    if (!response.ok) throw new Error('Failed to fetch network nodes');
    return response.json();
  }

  async getNetworkSupply() {
    const response = await fetch(
      `${this.baseUrl}/api/v1/network/supply`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) throw new Error('Failed to fetch network supply');
    return response.json();
  }

  // Client-side only methods (no caching)
  async getTransactionsPaginated(params: {
    accountId?: string;
    limit?: number;
    order?: 'asc' | 'desc';
    timestamp?: string;
  }) {
    const query = new URLSearchParams();
    if (params.accountId) query.append('account.id', params.accountId);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.order) query.append('order', params.order);
    if (params.timestamp) query.append('timestamp', params.timestamp);

    const response = await fetch(
      `${this.baseUrl}/api/v1/transactions?${query}`
    );
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }
}

// Export instances for each network
export const hederaService = new HederaService('testnet');
export const hederaMainnet = new HederaService('mainnet');
export const hederaPreviewnet = new HederaService('previewnet');

// Export class for custom instances
export default HederaService;
