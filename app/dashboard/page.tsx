import { hederaService } from '@/lib/hederaService';
import TransactionChart from '@/components/TransactionChart';
import StatsCards from '@/components/StatsCards';
import RecentTransactions from '@/components/RecentTransactions';
import TransactionsList from '@/components/TransactionsList';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage() {
  let transactions: any = null;
  let nodes: any = null;
  let error: string | null = null;

  try {
    // Fetch data in parallel
    [transactions, nodes] = await Promise.all([
      hederaService.getTransactions(50),
      hederaService.getNetworkNodes().catch(() => ({ nodes: [] }))
    ]);
  } catch (e: any) {
    error = e.message || 'Failed to fetch data';
  }

  if (error || !transactions) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">
              {error || 'Failed to load dashboard data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const txList = transactions.transactions || [];
  const totalFees = txList.reduce((sum: number, tx: any) => sum + (tx.charged_tx_fee || 0), 0) / 1e8;
  const averageFee = txList.length > 0 ? totalFees / txList.length : 0;
  const totalVolume = txList.reduce((sum: number, tx: any) => {
    const amount = tx.transfers?.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0) || 0;
    return sum + amount;
  }, 0) / 1e8;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hedera Network Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <StatsCards 
          totalTransactions={txList.length}
          totalFees={totalFees}
          averageFee={averageFee}
          totalVolume={totalVolume}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionChart transactions={txList} />
          <RecentTransactions transactions={txList} />
        </div>

        <TransactionsList transactions={txList} />
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2025 Hedera Analytics Platform. Built with Next.js, React, and Hedera SDK.
          </div>
        </div>
      </footer>
    </div>
  );
}
