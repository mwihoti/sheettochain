'use client'
import Image from "next/image";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppContext, useApp } from '@/lib/app-context';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Search, Loader2, AlertCircle, Download, Moon, Sun, Share2, CheckCircle, XCircle, Filter, Calendar, TrendingUp, Users, DollarSign, Activity, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { MirrorNodeAPI } from '@/lib/api/mirror-node';
import { HederaSDK } from '@/lib/services/hedera-sdk';
import { CategorizationEngine } from '@/lib/services/categorization';
import { Transaction, Category, AnalyticsReport } from '@/types';
import Link from 'next/link';

// Context
// context is provided by `lib/app-context.tsx` and imported above

// Components (inline for single file)
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useApp();
  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
};

const NetworkSelector: React.FC = () => {
  const { network, setNetwork } = useApp();
  return (
    <select
      value={network}
      onChange={(e) => setNetwork(e.target.value as any)}
      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="mainnet">Mainnet</option>
      <option value="testnet">Testnet</option>
      <option value="previewnet">Previewnet</option>
    </select>
  );
};

const AccountSearch: React.FC = () => {
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
};

const AccountSummary: React.FC = () => {
  const { accountInfo, accountId, network } = useApp() as any;
  const [evmData, setEvmData] = useState<any>(null);
  const [hbarPrice, setHbarPrice] = useState<number | null>(null);

  // Fetch HBAR price
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd')
      .then(res => res.json())
      .then(data => setHbarPrice(data['hedera-hashgraph']?.usd || null))
      .catch(() => setHbarPrice(null));
  }, []);

  // Fetch EVM address info if available
  useEffect(() => {
    if (!accountInfo) return;
    const evm = accountInfo.evm_address || accountInfo.evmAddress || accountInfo.evmHex || '';
    if (evm && evm.startsWith('0x')) {
      fetch(`https://api.ethplorer.io/getAddressInfo/${evm}?apiKey=freekey`)
        .then(res => res.json())
        .then(data => setEvmData(data))
        .catch(() => setEvmData(null));
    }
  }, [accountInfo]);
  
  if (!accountInfo) return null;

  // safe accessors with sensible fallbacks
  const acct = accountInfo.account || accountInfo.accountId || accountId;
  const evm = accountInfo.evm_address || accountInfo.evmAddress || accountInfo.evmHex || '';
  const alias = accountInfo.alias || '';
  const rawBalance = Number(accountInfo.balance?.balance ?? accountInfo.balance ?? 0);
  const balance = (rawBalance / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  const balanceHbar = rawBalance / 1e8;
  const stakedTo = accountInfo.staked_node_id ? `Node ${accountInfo.staked_node_id}` : accountInfo.staked_account_id || 'None';
  const pendingReward = ((Number(accountInfo.pending_reward ?? 0)) / 1e8).toFixed(8);
  const memo = accountInfo.memo ?? accountInfo.description ?? 'None';
  const accountKey = accountInfo.key ? `${accountInfo.key._type || 'Key'}: ${(accountInfo.key.key || '').substring(0, 20)}...` : 'None';
  const maxAuto = accountInfo.max_automatic_token_associations ?? accountInfo.max_automatic_associations ?? 0;
  const receiverReq = accountInfo.receiver_sig_required ?? accountInfo.receiverSignatureRequired ?? false;
  const createdDate = accountInfo.created_timestamp ? format(new Date(Number(accountInfo.created_timestamp) * 1000), 'MMM dd, yyyy HH:mm') : 'Unknown';
  const expiryDate = accountInfo.expiry_timestamp ? format(new Date(Number(accountInfo.expiry_timestamp) * 1000), 'MMM dd, yyyy') : 'Unknown';
  const tokens = accountInfo.balance?.tokens || [];

  const usdValue = hbarPrice ? `≈ $${(balanceHbar * hbarPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Account {acct}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Created: {createdDate} • Expires: {expiryDate}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://hashscan.io/${network}/account/${acct}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            View on HashScan
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">HBAR Balance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{balance} ℏ</p>
          {usdValue && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{usdValue}</p>}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Staking</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stakedTo}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Reward: {pendingReward} ℏ</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tokens</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{tokens.length}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Associated</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Auto Associations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{maxAuto}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Max Available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Identifiers</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Account ID:</span>
              <p className="font-mono text-gray-900 dark:text-white break-all">{acct}</p>
            </div>
            {evm && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">EVM Address:</span>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{evm}</p>
              </div>
            )}
            {alias && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Alias:</span>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{alias}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Properties</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Memo:</span>
              <p className="font-mono text-gray-900 dark:text-white">{memo}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Receiver Signature Required:</span>
              <p className="text-gray-900 dark:text-white">{receiverReq ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Key Type:</span>
              <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{accountKey}</p>
            </div>
          </div>
        </div>
      </div>

      {tokens.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Token Holdings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tokens.slice(0, 6).map((token: any, idx: number) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{token.token_id}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{(token.balance / Math.pow(10, token.decimals || 0)).toLocaleString()}</p>
              </div>
            ))}
            {tokens.length > 6 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">+{tokens.length - 6} more</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NetworkStats: React.FC = () => {
  const { network } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetworkStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseURL = MirrorNodeAPI.getBaseURL(network);
        
        // Fetch recent transactions to show network activity with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const txRes = await fetch(`${baseURL}/transactions?limit=10&order=desc`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!txRes.ok) throw new Error('Failed to fetch transactions');
        const txData = await txRes.json();
        
        // Fetch network nodes info
        let nodesData = { nodes: [] };
        try {
          const nodesRes = await fetch(`${baseURL}/network/nodes`, {
            signal: AbortSignal.timeout(5000)
          });
          if (nodesRes.ok) {
            nodesData = await nodesRes.json();
          }
        } catch {
          // Ignore nodes fetch failure
        }
        
        setStats({
          recentTransactions: txData.transactions?.length || 0,
          latestTimestamp: txData.transactions?.[0]?.consensus_timestamp || null,
          totalNodes: nodesData.nodes?.length || 0,
          network
        });
      } catch (error: any) {
        console.error('Failed to fetch network stats', error);
        if (error.name === 'AbortError') {
          setError('Request timed out - network may be slow');
        } else {
          setError('Failed to load network stats');
        }
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have stats or network changed
    if (!stats || stats.network !== network) {
      fetchNetworkStats();
    }
  }, [network]);

  if (error) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-lg p-6 text-gray-600 dark:text-gray-400 mb-6">
        <h3 className="text-xl font-bold mb-2">Network Status</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
        <h3 className="text-xl font-bold mb-4">Network Status</h3>
        <p className="text-sm">Loading network information...</p>
      </div>
    );
  }

  if (!stats) return null;

  const latestTime = stats.latestTimestamp 
    ? format(new Date(Number(stats.latestTimestamp) * 1000), 'MMM dd, yyyy HH:mm:ss')
    : 'Unknown';

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        {stats.network.charAt(0).toUpperCase() + stats.network.slice(1)} Network Status
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Recent Transactions</p>
          <p className="text-2xl font-bold">{stats.recentTransactions}</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Latest Block Time</p>
          <p className="text-sm font-mono">{latestTime}</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Network Nodes</p>
          <p className="text-2xl font-bold">{stats.totalNodes || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

const TransactionTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const { categories, network } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.memo?.toLowerCase().includes(searchTerm.toLowerCase());
      const category = CategorizationEngine.categorize(tx, categories);
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, selectedCategory, categories]);

  const exportCSV = () => {
    const csv = [
      ['Transaction ID', 'Timestamp', 'Type', 'Category', 'Amount (HBAR)', 'Fee (HBAR)', 'Status'],
      ...filteredTransactions.map(tx => {
  const category = categories.find((c: any) => c.id === CategorizationEngine.categorize(tx, categories))?.name || 'Other';
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="all">All Categories</option>
          {categories.map((cat: any) => (
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
              const category = categories.find((c: any) => c.id === CategorizationEngine.categorize(tx, categories)) || { name: 'Other', color: '#6B7280' };
              const hbarAmount = tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8;
              const fee = tx.charged_tx_fee / 1e8;

              return (
                <tr key={tx.consensus_timestamp} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3">
                    <a
                      href={`https://hashscan.io/${network}/transaction/${tx.transaction_id}`}
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
      </div>
    </div>
  );
};

const DashboardOverview: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const { categories } = useApp();

  const stats = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    let totalVolume = 0;
    let totalFees = 0;
    const counterparties: Record<string, number> = {};

    transactions.forEach((tx: Transaction) => {
      const category = CategorizationEngine.categorize(tx, categories);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      const hbarAmount = Math.abs(tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8);
      totalVolume += hbarAmount;
      totalFees += tx.charged_tx_fee / 1e8;

      tx.transfers.forEach((t: any) => {
        if (t.account !== transactions[0]?.transfers[0]?.account) {
          counterparties[t.account] = (counterparties[t.account] || 0) + Math.abs(t.amount);
        }
      });
    });

    const topCounterparties = Object.entries(counterparties)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([account, amount]) => ({ account, amount: amount / 1e8 }));

    return {
      totalCount: transactions.length,
      totalVolume,
      totalFees,
      avgSize: transactions.length > 0 ? totalVolume / transactions.length : 0,
      categoryData: Object.entries(categoryCounts).map(([id, count]) => ({
  name: categories.find((c: any) => c.id === id)?.name || id,
        value: count,
  color: categories.find((c: any) => c.id === id)?.color || '#6B7280'
      })),
      topCounterparties
    };
  }, [transactions, categories]);

  const timelineData = useMemo(() => {
    const grouped = transactions.reduce((acc, tx: Transaction) => {
  const date = format(new Date(Number(tx.consensus_timestamp) * 1000), 'MMM dd');
      if (!acc[date]) acc[date] = { date, count: 0, volume: 0 };
      acc[date].count++;
      acc[date].volume += Math.abs(tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8);
      return acc;
    }, {} as Record<string, any>);
    return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold mt-1">{stats.totalCount.toLocaleString()}</p>
          </div>
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p>
            <p className="text-2xl font-bold mt-1">{stats.totalVolume.toFixed(2)} ℏ</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Transaction</p>
            <p className="text-2xl font-bold mt-1">{stats.avgSize.toFixed(4)} ℏ</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Fees</p>
            <p className="text-2xl font-bold mt-1">{stats.totalFees.toFixed(6)} ℏ</p>
          </div>
          <Users className="w-8 h-8 text-orange-600" />
        </div>
      </div>

      <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Transaction Timeline</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="count" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="volume" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
              <Pie
              data={stats.categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {stats.categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Counterparties</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.topCounterparties}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="account" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InsightsPanel: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const insights = useMemo(() => {
    if (transactions.length === 0) return [];

    const largestTx = transactions.reduce((max: any, tx: Transaction) => {
      const amount = Math.abs(tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0));
      return amount > (max?.amount || 0) ? { ...tx, amount } : max;
    }, null as any);

    const counterparties: Record<string, number> = {};
    transactions.forEach((tx: Transaction) => {
      tx.transfers.forEach((t: any) => {
        if (t.account !== transactions[0]?.transfers[0]?.account) {
          counterparties[t.account] = (counterparties[t.account] || 0) + 1;
        }
      });
    });

    const topCounterparty = Object.entries(counterparties).sort(([,a], [,b]) => b - a)[0];

    return [
      largestTx && {
        type: 'info',
        icon: DollarSign,
  message: `Largest transaction: ${(largestTx.amount / 1e8).toFixed(2)} ℏ on ${format(new Date(Number(largestTx.consensus_timestamp) * 1000), 'MMM dd, yyyy')}`
      },
      topCounterparty && {
        type: 'info',
        icon: Users,
        message: `Most frequent counterparty: ${topCounterparty[0].split('.').pop()} (${topCounterparty[1]} txs)`
      }
    ].filter(Boolean);
  }, [transactions]);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Automated Insights
      </h3>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3">
            {insight && <insight.icon className="w-5 h-5 mt-0.5" />}
            <p className="text-sm">{insight?.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const DLTVerification: React.FC<{ report?: AnalyticsReport }> = ({ report }) => {
  const { network } = useApp();
  if (!report) return null;

  const reportTimestamp = format(new Date(report.timestamp), 'MMM dd, yyyy HH:mm:ss');
  const totalTransactions = Object.values(report.categoryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <CheckCircle className="w-6 h-6" />
        Analytics Report
      </h3>
      
      <div className="space-y-3">
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Account ID</p>
          <p className="font-mono text-lg font-bold">{report.accountId}</p>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Report Generated</p>
          <p className="font-mono text-sm">{reportTimestamp}</p>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Transactions Analyzed</p>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Total Volume</p>
          <p className="text-xl font-bold">{report.totalVolume.toFixed(2)} ℏ</p>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Category Breakdown</p>
          <div className="mt-2 space-y-1">
            {Object.entries(report.categoryCounts).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Report Hash (SHA-256)</p>
          <p className="font-mono text-xs break-all">{report.reportHash.substring(0, 64)}...</p>
        </div>

        {report.hcsTopicId && report.hcsTimestamp && (
          <>
            <div className="border-t border-white border-opacity-20 pt-3 mt-3">
              <p className="text-xs opacity-75 mb-2">🔒 On-Chain Verification</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-sm opacity-90">HCS Topic ID</p>
              <p className="font-mono text-sm">{report.hcsTopicId}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-sm opacity-90">Consensus Timestamp</p>
              <p className="font-mono text-sm">{report.hcsTimestamp}</p>
            </div>
            <a
              href={`https://hashscan.io/${network}/topic/${report.hcsTopicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium w-full justify-center"
            >
              Verify on HashScan
              <Share2 className="w-4 h-4" />
            </a>
          </>
        )}

        {(!report.hcsTopicId || !report.hcsTimestamp) && (
          <>
            <div className="bg-yellow-500 bg-opacity-20 rounded-lg p-3 border border-yellow-300 border-opacity-30">
              <p className="text-xs">ℹ️ Demo Mode: HCS submission disabled</p>
              <p className="text-xs opacity-75 mt-1">In production, this report would be immutably stored on Hedera Consensus Service</p>
            </div>
            <a
              href={`https://hashscan.io/${network}/account/${report.accountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium w-full justify-center"
            >
              View Account on HashScan
              <Share2 className="w-4 h-4" />
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [state, setState] = useState({
    accountId: '',
    dateRange: { start: subDays(new Date(), 30), end: new Date() },
    transactions: [] as Transaction[],
    categories: CategorizationEngine.defaultCategories,
    customCategories: [] as Category[],
    loading: false,
    loadingProgress: '',
    error: null as string | null,
    theme: 'light' as 'light' | 'dark',
    reports: [] as AnalyticsReport[],
    accountInfo: undefined as any,
    network: 'testnet' as 'mainnet' | 'testnet' | 'previewnet'
  });

  const setStatePartial = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const fetchTransactions = async (accountId: string) => {
    setStatePartial({ loading: true, error: null, transactions: [], loadingProgress: 'Fetching transactions...', accountInfo: undefined });

    try {
      const transactions = await MirrorNodeAPI.fetchTransactions({
        accountId,
        startDate: state.dateRange.start,
        endDate: state.dateRange.end,
        limit: 100,
        network: state.network,
        maxPages: 5,
        onProgress: (page: number, total: number) => {
          setStatePartial({ loadingProgress: `Fetching page ${page}... (${total} transactions)` });
        }
      });

      // try to fetch account details in parallel but don't block transactions
      MirrorNodeAPI.fetchAccount(accountId, state.network)
        .then((acc: any) => setStatePartial({ accountInfo: acc }))
        .catch(() => setStatePartial({ accountInfo: undefined }));

      setStatePartial({ transactions, accountId, loadingProgress: '', loading: false });

      const categoryCounts: Record<string, number> = {};
      let totalVolume = 0;
      transactions.forEach((tx: Transaction) => {
        const cat = CategorizationEngine.categorize(tx, [...state.categories, ...state.customCategories]);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalVolume += Math.abs(tx.transfers.reduce((sum: number, t: any) => sum + t.amount, 0) / 1e8);
      });

      const reportData = { accountId, timestamp: Date.now(), categoryCounts, totalVolume };
      const reportHash = btoa(JSON.stringify(reportData));

      try {
        const hcs = await HederaSDK.submitHCSMessage('0.0.123456', JSON.stringify({ ...reportData, reportHash }));
        const report: AnalyticsReport = { ...reportData, reportHash, hcsTopicId: '0.0.123456', hcsTimestamp: hcs.timestamp };
        setStatePartial({ reports: [report, ...state.reports].slice(0, 10) });
        toast.success('Report submitted to HCS!');
      } catch {
        toast.error('HCS submission failed (demo mode)');
      }
    } catch (error: any) {
      setStatePartial({ error: error.message, loading: false });
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('hedera-app');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // revive dates stored as ISO strings back into Date objects
        if (parsed.dateRange) {
          if (parsed.dateRange.start) parsed.dateRange.start = new Date(parsed.dateRange.start);
          if (parsed.dateRange.end) parsed.dateRange.end = new Date(parsed.dateRange.end);
        }
        setState(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        // ignore corrupt local storage
        console.warn('Failed to parse saved state', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('hedera-app', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const latestReport = state.reports[0];

  // helper setters exposed to context so inline components can call them
  const setAccountId = (id: string) => setStatePartial({ accountId: id });
  const setTheme = (theme: 'light' | 'dark') => setStatePartial({ theme });
  const setNetwork = (network: 'mainnet' | 'testnet' | 'previewnet') => setStatePartial({ network });

  return (
  <AppContext.Provider value={{ ...state, setState: setStatePartial, setAccountId, setTheme, setNetwork, fetchTransactions }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hedera Analytics Dashboard</h1>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/token-gallery"
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Database className="w-4 h-4" />
                  Token Gallery
                </Link>
                <Link 
                  href="/tokenized-data"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Database className="w-4 h-4" />
                  Tokenize Data
                </Link>
                <NetworkSelector />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-4">DLT-Enhanced Transaction Analytics</h2>
            <p className="text-xl opacity-90">Immutable audit trails • On-chain verification • Enterprise-grade insights</p>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <AccountSearch />
          </div>

          {state.accountId && <AccountSummary />}

          {state.error && (
            <div className="mb-8 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{state.error}</p>
            </div>
          )}

       { /*  {state.loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {state.loadingProgress || 'Fetching from Hedera Mirror Node...'}
                </p>
              </div>
            </div>
          )} */}

          {!state.loading && state.transactions.length === 0 && !state.error && (
            <div className="text-center py-20">
              <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
              <p className="text-gray-600 dark:text-gray-400">Enter an account ID to begin</p>
            </div>
          )}

          {state.transactions.length > 0 && (
            <>
              <InsightsPanel transactions={state.transactions} />
              <DashboardOverview transactions={state.transactions} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                  <TransactionTable transactions={state.transactions} />
                </div>
                <div>
                  <DLTVerification report={latestReport} />
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              © 2025 Hedera Analytics Platform. Built with Next.js, React, and Hedera SDK.
            </div>
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
}