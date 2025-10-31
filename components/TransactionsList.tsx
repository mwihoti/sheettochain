'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { Transaction } from '@/types';
import { CategorizationEngine } from '@/lib/services/categorization';

interface TransactionsListProps {
  transactions: Transaction[];
  categories?: any[];
}

export default function TransactionsList({ transactions, categories = [] }: TransactionsListProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allCategories = categories.length > 0 ? categories : CategorizationEngine.defaultCategories;

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      tx.name.toLowerCase().includes(search.toLowerCase()) ||
      tx.memo?.toLowerCase().includes(search.toLowerCase());
    
    const category = CategorizationEngine.categorize(tx, allCategories);
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const exportCSV = () => {
    const csv = [
      ['Transaction ID', 'Timestamp', 'Type', 'Category', 'Amount (HBAR)', 'Fee (HBAR)', 'Status'],
      ...filteredTransactions.map(tx => {
        const category = allCategories.find((c: any) => c.id === CategorizationEngine.categorize(tx, allCategories))?.name || 'Other';
        const hbarAmount = tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8;
        const fee = tx.charged_tx_fee / 1e8;
        return [
          tx.transaction_id,
          format(new Date(Number(tx.consensus_timestamp) * 1000), 'yyyy-MM-dd HH:mm:ss'),
          tx.name,
          category,
          hbarAmount.toFixed(8),
          fee.toFixed(8),
          tx.result
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hedera-transactions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="all">All Categories</option>
          {allCategories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left p-3 font-semibold">Transaction ID</th>
              <th className="text-left p-3 font-semibold">Time</th>
              <th className="text-left p-3 font-semibold">Type</th>
              <th className="text-left p-3 font-semibold">Category</th>
              <th className="text-right p-3 font-semibold">Amount</th>
              <th className="text-right p-3 font-semibold">Fee</th>
              <th className="text-center p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(tx => {
              const category = allCategories.find((c: any) => c.id === CategorizationEngine.categorize(tx, allCategories)) || { name: 'Other', color: '#6B7280' };
              const hbarAmount = tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8;
              const fee = tx.charged_tx_fee / 1e8;

              return (
                <tr key={tx.consensus_timestamp} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3">
                    <a
                      href={`https://hashscan.io/testnet/transaction/${tx.transaction_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-mono"
                    >
                      {tx.transaction_id.split('-')[0]}
                    </a>
                  </td>
                  <td className="p-3 text-sm">{format(new Date(Number(tx.consensus_timestamp) * 1000), 'MMM dd, HH:mm')}</td>
                  <td className="p-3 text-sm">{tx.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: category.color + '20', color: category.color }}>
                      {category.name}
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm font-mono">{hbarAmount > 0 ? '+' : ''}{hbarAmount.toFixed(4)} ℏ</td>
                  <td className="p-3 text-right text-sm font-mono">{fee.toFixed(6)} ℏ</td>
                  <td className="p-3 text-center">
                    {tx.result === 'SUCCESS' ? <CheckCircle className="w-5 h-5 text-green-600 mx-auto" /> : <XCircle className="w-5 h-5 text-red-600 mx-auto" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        )}
      </div>
    </div>
  );
}
