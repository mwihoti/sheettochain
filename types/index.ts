export interface Transaction {
  transaction_id: string;
  consensus_timestamp: string;
  type: string;
  name: string;
  result: string;
  charged_tx_fee: number;
  transfers: Array<{
    account: string;
    amount: number;
  }>;
  token_transfers?: Array<{
    token_id: string;
    account: string;
    amount: number;
  }>;
  memo?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  rules: Rule[];
}

export interface Rule {
  field: string;
  operator: string;
  value: any;
}

export interface AnalyticsReport {
  accountId: string;
  timestamp: number;
  categoryCounts: Record<string, number>;
  totalVolume: number;
  reportHash: string;
  hcsTopicId?: string;
  hcsTimestamp?: string;
}