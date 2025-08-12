import React, { useState, useEffect } from 'react';
import { type Plan } from '../types/types';
import { DEFAULT_INVESTMENT_AMOUNTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

// Types
interface PlanEditorPageProps {
  setPage: (page: string) => void;
  editingPlan: Plan | null;
}

interface Investment {
  round: number;
  amount: number;
}

interface ValidationData {
  value: number;
  min: number;
  max: number;
  field: keyof Plan;
}

// Helper functions
const getDefaultInvestmentAmount = (planType: string, round: number): number => {
  try {
    const planData = DEFAULT_INVESTMENT_AMOUNTS[planType as keyof typeof DEFAULT_INVESTMENT_AMOUNTS];
    if (planData?.min_payment_new) {
      const minPayments = planData.min_payment_new as Record<string | number, number>;
      if (round in minPayments) {
        return minPayments[round];
      } else {
        const isABC = ['A', 'B', 'C'].includes(planType);
        const maxRound = isABC ? 15 : 18;
        return minPayments[maxRound]; // Use the last defined round for this plan type
      }
    }
  } catch (error) {
    console.error("Error getting default investment amount:", error);
  }
  return 0;
};

const getPlanLimits = (planType: string) => {
  const isABC = ['A', 'B', 'C'].includes(planType);
  return {
    min: isABC ? 15 : 18,
    max: isABC ? 150 : 180
  };
};

const generateInvestments = (simulationRounds: number, planType: string, existingInvestments: Investment[] = []): Investment[] => {
  return Array.from({ length: simulationRounds }, (_, i) => {
    const round = i + 1;
    const existing = existingInvestments.find(inv => inv.round === round);
    
    if (existing) {
      return existing;
    } else {
      const defaultAmount = getDefaultInvestmentAmount(planType, round);
      return { round, amount: defaultAmount };
    }
  });
};

// Step components
const PlanTypeSelector = ({ planType, onChange }: { planType: string, onChange: (value: string) => void }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">1. 플랜 선택</h2>
    <select
      value={planType}
      onChange={e => onChange(e.target.value)}
      className="w-full p-2 border rounded-md"
    >
      {['A', 'B', 'C', 'D', 'R', 'E', 'F', 'K', 'P'].map(p => <option key={p} value={p}>{p} 플랜</option>)}
    </select>
  </div>
);

const CompanyRoundSelector = ({ companyRound, onChange }: { companyRound: number, onChange: (value: number) => void }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">2. 회사 회차 선택</h2>
    <Input 
      type="number" 
      value={companyRound === 0 ? "" : companyRound}
      placeholder="회차를 입력하세요 (예: 1)" 
      onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
    />
  </div>
);

const SimulationRoundsSelector = ({ 
  simulationRounds, 
  planType, 
  onChange 
}: { 
  simulationRounds: number, 
  planType: string, 
  onChange: (value: number) => void 
}) => {
  const { min, max } = getPlanLimits(planType);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">3. 시뮬레이션 총 회차 수 선택</h2>
      <p className="text-sm mb-2">최소: {min}, 최대: {max}</p>
      <Input 
        type="number"
        placeholder={`최소 ${min}, 최대 ${max} 회차`}
        value={isNaN(simulationRounds) ? "" : simulationRounds} 
        onChange={e => onChange(e.target.value === "" ? NaN : parseInt(e.target.value, 10))}
      />
    </div>
  );
};

const InvestmentEditor = ({ 
  investments, 
  companyRound, 
  planType, 
  onInvestmentChange 
}: { 
  investments: Investment[], 
  companyRound: number, 
  planType: string,
  onInvestmentChange: (round: number, amount: string) => void 
}) => (
  <div>
    <h2 className="text-xl font-bold mb-4">4. 회차별 투자액 입력</h2>
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
          <tr>
            <th scope="col" className="px-6 py-3">회사 회차</th>
            <th scope="col" className="px-6 py-3">개인 회차</th>
            <th scope="col" className="px-6 py-3">투자액</th>
          </tr>
        </thead>
        <tbody>
          {investments.length > 0 ? (
            investments.map((inv, index) => {
              const defaultAmount = getDefaultInvestmentAmount(planType, inv.round);
              return (
                <tr key={inv.round} className="bg-white border-b">
                  <td className="px-6 py-4">{companyRound + index}</td>
                  <td className="px-6 py-4">{inv.round}</td>
                  <td className="px-6 py-4">
                    <Input 
                      type="number" 
                      value={inv.amount || ''}
                      placeholder={defaultAmount ? `최소값: ${defaultAmount.toLocaleString()}` : '투자액 입력 (0 불가)'}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        const amount = isNaN(val) ? '' : e.target.value;
                        onInvestmentChange(inv.round, amount);
                      }}
                    />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center">
                투자 회차 정보가 없습니다. 이전 단계에서 총 회차를 설정해주세요.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Main component
const PlanEditorPage: React.FC<PlanEditorPageProps> = ({ setPage, editingPlan }) => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<Plan>(editingPlan || {
    plan_type: 'A',
    company_round: 1,
    simulation_rounds: 15,
    investments: [],
  });
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);

  const handleInvestmentChange = (round: number, amount: string) => {
    const parsedAmount = amount === '' ? 0 : parseInt(amount, 10);
    const newInvestments = plan.investments.map(inv => 
      inv.round === round ? { ...inv, amount: parsedAmount } : inv
    );
    setPlan({ ...plan, investments: newInvestments });
  };

  const handleValidation = (value: number, min: number, max: number, field: keyof Plan) => {
    if (value < min || value > max) {
      setValidationData({ value, min, max, field });
      setValidationModalOpen(true);
      return false;
    }
    return true;
  };

  const handleValidationConfirm = () => {
    if (!validationData) return;
    
    const { value, min, max, field } = validationData;
    const newValue = value < min ? min : max;
    
    setPlan(prev => ({ ...prev, [field]: newValue }));
    setValidationModalOpen(false);
  };

  const handleNext = () => {
    if (step === 3) {
      const { min, max } = getPlanLimits(plan.plan_type);
      
      if (!handleValidation(plan.simulation_rounds, min, max, 'simulation_rounds')) {
        return;
      }
      
      // Force update investments when going from step 3 to 4
      const newInvestments = generateInvestments(plan.simulation_rounds, plan.plan_type, plan.investments);
      setPlan(prevPlan => ({ ...prevPlan, investments: newInvestments }));
    }
    
    setStep(s => s + 1);
  };
  
  const handleBack = () => setStep(s => s - 1);

  const handleSave = async () => {
    if (!session) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    try {
      // Create scheduled_payment object
      const scheduled_payment: Record<string, number> = {};
      
      plan.investments.forEach(inv => {
        const defaultAmount = getDefaultInvestmentAmount(plan.plan_type, inv.round);
        // Use default amount if amount is 0 or not set
        const amount = !inv.amount || inv.amount <= 0 ? defaultAmount : inv.amount;
        scheduled_payment[inv.round.toString()] = amount;
      });
      
      // Run custom simulation
      await api.runCustomSimulation(
        plan.plan_type,
        plan.simulation_rounds,
        scheduled_payment,
        session.access_token
      );
      
      if (isMounted) {
        setConfirmModalOpen(false);
        alert('시뮬레이션이 완료되었고 결과가 성공적으로 저장되었습니다.');
        setPage('main');
        
        if (confirm('시뮬레이션 결과 보기 페이지로 이동하시겠습니까?')) {
          setTimeout(() => {
            if (isMounted) {
              setPage('results');
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error("Save or simulation error:", error);
      if (isMounted) {
        alert("시뮬레이션 실행 또는 결과 저장에 실패했습니다.");
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PlanTypeSelector planType={plan.plan_type} onChange={value => setPlan({ ...plan, plan_type: value })} />;
      case 2:
        return <CompanyRoundSelector companyRound={plan.company_round} onChange={value => setPlan({ ...plan, company_round: value })} />;
      case 3:
        return <SimulationRoundsSelector 
          simulationRounds={plan.simulation_rounds} 
          planType={plan.plan_type} 
          onChange={value => setPlan({ ...plan, simulation_rounds: value })} 
        />;
      case 4:
        return <InvestmentEditor 
          investments={plan.investments} 
          companyRound={plan.company_round} 
          planType={plan.plan_type}
          onInvestmentChange={handleInvestmentChange} 
        />;
      default:
        return null;
    }
  };

  // Update investments when plan type or simulation rounds change
  useEffect(() => {
    // Skip if we're editing a plan and investments count already matches simulation rounds
    if (editingPlan && plan.investments && plan.investments.length === plan.simulation_rounds) {
      return;
    }
    
    const newInvestments = generateInvestments(plan.simulation_rounds, plan.plan_type, plan.investments);
    setPlan(p => ({ ...p, investments: newInvestments }));
  }, []);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-8">{editingPlan ? '플랜 수정하기' : '새 플랜 만들기'}</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        {renderStep()}
        <div className="flex justify-between mt-8">
          {step > 1 ? <Button onClick={handleBack} className="bg-gray-500 hover:bg-gray-600">뒤로 가기</Button> : <div />}
          <div className="flex gap-4">
            {step < 4 && <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">다음 단계</Button>}
            {step === 4 && <Button onClick={() => setConfirmModalOpen(true)} className="bg-green-600 hover:bg-green-700">저장</Button>}
          </div>
        </div>
      </div>
      <Button onClick={() => setPage('main')} className="mt-4 bg-gray-200 text-black hover:bg-gray-300">메인으로 돌아가기</Button>

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="저장 확인">
        <div>
          <h3 className="font-bold">플랜 요약</h3>
          <p>플랜 타입: {plan.plan_type}</p>
          <p>회사 회차: {plan.company_round}</p>
          <p>총 시뮬레이션 회차: {plan.simulation_rounds}</p>
          <div className="flex justify-end gap-4 mt-4">
            <Button onClick={() => setConfirmModalOpen(false)} className="bg-gray-500 hover:bg-gray-600">취소</Button>
            <Button 
              onClick={handleSave} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '최종 저장'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Validation Modal */}
      <Modal 
        isOpen={isValidationModalOpen} 
        onClose={() => setValidationModalOpen(false)} 
        title="입력값 경고"
      >
        <div>
          <p>
            {validationData && validationData.value < validationData.min 
              ? `값이 최소 ${validationData?.min}보다 작습니다. ${validationData?.min}으로 설정하시겠습니까?`
              : `값이 최대 ${validationData?.max}보다 큽니다. ${validationData?.max}로 설정하시겠습니까?`
            }
          </p>
          <div className="flex justify-end gap-4 mt-4">
            <Button onClick={() => setValidationModalOpen(false)} className="bg-gray-500 hover:bg-gray-600">취소</Button>
            <Button onClick={handleValidationConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanEditorPage;
