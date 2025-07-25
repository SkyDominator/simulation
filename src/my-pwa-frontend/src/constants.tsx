/**
 * Application constants and default parameters for investment simulation.
 */

// Default initial investment amounts by plan type
export const DEFAULT_INVESTMENT_AMOUNTS = {
  "A": {
    min_payment_new: {1: 0, 2: 220000, 3: 330000, 4: 330000, 5: 330000, 6: 330000, 
                      7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 
                      12: 2200000, 13: 3300000, 14: 5500000, 15: 11000000},
    max_rounds: 30
  },
  "B": {
    min_payment_new: {1: 110000, 2: 110000, 3: 110000, 4: 110000, 5: 110000, 6: 110000, 
                      7: 220000, 8: 220000, 9: 220000, 10: 440000, 11: 440000, 
                      12: 660000, 13: 770000, 14: 1100000, 15: 2310000},
    max_rounds: 30
  },
  "C": {
    min_payment_new: {1: 0, 2: 330000, 3: 330000, 4: 330000, 5: 330000, 6: 330000, 
                      7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 
                      12: 2200000, 13: 3300000, 14: 5500000, 15: 11000000},
    max_rounds: 30
  },
  "D": {
    min_payment_new: {1: 0, 2: 330000, 3: 330000, 4: 330000, 5: 330000, 6: 330000, 
                      7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 
                      12: 2200000, 13: 3300000, 14: 5500000, 15: 11000000, 16: 11000000, 
                      17: 22000000, 18: 22000000},
    max_rounds: 36
  },
  // Add other plan types as needed
  // Using placeholder for missing plans
  "R": { min_payment_new: {}, max_rounds: 36 },
  "E": { min_payment_new: {}, max_rounds: 36 },
  "F": { min_payment_new: {}, max_rounds: 36 },
  "K": { min_payment_new: {}, max_rounds: 36 },
  "P": { min_payment_new: {}, max_rounds: 36 }
};

// Local version tracking
export const PARAMETERS_VERSION = {
  version: "",
  lastChecked: ""
};




/* Plan Editor Page * / 

// Import the constants at the top of the file
import { DEFAULT_INVESTMENT_AMOUNTS, PARAMETERS_VERSION } from './constants';

// In PlanEditorPage component, add state for plan parameters
const PlanEditorPage: React.FC<{ setPage: (page: Page) => void; editingPlan: Plan | null }> = ({ setPage, editingPlan }) => {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<Plan>(editingPlan || {
    plan_type: 'A',
    company_round: 1,
    simulation_rounds: 15,
    investments: [],
  });
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<{
    value: number;
    min: number;
    max: number;
    field: keyof Plan;
  } | null>(null);
  
  // New state for plan parameters
  const [planParameters, setPlanParameters] = useState(DEFAULT_INVESTMENT_AMOUNTS);

  // Check parameters version when component mounts
  useEffect(() => {
    if (session) {
      const checkVersion = async () => {
        try {
          const versionData = await api.checkParametersVersion(session.access_token);
          
          // If version is different or we've never checked before, fetch fresh parameters
          if (versionData.version !== PARAMETERS_VERSION.version) {
            const { parameters } = await api.getParameters(session.access_token);
            setPlanParameters(parameters);
            
            // Update local version cache
            PARAMETERS_VERSION.version = versionData.version;
            PARAMETERS_VERSION.lastChecked = new Date().toISOString();
          }
        } catch (error) {
          console.error("Failed to check parameters version:", error);
          // Continue with default parameters if fetch fails
        }
      };
      
      checkVersion();
    }
  }, [session]);

  // 총 회차가 변경될 때마다 investment 배열을 자동으로 생성/조정합니다.
  useEffect(() => {
    const planType = plan.plan_type;
    const planParams = planParameters[planType] || { min_payment_new: {} };
    
    const newInvestments = Array.from({ length: plan.simulation_rounds }, (_, i) => {
      const roundNumber = i + 1;
      const existing = plan.investments.find(inv => inv.round === roundNumber);
      
      // Use the min_payment_new value for this round if available, or fall back to 0
      const defaultAmount = planParams.min_payment_new[roundNumber] || 0;
      
      return existing || { 
        round: roundNumber, 
        amount: defaultAmount
      };
    });
    
    setPlan(p => ({ ...p, investments: newInvestments }));
  }, [plan.simulation_rounds, plan.plan_type, editingPlan, planParameters]);

  // ...rest of the component remains the same
};