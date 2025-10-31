import { Transaction } from '@/types';

export class MirrorNodeAPI {
  static getBaseURL(network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet'): string {
    const urls = {
      mainnet: 'https://mainnet.mirrornode.hedera.com/api/v1',
      testnet: 'https://testnet.mirrornode.hedera.com/api/v1',
      previewnet: 'https://previewnet.mirrornode.hedera.com/api/v1'
    };
    return urls[network];
  }

  static getBaseDomain(network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet'): string {
    const domains = {
      mainnet: 'https://mainnet.mirrornode.hedera.com',
      testnet: 'https://testnet.mirrornode.hedera.com',
      previewnet: 'https://previewnet.mirrornode.hedera.com'
    };
    return domains[network];
  }

  static async fetchTransactions(params: {
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
    transactionType?: string;
    limit?: number;
    network?: 'mainnet' | 'testnet' | 'previewnet';
    maxPages?: number;
    onProgress?: (page: number, total: number) => void;
  }): Promise<Transaction[]> {
    const baseURL = this.getBaseURL(params.network);
    const baseDomain = this.getBaseDomain(params.network);
    const query = new URLSearchParams();
    if (params.accountId) query.append('account.id', params.accountId);
    if (params.startDate) query.append('timestamp', `gte:${params.startDate.getTime() / 1000}`);
    if (params.endDate) query.append('timestamp', `lte:${params.endDate.getTime() / 1000}`);
    if (params.transactionType) query.append('transactiontype', params.transactionType);
    const pageLimit = params.limit || 100;
    query.append('limit', pageLimit.toString());

    const allTransactions: Transaction[] = [];
    let nextUrl: string | null = `${baseURL}/transactions?${query}`;
    const maxPages = params.maxPages || 10; // default to 10 pages max
    let page = 0;

    while (nextUrl && page < maxPages) {
      page++;
      const res: Response = await fetch(nextUrl);
      if (!res.ok) throw new Error(`Failed to fetch transactions (page ${page})`);
      const data: any = await res.json();
      
      const transactions = data.transactions || [];
      allTransactions.push(...transactions);
      
      if (params.onProgress) {
        params.onProgress(page, allTransactions.length);
      }

      // check for next page link - the API returns full path starting with /api/v1/
      nextUrl = data.links?.next ? `${baseDomain}${data.links.next}` : null;
      
      // if we got fewer transactions than limit, we're done
      if (transactions.length < pageLimit) {
        break;
      }
    }

    return allTransactions;
  }

  static async fetchAccount(accountId: string, network: 'mainnet' | 'testnet' | 'previewnet' = 'testnet'): Promise<any> {
    const baseURL = this.getBaseURL(network);
    const res = await fetch(`${baseURL}/accounts/${encodeURIComponent(accountId)}`);
    if (!res.ok) throw new Error('Failed to fetch account');
    const data = await res.json();
    return data;
  }
}