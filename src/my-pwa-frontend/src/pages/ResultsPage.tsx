import React from 'react';
import { Button } from '../components/Button';

interface ResultsPageProps {
  setPage: (page: any) => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ setPage }) => {
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
        <p className="text-center py-4">
          이 페이지는 추후 구현될 예정입니다.
        </p>
      </div>
    </div>
  );
};

export default ResultsPage;
