'use client';

import { Activity, DollarSign, TrendingUp, Users } from 'lucide-react';

interface StatsCardsProps {
  totalTransactions: number;
  totalFees: number;
  averageFee: number;
  totalVolume?: number;
}

export default function StatsCards({ 
  totalTransactions, 
  totalFees, 
  averageFee,
  totalVolume = 0 
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold mt-1">{totalTransactions.toLocaleString()}</p>
          </div>
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Fees</p>
            <p className="text-2xl font-bold mt-1">{totalFees.toFixed(6)} ℏ</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Fee</p>
            <p className="text-2xl font-bold mt-1">{averageFee.toFixed(6)} ℏ</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p>
            <p className="text-2xl font-bold mt-1">{totalVolume.toFixed(2)} ℏ</p>
          </div>
          <Users className="w-8 h-8 text-orange-600" />
        </div>
      </div>
    </div>
  );
}
