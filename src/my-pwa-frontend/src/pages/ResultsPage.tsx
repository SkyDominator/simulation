import React from 'react';
import { Button } from '../components/Button';
import type { SimulationRunResponse, Page } from '../types/types';

// ==== Column configuration ====
// Reorder columns by editing this array. Only keys present in history will be shown.
// You can add/remove keys freely; unknown keys are ignored.
const COLUMN_ORDER: string[] = [
  'company_round',
  'investor_count',
  'total_payment',
  'total_revenue_before_tax',
  'total_revenue_after_tax',
  'net_profit_after_tax',
  'cumulative_net_profit',
];

// If true, any history fields not listed in COLUMN_ORDER will be appended (alphabetically)
const SHOW_UNLISTED_COLUMNS = true;

interface ResultsPageProps {
  setPage: (page: Page) => void;
  result: SimulationRunResponse | null;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ setPage, result }) => {
  const historyRaw = (result?.history ?? []) as unknown[];
  const history: Array<Record<string, unknown>> = historyRaw.map((e) =>
    (e && typeof e === 'object') ? (e as Record<string, unknown>) : {}
  );

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val.toLocaleString();
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 0);
    } catch {
      return String(val);
    }
  };

  // Build table columns from history entries: prefer common fields first
  const collectColumns = (): string[] => {
    const set = new Set<string>();
    for (const row of history) {
      Object.keys(row).forEach((k) => set.add(k));
    }
  const presentOrdered = COLUMN_ORDER.filter((k) => set.has(k));
  const rest = Array.from(set).filter((k) => !presentOrdered.includes(k)).sort();
  return SHOW_UNLISTED_COLUMNS ? [...presentOrdered, ...rest] : presentOrdered;
  };

  const columns = collectColumns();
  // Map specific column keys to Korean labels
  const columnLabelMap: Record<string, string> = {
    company_round: '회차',
    investor_count: '아바타 개수',
    cumulative_net_profit: '총 이익',
    net_profit_after_tax: '이익(세후)',
    total_payment: '매출액',
    total_revenue_after_tax: '수당(세후)',
    total_revenue_before_tax: '수당(세전)',
  };

  const headerLabel = (key: string) =>
    columnLabelMap[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">시뮬레이션 결과</h1>
          {result?.plan_id && (
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
              <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700">플랜 {result.plan_id}</span>
              {typeof history.length === 'number' && (
                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">총 {history.length.toLocaleString()} 회</span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPage('main')} className="bg-gray-500 hover:bg-gray-600">메인으로 돌아가기</Button>
        </div>
      </div>

      {!result ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
          표시할 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">플랜 {result.plan_id}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">시뮬레이션 회차 개수: {history.length.toLocaleString()}개</div>
              </div>
            </div>
          </div>

          <div><br></br></div>

          {/* Full history table */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
            </div>
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">히스토리가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="sticky top-0 z-10 text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-4 py-2 border-b"
                        >
                          {headerLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {columns.map((col) => (
                          <td key={col} className="px-4 py-2 text-sm text-gray-900 align-top">
                            {formatValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
