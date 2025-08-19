import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { MemoModal } from '../components/MemoModal';
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

const MainPage: React.FC<MainPageProps> = (props: MainPageProps) => {
  const { setPage, setEditingPlan, openNotice, setSimulationResult } = props;
  const { user, session, signOut } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoTarget, setMemoTarget] = useState<Plan | null>(null);
  // draft stored inside MemoModal, keep minimal state here
  
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

  const refreshPlans = async () => {
    if (!session) return;
    try {
      const data = await api.getSimulations(session.access_token);
      setPlans(data);
    } catch (error) {
      console.error('Error refreshing plans:', error);
    }
  };

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

  const openDeleteConfirm = (plan: Plan) => {
    setTargetPlan(plan);
    setConfirmOpen(true);
  };

  const openMemo = (plan: Plan) => {
    setMemoTarget(plan);
    setMemoModalOpen(true);
  };

  const handleSaveMemo = async (text: string | null) => {
    if (!session || !memoTarget) return;
    try {
      await api.updateSimulationMemo(session.access_token, memoTarget.simulation_id, text);
      // optimistic update local state
  setPlans((prev: Plan[]) => prev.map((p: Plan) => p.simulation_id === memoTarget.simulation_id ? { ...p, memo: text || null } : p));
  setMemoTarget((prev: Plan | null) => prev ? { ...prev, memo: text || null } : prev);
    } catch (e) {
      console.error('Memo save error:', e);
      alert('메모 저장에 실패했습니다.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!session || !targetPlan) return;
    try {
      setDeletingId(targetPlan.simulation_id);
      await api.deleteSimulation(targetPlan.simulation_id, session.access_token);
      setConfirmOpen(false);
      setTargetPlan(null);
      await refreshPlans();
    } catch (e) {
      console.error('Delete simulation error:', e);
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan: Plan) => (
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
                    <td className="px-6 py-4 whitespace-nowrap max-w-[200px]">
                      <input
                        type="text"
                        readOnly
                        value={(plan.memo || '').length > 20 ? `${(plan.memo || '').slice(0, 20)}…` : (plan.memo || '')}
                        onClick={() => openMemo(plan)}
                        placeholder="메모 없음"
                        title={plan.memo || ''}
                        className="w-full text-sm border rounded px-2 py-1 cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 truncate"
                      />
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
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400 mr-4"
                        disabled={runningId === (plan.simulation_id)}
                      >
                        {runningId === (plan.simulation_id) ? '실행 중…' : '결과 보기'}
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(plan)}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                        disabled={deletingId === plan.simulation_id}
                      >
                        {deletingId === plan.simulation_id ? '삭제 중…' : '삭제'}
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
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="삭제 확인">
        <p className="mb-6">선택한 시뮬레이션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={() => setConfirmOpen(false)} className="bg-gray-500 hover:bg-gray-600">취소</Button>
          <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">삭제</Button>
        </div>
      </Modal>
      <MemoModal
        isOpen={memoModalOpen}
        initialMemo={memoTarget?.memo || ''}
        onClose={() => { setMemoModalOpen(false); setMemoTarget(null); }}
        onSave={handleSaveMemo}
      />
    </>
  );
};

export default MainPage;
