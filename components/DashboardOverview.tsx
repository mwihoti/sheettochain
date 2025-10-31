'use client';

import { useMemo } from 'react';
import { Activity, DollarSign, TrendingUp, Users } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { CategorizationEngine } from '@/lib/services/categorization';
import { Transaction } from '@/types';
import { useApp } from '@/lib/app-context';

interface Props {
  transactions: Transaction[];
}

export default function DashboardOverview({ transactions }: Props) {
  const { categories } = useApp();

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let volume = 0, fees = 0;
    const counter: Record<string, number> = {};

    transactions.forEach(tx => {
      const cat = CategorizationEngine.categorize(tx, categories);
      counts[cat] = (counts[cat] || 0) + 1;
      const amt = Math.abs(tx.transfers.reduce((s, t) => s + t.amount, 0) / 1e8);
      volume += amt;
      fees += tx.charged_tx_fee / 1e8;
      tx.transfers.forEach(t => {
        if (t.account !== transactions[0]?.transfers[0]?.account) {
          counter[t.account] = (counter[t.account] || 0) + Math.abs(t.amount);
        }
      });
    });

    const top5 = Object.entries(counter)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([acc, amt]) => ({ account: acc, amount: amt / 1e8 }));

    return {
      total: transactions.length,
      volume,
      fees,
      avg: volume / transactions.length || 0,
      pie: Object.entries(counts).map(([id, c]) => ({
        name: categories.find((x: any) => x.id === id)?.name || id,
        value: c,
        color: categories.find((x: any) => x.id === id)?.color || '#666'
      })),
      top5
    };
  }, [transactions, categories]);

  const timeline = useMemo(() => {
    const map: Record<string, any> = {};
    transactions.forEach(tx => {
  const d = format(new Date(Number(tx.consensus_timestamp) * 1000), 'MMM dd');
      if (!map[d]) map[d] = { date: d, count: 0, volume: 0 };
      map[d].count++;
      map[d].volume += Math.abs(tx.transfers.reduce((s, t) => s + t.amount, 0) / 1e8);
    });
    return Object.values(map).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tx</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Volume</p>
            <p className="text-2xl font-bold">{stats.volume.toFixed(2)} ℏ</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Tx</p>
            <p className="text-2xl font-bold">{stats.avg.toFixed(4)} ℏ</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Fees</p>
            <p className="text-2xl font-bold">{stats.fees.toFixed(6)} ℏ</p>
          </div>
          <Users className="w-8 h-8 text-orange-600" />
        </div>
      </div>

      <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Timeline</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timeline}>
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
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={stats.pie} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
              {stats.pie.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Counterparties</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.top5}>
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
}