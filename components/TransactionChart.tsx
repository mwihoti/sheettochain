'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/types';

interface TransactionChartProps {
  transactions: Transaction[];
}

export default function TransactionChart({ transactions }: TransactionChartProps) {
  const chartData = transactions.slice(0, 20).reverse().map(tx => ({
    time: new Date(Number(tx.consensus_timestamp) * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    fee: tx.charged_tx_fee / 1e8,
    name: tx.name
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Transaction Fees Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="fee" stroke="#8884d8" name="Fee (ℏ)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
