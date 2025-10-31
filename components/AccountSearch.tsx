'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/app-context';

export default function AccountSearch() {
  const { accountId, setAccountId, fetchTransactions, loading } = useApp();
  const [inputValue, setInputValue] = useState(accountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountId(inputValue);
    fetchTransactions(inputValue);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter account ID (e.g., 0.0.12345)"
        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        Search
      </button>
    </form>
  );
}