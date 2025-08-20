import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Plan, Page } from '../../types/types';
import type { ValidationData } from './types/index';

interface PlanEditorPageProps {
  setPage: (page: Page) => void;
  editingPlan: Plan | null;
}
import { 
  PlanTypeSelector, 
  CompanyRoundSelector, 
  SimulationRoundsSelector, 
  InvestmentEditor 
} from './components';
import { 
  ConfirmationModal, 
  ValidationModal, 
  InvestmentValidationModal 
} from './modals';
import { getPlanLimits, generateInvestments } from './utils/investmentUtils';
import { validateNumericValue, validateInvestmentAmounts } from './utils/validationUtils';

const PlanEditorPage: React.FC<PlanEditorPageProps> = ({ setPage, editingPlan }) => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const getDefaultSimulationRounds = (planType: string) => (['A','B','C'].includes(planType) ? 15 : 18);
  const basePlanType = editingPlan?.plan_id || 'A';
  const defaultSimRounds = getDefaultSimulationRounds(basePlanType);
  const initialPlan: Plan = {
    simulation_id: editingPlan?.simulation_id || '',
    plan_id: basePlanType,
    company_round: editingPlan?.company_round || 1,
    simulation_rounds: editingPlan?.simulation_rounds ?? defaultSimRounds,
    investments: editingPlan?.investments || generateInvestments(
      editingPlan?.simulation_rounds ?? defaultSimRounds,
      basePlanType,
      editingPlan?.investments || []
    ),
    sales_achievement_rates: editingPlan?.sales_achievement_rates || {},
  };
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  
  // Add state for investment validation modal
  const [isInvestmentValidationModalOpen, setInvestmentValidationModalOpen] = useState(false);
  const [invalidInvestments, setInvalidInvestments] = useState<Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }>>([]);

  // Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handlers
  const handleInvestmentChange = (round: number, amount: string) => {
    // Ensure amount is parsed as an integer
    const parsedAmount = amount === '' ? 0 : parseInt(amount, 10);
    const newInvestments = (plan.investments || []).map(inv => 
      inv.round === round ? { ...inv, amount: parsedAmount } : inv
    );
    setPlan({ ...plan, investments: newInvestments });
  };

  const handleSalesRateChange = (round: number, rate: number) => {
    setPlan(prev => ({
      ...prev,
      sales_achievement_rates: {
        ...(prev.sales_achievement_rates || {}),
        [round.toString()]: rate
      }
    }));
  };

  const handleValidation = (value: number, min: number, max: number, field: keyof Plan) => {
    const validationResult = validateNumericValue(value, min, max, field);
    if (validationResult) {
      setValidationData(validationResult);
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

  const handleInvestmentValidationConfirm = () => {
    setInvestmentValidationModalOpen(false);
    // Show confirmation modal after acknowledging investment changes
    setConfirmModalOpen(true);
  };

  const handleSaveClick = () => {
    // Validate investments before showing confirm modal
    const validation = validateInvestmentAmounts(plan.investments || [], plan.plan_id);
    
    if (validation.hasInvalidInvestments) {
      // Show validation modal with list of changes
      setInvalidInvestments(validation.correctedInvestments);
      setInvestmentValidationModalOpen(true);
      
      // Update investments with corrected values if available
      if (validation.updatedInvestments) {
        setPlan(prevPlan => ({
          ...prevPlan,
          investments: validation.updatedInvestments || prevPlan.investments || []
        }));
      }
    } else {
      // Proceed to confirmation modal
      setConfirmModalOpen(true);
    }
  };

  const handleNext = () => {
    if (step === 3) {
      const { min, max } = getPlanLimits(plan.plan_id);
      
      if (!handleValidation(plan.simulation_rounds, min, max, 'simulation_rounds')) {
        return;
      }
      
      // Force update investments when going from step 3 to 4
      const newInvestments = generateInvestments(plan.simulation_rounds, plan.plan_id, plan.investments);
      setPlan(prevPlan => ({ ...prevPlan, investments: newInvestments }));
    }
    
    setStep(s => s + 1);
  };
  
  const handleBack = () => {
    // Close all modals when going back
    setConfirmModalOpen(false);
    setInvestmentValidationModalOpen(false);
    setValidationModalOpen(false);
    
    // Go back one step
    setStep(s => s - 1);
  };

  const handleSave = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const scheduled_payment: Record<string, number> = {};
      const sales_achievement_rates: Record<string, number> = { ...(plan.sales_achievement_rates || {}) };
      (plan.investments || []).forEach(inv => {
        scheduled_payment[inv.round.toString()] = inv.amount;
        if (!(inv.round.toString() in sales_achievement_rates)) {
          sales_achievement_rates[inv.round.toString()] = 100;
        }
      });

      if (plan.simulation_id) {
        // Update existing simulation
        await api.updateSimulation(
          session.access_token,
          plan.simulation_id,
          plan.plan_id,
          plan.company_round,
          plan.simulation_rounds,
          scheduled_payment,
          sales_achievement_rates,
        );
      } else {
        // Create new simulation
        const createResponse = await api.createSimulation(
          session.access_token,
          plan.plan_id,
          plan.company_round,
          plan.simulation_rounds,
          scheduled_payment,
          sales_achievement_rates,
        );
        if (createResponse?.simulation_id) {
          setPlan(prev => ({ ...prev, simulation_id: createResponse.simulation_id }));
        } else {
          alert('시뮬레이션 ID를 찾을 수 없습니다.');
          return;
        }
      }

    if (isMountedRef.current) {
      setConfirmModalOpen(false);
      setIsLoading(false);
      alert(plan.simulation_id ? '시뮬레이션이 업데이트되었습니다.' : '시뮬레이션이 생성되었습니다.');
      setPage('main');
    }
    } catch (error) {
      console.error('Save or simulation error:', error);
      if (isMountedRef.current) {
        alert('시뮬레이션 요청에 실패했습니다.');
      }
    } finally {
        // do nothing
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PlanTypeSelector planType={plan.plan_id} onChange={value => {
          setPlan(prev => {
            const prevDefault = getDefaultSimulationRounds(prev.plan_id);
            const nextDefault = getDefaultSimulationRounds(value);
            const userUnmodified = prev.simulation_rounds === prevDefault;
            return {
              ...prev,
              plan_id: value,
              simulation_rounds: userUnmodified ? nextDefault : prev.simulation_rounds,
              investments: userUnmodified ? generateInvestments(nextDefault, value, prev.investments) : prev.investments,
            };
          });
        }} />;
      case 2:
        return <CompanyRoundSelector companyRound={plan.company_round} onChange={value => setPlan({ ...plan, company_round: value })} />;
      case 3:
        return <SimulationRoundsSelector 
          simulationRounds={plan.simulation_rounds} 
          planType={plan.plan_id} 
          onChange={value => setPlan({ ...plan, simulation_rounds: value })} 
        />;
      case 4:
        return <InvestmentEditor 
          investments={plan.investments || []} 
          companyRound={plan.company_round} 
          planType={plan.plan_id}
          onInvestmentChange={handleInvestmentChange}
          salesAchievementRates={plan.sales_achievement_rates || {}}
          onSalesRateChange={handleSalesRateChange}
        />;
      default:
        return null;
    }
  };

  // No useEffect needed; investments are initialized above and refreshed on step transitions

  const handleInvestmentValidationClose = () => {
    setInvestmentValidationModalOpen(false);
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
            {step === 4 && <Button onClick={handleSaveClick} className="bg-green-600 hover:bg-green-700"> 저장</Button>}
          </div>
        </div>
      </div>
      <Button 
        onClick={() => {
          // Close all modals when returning to main
          setConfirmModalOpen(false);
          setInvestmentValidationModalOpen(false);
          setValidationModalOpen(false);
          setPage('main');
        }} 
        className="mt-4 bg-gray-200 text-black hover:bg-gray-300"
      >
        메인으로 돌아가기
      </Button>

      {/* Modals */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleSave}
        plan={plan}
        isLoading={isLoading}
      />

      <ValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        onConfirm={handleValidationConfirm}
        validationData={validationData}
      />
      
      <InvestmentValidationModal
        isOpen={isInvestmentValidationModalOpen}
        onClose={handleInvestmentValidationClose}
        onConfirm={handleInvestmentValidationConfirm}
        invalidInvestments={invalidInvestments}
      />
    </div>
  );
};

export default PlanEditorPage;
