'use client';

import { CheckCircle, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsReport } from '@/types';

interface Props {
  report?: AnalyticsReport;
}

export default function DLTVerification({ report }: Props) {
  if (!report) return null;

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <CheckCircle className="w-6 h-6" />
        DLT Verification
      </h3>
      <div className="space-y-3">
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">HCS Topic</p>
          <p className="font-mono text-sm">{report.hcsTopicId || '0.0.123456'}</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Timestamp</p>
          <p className="font-mono text-sm">{report.hcsTimestamp || format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-3">
          <p className="text-sm opacity-90">Hash</p>
          <p className="font-mono text-xs break-all">{report.reportHash}</p>
        </div>
        <a
          href={`https://hashscan.io/testnet/topic/${report.hcsTopicId || '0.0.123456'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium"
        >
          Verify on HashScan
          <Share2 className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}