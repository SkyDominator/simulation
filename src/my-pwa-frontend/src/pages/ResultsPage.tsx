import React from 'react';
import { Button } from '../components/Button';
import type { SimulationRunResponse, Page } from '../types/types';

interface ResultsPageProps {
  setPage: (page: Page) => void;
  result: SimulationRunResponse | null;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ setPage, result }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">시뮬레이션 결과</h1>
        <Button 
          onClick={() => setPage('main')}
          className="bg-gray-500 hover:bg-gray-600"
        >
          메인으로 돌아가기
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {!result ? (
          <p className="text-center py-4">표시할 결과가 없습니다.</p>
        ) : (
          <div>
            <div className="mb-4">
              <div className="text-sm text-gray-600">플랜</div>
              <div className="font-semibold">{result.plan_id}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-600">시뮬레이션 ID</div>
              <div className="font-mono text-sm">{result.simulation_id}</div>
            </div>
            <div className="mb-2 font-semibold">히스토리 (최근 10개)</div>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(result.history?.slice(-10), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
