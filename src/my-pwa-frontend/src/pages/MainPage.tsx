import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Plan, Page } from '../types/types';
import type { SimulationRunResponse } from '../types/types';


interface MainPageProps {
  setPage: (page: Page) => void; 
  setEditingPlan: (plan: Plan | null) => void;
  openNotice?: () => void;
  setSimulationResult: (result: SimulationRunResponse | null) => void;
}

const MainPage: React.FC<MainPageProps> = ({ setPage, setEditingPlan, openNotice, setSimulationResult }) => {
  const { user, session, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string>("");
  
  // 시뮬레이션 데이터 로드
  useEffect(() => {
    const loadPlans = async () => {
      if (!user || !session) return;
      
      setLoading(true);
      try {
        const data = await api.getSimulations(session.access_token);
        setPlans(data);
      } catch (error) {
        console.error("Error loading plans:", error);
        alert("플랜 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    
    loadPlans();
  }, [user, session]);

  const handleNewPlan = () => {
    setEditingPlan(null); // 새 플랜이므로 기존 데이터 없음
    setPage('plan-editor');
  };

  // Run simulation for a specific plan and navigate to results
  const handleViewResults = async (plan: Plan) => {
    if (!session) return;
    const simId = plan.simulation_id;

    try {
      setRunningId(simId);
      const data = await api.runSimulation(simId, session.access_token);
      setSimulationResult(data);
      setPage('results');
    } catch (e) {
      console.error('Run simulation error:', e);
      alert('시뮬레이션 실행에 실패했습니다.');
    } finally {
      setRunningId("");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">투자 시뮬레이션</h1>
        <div className="flex gap-4">
          {openNotice && (
            <Button 
              onClick={openNotice} 
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              공지사항
            </Button>
          )}
          <Button 
            onClick={() => signOut()} 
            className="bg-gray-500 hover:bg-gray-600"
          >
            로그아웃
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">내 투자 플랜</h2>
          <Button 
            onClick={handleNewPlan}
            className="bg-green-600 hover:bg-green-700"
          >
            새 플랜 만들기
          </Button>
        </div>
        
        {loading ? (
          <p className="text-center py-4">로딩 중...</p>
        ) : plans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랜 타입
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회사 회차
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 회차
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.simulation_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan.plan_id} 플랜
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan.company_round}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan.simulation_rounds}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan.created_at && new Date(plan.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPage('plan-editor');
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => handleViewResults(plan)}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                        disabled={runningId === (plan.simulation_id)}
                      >
                        {runningId === (plan.simulation_id) ? '실행 중…' : '결과 보기'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-4">아직 생성된 플랜이 없습니다. '새 플랜 만들기'를 클릭하여 시작하세요.</p>
        )}
      </div>
    </div>
  );
};

export default MainPage;
