'use client';

import { useMemo } from 'react';
import { DollarSign, Users, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/types';

interface Props {
  transactions: Transaction[];
}

export default function InsightsPanel({ transactions }: Props) {
  const insights = useMemo(() => {
    if (!transactions.length) return [];

    const largest = transactions.reduce((m, tx) => {
      const amt = Math.abs(tx.transfers.reduce((s, t) => s + t.amount, 0));
      return amt > (m?.amt || 0) ? { tx, amt } : m;
    }, null as any);

    const counter: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.transfers.forEach(t => {
        if (t.account !== transactions[0]?.transfers[0]?.account) {
          counter[t.account] = (counter[t.account] || 0) + 1;
        }
      });
    });
    const top = Object.entries(counter).sort(([,a], [,b]) => b - a)[0];

    return [
      largest && {
        icon: DollarSign,
  msg: `Largest: ${(largest.amt / 1e8).toFixed(2)} ℏ on ${format(new Date(Number(largest.tx.consensus_timestamp) * 1000), 'MMM dd, yyyy')}`
      },
      top && {
        icon: Users,
        msg: `Most frequent: ${top[0].split('.').pop()} (${top[1]} txs)`
      }
    ].filter(Boolean);
  }, [transactions]);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Insights
      </h3>
      <div className="space-y-3">
        {insights.map((i, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3">
            <i.icon className="w-5 h-5 mt-0.5" />
            <p className="text-sm">{i.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}