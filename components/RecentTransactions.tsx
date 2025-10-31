'use client';

import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';
import { Transaction } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
      <div className="space-y-3">
        {transactions.slice(0, 10).map(tx => {
          const hbarAmount = tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8;
          const fee = tx.charged_tx_fee / 1e8;

          return (
            <div key={tx.consensus_timestamp} className="border-b dark:border-gray-700 pb-3 last:border-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{tx.name}</span>
                    {tx.result === 'SUCCESS' ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <XCircle className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {tx.transaction_id.split('-')[0]}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(Number(tx.consensus_timestamp) * 1000), 'MMM dd, HH:mm:ss')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">
                    {hbarAmount > 0 ? '+' : ''}{hbarAmount.toFixed(4)} ℏ
                  </p>
                  <p className="text-xs text-gray-500">
                    Fee: {fee.toFixed(6)} ℏ
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
