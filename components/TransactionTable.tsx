'use client';

import { useMemo, useState } from 'react';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CategorizationEngine } from '@/lib/services/categorization';
import { Transaction } from '@/types';
import { useApp } from '@/lib/app-context';

interface Props {
  transactions: Transaction[];
}

export default function TransactionTable({ transactions }: Props) {
  const { categories } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.memo?.toLowerCase().includes(searchTerm.toLowerCase());
      const cat = CategorizationEngine.categorize(tx, categories);
      const matchesCat = selectedCategory === 'all' || cat === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [transactions, searchTerm, selectedCategory, categories]);

  const exportCSV = () => {
    const csv = [
      ['ID', 'Time', 'Type', 'Category', 'Amount', 'Fee', 'Status'],
      ...filtered.map(tx => {
        const cat = categories.find((c: any) => c.id === CategorizationEngine.categorize(tx, categories))?.name || 'Other';
        const amount = tx.transfers.reduce((s, t) => s + t.amount, 0) / 1e8;
        const fee = tx.charged_tx_fee / 1e8;
        return [
          tx.transaction_id,
  format(new Date(Number(tx.consensus_timestamp) * 1000), 'yyyy-MM-dd HH:mm:ss'),
          tx.name,
          cat,
          amount.toFixed(8),
          fee.toFixed(8),
          tx.result
        ];
      })
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `txs-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          placeholder="Search..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All</option>
    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-right p-3">Fee</th>
              <th className="text-center p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => {
              const cat = categories.find((c: any) => c.id === CategorizationEngine.categorize(tx, categories)) || { name: 'Other', color: '#666' };
              const amount = tx.transfers.reduce((s, t) => s + t.amount, 0) / 1e8;
              const fee = tx.charged_tx_fee / 1e8;
              return (
                <tr key={tx.consensus_timestamp} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3">
                    <a href={`https://hashscan.io/testnet/transaction/${tx.transaction_id}`} target="_blank" className="text-blue-600 text-sm font-mono">
                      {tx.transaction_id.split('-')[0]}
                    </a>
                  </td>
                  <td className="p-3 text-sm">{format(new Date(Number(tx.consensus_timestamp) * 1000), 'MMM dd, HH:mm')}</td>
                  <td className="p-3 text-sm">{tx.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                      {cat.name}
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm font-mono">{amount.toFixed(4)} ℏ</td>
                  <td className="p-3 text-right text-sm font-mono">{fee.toFixed(6)} ℏ</td>
                  <td className="p-3 text-center">
                    {tx.result === 'SUCCESS' ? <CheckCircle className="w-5 h-5 text-green-600 mx-auto" /> : <XCircle className="w-5 h-5 text-red-600 mx-auto" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}