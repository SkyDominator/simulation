import React, { useState, useEffect } from 'react';
import { type Plan } from '../types/types';
import { DEFAULT_INVESTMENT_AMOUNTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

interface PlanEditorPageProps {
  setPage: (page: any) => void; // Using 'any' for now to fix type issues
  editingPlan: Plan | null;
}

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
  
  // Add new state variables for validation modal
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<{
    value: number;
    min: number;
    max: number;
    field: keyof Plan;
  } | null>(null);

  // 총 회차가 변경될 때마다 investment 배열을 자동으로 생성/조정합니다.
  useEffect(() => {
    // 이미 investments가 있고 길이가 simulation_rounds와 같으면 수정하지 않음
    if (editingPlan && plan.investments && plan.investments.length === plan.simulation_rounds) {
      return;
    }
    
    const newInvestments = Array.from({ length: plan.simulation_rounds }, (_, i) => {
        // 기존 투자액이 있는지 확인
        const existing = plan.investments?.find(inv => inv.round === i + 1);
        
        if (existing) {
          return existing; // 기존 투자액 사용
        } else {
          // 기본 투자액 정보 가져오기 시도
          let defaultAmount = 0;
          try {
            const planType = plan.plan_type as keyof typeof DEFAULT_INVESTMENT_AMOUNTS;
            const round = i + 1;
            // 안전하게 타입 처리 및 존재 여부 확인
            const planData = DEFAULT_INVESTMENT_AMOUNTS[planType];
            if (planData && planData.min_payment_new) {
              // 타입 안전하게 처리
              const minPayments = planData.min_payment_new as Record<string | number, number>;
              if (round in minPayments) {
                defaultAmount = minPayments[round];
              } else {
                // 정의되지 않은 회차의 경우 해당 플랜 타입의 마지막 정의된 회차 값 사용
                // A, B, C 플랜은 15회차까지, D, R, E, F, K, P 플랜은 18회차까지 정의됨
                const maxRound = ['A', 'B', 'C'].includes(planType) ? 15 : 18;
                defaultAmount = minPayments[maxRound]; // 해당 플랜의 마지막 회차 값
              }
            }
          } catch (error) {
            console.error("Error getting default investment amount:", error);
          }
          return { round: i + 1, amount: defaultAmount }; // 기본 투자액으로 초기화
        }
    });
    
    setPlan(p => ({ ...p, investments: newInvestments }));
  }, [plan.simulation_rounds, plan.plan_type, plan.investments, editingPlan]); // 모든 관련 의존성 포함

  // Update handleNext to include validation
  const handleNext = () => {
    // For step 3, validate simulation_rounds before proceeding
    if (step === 3) {
      const isABC = ['A', 'B', 'C'].includes(plan.plan_type);
      const min = isABC ? 15 : 18;
      const max = isABC ? 150 : 180;
      
      // If validation fails, the modal will be shown and we return early
      if (!handleValidation(plan.simulation_rounds, min, max, 'simulation_rounds')) {
        return;
      }
      
      // Step 3에서 4로 넘어갈 때 investments 배열을 강제로 업데이트
      const newInvestments = Array.from({ length: plan.simulation_rounds }, (_, i) => {
        // 기존 투자액이 있는지 확인
        const existing = plan.investments?.find(inv => inv.round === i + 1);
        
        if (existing) {
          return existing; // 기존 투자액 사용
        } else {
          // 기본 투자액 정보 가져오기
          let defaultAmount = 0;
          try {
            const planType = plan.plan_type as keyof typeof DEFAULT_INVESTMENT_AMOUNTS;
            const planData = DEFAULT_INVESTMENT_AMOUNTS[planType];
            if (planData && planData.min_payment_new) {
              const minPayments = planData.min_payment_new as Record<string | number, number>;
              const round = i + 1;
              if (round in minPayments) {
                defaultAmount = minPayments[round];
              } else {
                // 정의되지 않은 회차의 경우 해당 플랜 타입의 마지막 정의된 회차 값 사용
                // A, B, C 플랜은 15회차까지, D, R, E, F, K, P 플랜은 18회차까지 정의됨
                const maxRound = ['A', 'B', 'C'].includes(planType) ? 15 : 18;
                defaultAmount = minPayments[maxRound]; // 해당 플랜의 마지막 회차 값
              }
            }
          } catch (error) {
            console.error("Error setting default investment amount:", error);
          }
          return { round: i + 1, amount: defaultAmount };
        }
      });
      
      // 직접 투자 금액 배열 업데이트
      setPlan(prevPlan => ({ ...prevPlan, investments: newInvestments }));
    }
    
    // If validation passes or we're on another step, proceed normally
    setStep(s => s + 1);
  };
  
  const handleBack = () => setStep(s => s - 1);

  // 회차별 투자액 변경 핸들러
  // 사용자가 입력한 투자액을 업데이트합니다. 투자액 업데이트하면 re-render
  const handleInvestmentChange = (round: number, amount: string) => {
    // 사용자가 값을 지우면 빈 문자열로 유지하되, investments에는 0을 저장
    // 0은 handleSave에서 defaultAmount로 대체될 것임
    const parsedAmount = amount === '' ? 0 : parseInt(amount, 10);
    const newInvestments = plan.investments.map(inv => 
      inv.round === round ? { ...inv, amount: parsedAmount } : inv
    );
    setPlan({ ...plan, investments: newInvestments });
  };

  // Add validation handler
  const handleValidation = (value: number, min: number, max: number, field: keyof Plan) => {
    if (value < min || value > max) {
      setValidationData({ value, min, max, field });
      setValidationModalOpen(true);
      return false; // Validation failed, show modal
    }
    return true; // Validation passed, proceed
  };

  // Handle validation confirmation
  const handleValidationConfirm = () => {
    if (!validationData) return;
    
    const { value, min, max, field } = validationData;
    const newValue = value < min ? min : max;
    
    setPlan(prev => ({ ...prev, [field]: newValue }));
    setValidationModalOpen(false);
  };

  // Handle validation cancellation
  const handleValidationCancel = () => {
    setValidationModalOpen(false);
  };

 // 최종 저장 핸들러
  // 사용자가 입력한 플랜 정보를 백엔드에 저장하고 시뮬레이션 결과를 가져옵니다.
    const handleSave = async () => {
    if (!session) return;
    
    // Set a flag to track if component is still mounted
    let isMounted = true;
    // Show loading state
    setIsLoading(true);
    
    try {
        // 사용자가 입력한 scheduled_payment 객체 만들기
        const scheduled_payment: Record<string, number> = {};
        
        plan.investments.forEach(inv => {
            // If amount is 0 or not set, use the default minimum investment amount for this plan type and round
            const planType = plan.plan_type as keyof typeof DEFAULT_INVESTMENT_AMOUNTS;
            // 타입 안전하게 처리
            let defaultAmount = 0;
            try {
                const planData = DEFAULT_INVESTMENT_AMOUNTS[planType];
                if (planData && planData.min_payment_new) {
                    // 타입 안전하게 처리
                    const minPayments = planData.min_payment_new as Record<string | number, number>;
                    if (inv.round in minPayments) {
                        defaultAmount = minPayments[inv.round];
                    } else {
                        // 정의되지 않은 회차의 경우 해당 플랜 타입의 마지막 정의된 회차 값 사용
                        // A, B, C 플랜은 15회차까지, D, R, E, F, K, P 플랜은 18회차까지 정의됨
                        const maxRound = ['A', 'B', 'C'].includes(planType) ? 15 : 18;
                        defaultAmount = minPayments[maxRound]; // 해당 플랜의 마지막 회차 값
                    }
                }
            } catch (error) {
                console.error("Error getting default amount in save:", error);
            }
            
            // 만약 투자액이 없거나 0이면 기본액 사용
            const amount = !inv.amount || inv.amount <= 0 ? defaultAmount : inv.amount;
            
            // Convert to string key for the API
            scheduled_payment[inv.round.toString()] = amount;
        });
        
        // 커스텀 시뮬레이션 API 호출
        // 백엔드에서 시뮬레이션 실행 후 결과를 Supabase에 저장하는 과정을 수행
        await api.runCustomSimulation(
            plan.plan_type,
            plan.simulation_rounds,
            scheduled_payment,
            session.access_token
        );
        
        if (isMounted) {
            setConfirmModalOpen(false);
            
            // 성공 메시지 표시
            alert('시뮬레이션이 완료되었고 결과가 성공적으로 저장되었습니다.');
            
            // 메인 페이지로 이동
            setPage('main');
            
            // 결과 보기 페이지 이동 옵션
            if (confirm('시뮬레이션 결과 보기 페이지로 이동하시겠습니까?')) {
                // 잠시 지연 후 결과 페이지로 이동 (백엔드 처리 및 DB 반영 시간 확보)
                setTimeout(() => {
                    if (isMounted) {
                        setPage('results');
                    }
                }, 500); // 0.5초 지연
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
    
    // Cleanup function
    return () => {
        isMounted = false;
    };
    };

  const renderStep = () => {
    switch (step) {
      case 1: // 플랜 선택
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">1. 플랜 선택</h2>
            <select
              value={plan.plan_type}
              onChange={e => setPlan({ ...plan, plan_type: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              {['A', 'B', 'C', 'D', 'R', 'E', 'F', 'K', 'P'].map(p => <option key={p} value={p}>{p} 플랜</option>)}
            </select>
          </div>
        );
      case 2: // 회사 회차 선택
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">2. 회사 회차 선택</h2>
            <Input 
              type="number" 
              value={plan.company_round == 0 ? "" : plan.company_round}
              placeholder="회차를 입력하세요 (예: 1)" 
              onChange={e => setPlan({ ...plan, company_round: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
        );
      case 3: { // 시뮬레이션 총 회차 수 선택
        const isABC = ['A', 'B', 'C'].includes(plan.plan_type);
        const min = isABC ? 15 : 18;
        const max = isABC ? 150 : 180;
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">3. 시뮬레이션 총 회차 수 선택</h2>
            <p className="text-sm mb-2">최소: {min}, 최대: {max}</p>
            <Input 
              type="number"
              placeholder={`최소 ${min}, 최대 ${max} 회차`}
              value={isNaN(plan.simulation_rounds) ? "" : plan.simulation_rounds} 
              onChange={e => {
                // 일단 인풋 필드에 어떤 값이던지 받아들이고 이 값으로 plan.simulation_rounds를 업데이트합니다. 그리고 "다음 단계"를 눌렀을 때, handleNext에서 handleValidation을 호출하여 검증합니다. 그래서 조건에 따라 그냥 넘어가거나 아니면 handleNext에서 step을 증가시키지 않고 Modal을 띄워서 min/max로 수정할지 말지를 문의합니다.

                const val = e.target.value;
                // Update value immediately without validation
                setPlan({ ...plan, simulation_rounds: val === "" ? NaN : parseInt(val, 10) });
              }}
              // Remove the onBlur validation as we'll validate when Next is clicked
            />
          </div>
        );
    }
      case 4: // 회차별 투자액 입력
        return (
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
                  {plan.investments && plan.investments.length > 0 ? (
                    plan.investments.map((inv, index) => {
                      // Get the default investment amount for this plan type and round
                      const planType = plan.plan_type as keyof typeof DEFAULT_INVESTMENT_AMOUNTS;
                      // 안전하게 defaultAmount 설정
                      let defaultAmount = 0;
                      try {
                        const planData = DEFAULT_INVESTMENT_AMOUNTS[planType];
                        if (planData && planData.min_payment_new) {
                          // 타입 안전하게 처리
                          const minPayments = planData.min_payment_new as Record<string | number, number>;
                          if (inv.round in minPayments) {
                            defaultAmount = minPayments[inv.round];
                          } else {
                            // 정의되지 않은 회차의 경우 해당 플랜 타입의 마지막 정의된 회차 값 사용
                            // A, B, C 플랜은 15회차까지, D, R, E, F, K, P 플랜은 18회차까지 정의됨
                            const maxRound = ['A', 'B', 'C'].includes(planType) ? 15 : 18;
                            defaultAmount = minPayments[maxRound]; // 해당 플랜의 마지막 회차 값
                          }
                        }
                      } catch (error) {
                        console.error("Error getting default amount:", error);
                      }
                      
                      return (
                        <tr key={inv.round} className="bg-white border-b">
                          <td className="px-6 py-4">{plan.company_round + index}</td>
                          <td className="px-6 py-4">{inv.round}</td>
                          <td className="px-6 py-4">
                            <Input 
                              type="number" 
                              value={inv.amount || ''}
                              placeholder={defaultAmount ? `기본값: ${defaultAmount.toLocaleString()}` : '투자액 입력 (0 불가)'}
                              onChange={e => {
                                const val = parseInt(e.target.value);
                                // 음수 및 0 입력 방지
                                const amount = isNaN(val) || val <= 0 ? '' : e.target.value;
                                handleInvestmentChange(inv.round, amount);
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
      default:
        return null;
    }
  };

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

      {/* No simulation results modal - results are shown in ResultsPage */}

      {/* Add validation modal */}
      <Modal 
        isOpen={isValidationModalOpen} 
        onClose={handleValidationCancel} 
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
            <Button onClick={handleValidationCancel} className="bg-gray-500 hover:bg-gray-600">취소</Button>
            <Button onClick={handleValidationConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanEditorPage;
