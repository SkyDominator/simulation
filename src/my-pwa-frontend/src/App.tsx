/*
  [개발자 노트]
  이 코드를 실행하기 전에, 터미널에서 아래 명령어를 실행하여
  Supabase 클라이언트 라이브러리를 반드시 설치해야 합니다.
  이 과정을 생략하면 "Could not resolve '@supabase/supabase-js'" 에러가 발생합니다.

  npm install @supabase/supabase-js
  
  [프로그램 흐름]
  1. 사용자가 step 1~4까지 플랜 정보 입력 후 저장
  2. 프론트엔드가 백엔드 custom-simulation API 호출
  3. 백엔드가 시뮬레이션 수행 및 결과를 Supabase DB에 저장
  4. 성공 시 사용자에게 결과 보기 페이지 이동 옵션 제공
  5. 결과 페이지에서 사용자가 플랜 목록을 확인하고 플랜 선택
  6. "결과 보기" 버튼 클릭 시 프론트엔드가 백엔드에 특정 플랜의 시뮬레이션 결과 요청
  7. 백엔드가 Supabase DB에서 해당 플랜의 결과를 조회하여 프론트엔드로 전달
  8. 프론트엔드는 받은 결과를 화면에 표시
*/
import React, { useState, useEffect, createContext, useContext } from 'react';
import { createClient, type Session, type User } from '@supabase/supabase-js';

// 투자 금액 상수 파일을 import합니다.
import { DEFAULT_INVESTMENT_AMOUNTS } from './constants';

// --- 1. 타입 정의: 앱 전체에서 사용될 데이터 구조를 정의합니다 ---
// 이 부분은 TypeScript의 장점으로, 코드의 안정성을 높여줍니다.

// 투자 플랜의 기본 구조
interface Plan {
  id?: string; // DB에 저장된 후에는 UUID가 할당됩니다.
  plan_type: string;
  company_round: number;
  simulation_rounds: number;
  investments: { round: number; amount: number }[];
  user_id?: string;
  simulation_results?: SimulationResults;
  created_at?: string; // Supabase에서 자동으로 생성되는 timestamp
  updated_at?: string; // Supabase에서 자동으로 업데이트되는 timestamp
  last_simulation_date?: string; // 마지막 시뮬레이션 실행 날짜
}

// 시뮬레이션 결과 구조
interface SimulationRoundResult {
  company_round: number;
  investor_count: number;
  total_payment: number;
  total_revenue_before_tax: number;
  total_revenue_after_tax: number;
  net_profit_after_tax: number;
  cumulative_net_profit: number;
}

interface SimulationResults {
  plan_id: string;
  history: SimulationRoundResult[];
}

// 인증 관련 상태와 함수들을 담을 컨텍스트(Context) 타입
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// API 응답 타입
interface WhitelistCheckResponse {
  is_whitelisted: boolean;
  detail?: string; // 추가 정보 (예: 명단에 없을 경우)
}

// 페이지 종류를 정의 (간단한 라우팅을 위해 사용)
type Page = 'whitelist' | 'login' | 'main' | 'plan-editor' | 'results';


// --- 2. Supabase 클라이언트 설정 ---
// !!! 중요: 아래 값을 자신의 Supabase 프로젝트 URL과 Publishable Key로 직접 변경해주세요 !!!
// Vite의 환경 변수(.env) 관련 빌드 오류를 피하기 위해 코드에 직접 키를 입력합니다.
// 경고: 이 프로젝트를 GitHub 등에 공개적으로 올릴 경우, 이 키들을 노출하지 않도록 주의해야 합니다.
const supabaseUrl = "https://kihlqhomsychihwzwzuo.supabase.co" // 자신의 Supabase 프로젝트 URL로 변경
const supabaseKey = "sb_publishable_8H_WkhgiIM40Y9H32qaahw_2HKn3fdF" // 자신의 Supabase Publishable Key로 변경

if (!supabaseUrl || !supabaseKey) {
  // 이 에러는 키를 입력하지 않았을 때 나타납니다. 위의 변수에 실제 키를 입력해주세요.
  alert("Supabase URL과 Key를 App.tsx 파일 상단에 직접 입력해주세요.");
}
const supabase = createClient(supabaseUrl, supabaseKey);


// --- 3. 인증 컨텍스트(Context) 생성 ---
// 앱 전체에서 로그인 상태를 쉽게 공유하고 관리하기 위한 전역 저장소입니다.
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider: 앱의 최상위 컴포넌트를 감싸서, 모든 자식 컴포넌트에게 인증 상태를 제공합니다.
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

// In AuthProvider, make sure to handle unsubscribe properly
    useEffect(() => {
    const getSession = async () => {
        try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        } catch (error) {
        console.error("Auth error:", error);
        } finally {
        setLoading(false);
        }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
        try {
            setSession(session);
            setUser(session?.user ?? null);
        } catch (error) {
            console.error("Auth state change error:", error);
        }
        setLoading(false);
        }
    );

    // Ensure proper cleanup
    return () => {
        try {
        authListener?.subscription?.unsubscribe();
        } catch (error) {
        console.error("Cleanup error:", error);
        }
    };
    }, []);

    const signOut = async () => {
    await supabase.auth.signOut();
    };

    const value = { session, user, loading, signOut };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth: 자식 컴포넌트에서 인증 상태를 쉽게 가져다 쓸 수 있게 해주는 커스텀 훅(Hook)
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.');
  }
  return context;
};


// --- 4. API 통신 함수 모음 ---
// 백엔드(FastAPI)와 통신하는 모든 fetch 함수들을 이곳에 모아 관리합니다.
const API_BASE_URL = 'http://127.0.0.1:8000/api'; // 로컬 FastAPI 서버 주소

const api = {
  // 명단(Whitelist) 확인 요청
  checkWhitelist: async (name: string, phone_number: string): Promise<WhitelistCheckResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone_number }),
    });
    if (!response.ok) throw new Error('명단 확인에 실패했습니다.');
    return response.json();
  },

    // 현재 흐름에서는 파라미터를 직접 constants.ts에서 가져오므로 관련 API 제거

  // 사용자의 모든 플랜 기본 정보 가져오기 (시뮬레이션 결과 제외)
  getPlans: async (token: string): Promise<Plan[]> => {
    const response = await fetch(`${API_BASE_URL}/plans`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('플랜 목록을 불러오는 데 실패했습니다.');
    return response.json();
  },
  
  // 특정 플랜의 상세 정보 및 시뮬레이션 결과 가져오기
  getPlanDetails: async (planId: string, token: string): Promise<Plan> => {
    const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('해당 플랜을 찾을 수 없습니다.');
      }
      throw new Error('플랜 상세 정보를 불러오는 데 실패했습니다.');
    }
    return response.json();
  },
  // 새 플랜 생성하기
  // 이제 백엔드에서 직접 DB에 저장하므로 별도의 createPlan API가 필요 없음
  // 이제 우리 흐름에서는 백엔드가 직접 DB에 저장/수정하므로 별도의 updatePlan, deletePlan 함수가 필요 없음
  // 사용하지 않는 runSimulation API 제거
  
  // 커스텀 시뮬레이션 실행 API
  runCustomSimulation: async (
    plan_id: string,
    max_rounds: number,
    scheduled_payment: Record<string, number>,
    token: string
  ): Promise<SimulationResults & { success: boolean, message: string }> => {
    const response = await fetch(`${API_BASE_URL}/custom-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id,
        max_rounds,
        scheduled_payment
      }),
    });
    if (!response.ok) throw new Error('커스텀 시뮬레이션 실행에 실패했습니다.');
    const data = await response.json();
    
    // 백엔드에서 반환된 success 및 message 필드 확인
    if (!data.success) {
      throw new Error(data.message || '시뮬레이션 결과 저장에 실패했습니다.');
    }
    
    return data;
  }
};


// --- 5. 재사용 가능한 UI 컴포넌트 ---

// 버튼 컴포넌트
const Button: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; type?: 'button' | 'submit'; disabled?: boolean; }> = 
({ onClick, children, className = '', type = 'button', disabled = false }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-semibold text-white transition-colors disabled:bg-gray-400 ${className}`}
  >
    {children}
  </button>
);

// 입력 필드 컴포넌트
const Input: React.FC<{ 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string; 
  type?: string; 
  className?: string; 
}> = 
({ value, onChange, onBlur, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

// 모달(팝업) 컴포넌트
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }> = 
({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};


// --- 6. 페이지별 컴포넌트 ---

// 6.1. 명단 확인 페이지
const WhitelistCheckPage: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.checkWhitelist(name, phone);
      if (result.is_whitelisted) {
        onVerified();
      } else {
        setError('가입 대상이 아닙니다. 관리자에게 문의하세요.');
      }
    } catch (err: unknown) {
      console.error('Whitelist check error:', err);
      setError('확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">가입 자격 확인</h1>
        <p className="text-sm text-gray-600 text-center">
          입력하신 정보는 가입 가능 여부 확인 용도로만 사용되며, 저장되지 않습니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호 (010-1234-5678)" />
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? '확인 중...' : '확인'}
          </Button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
};

// 6.2. 소셜 로그인 페이지
const LoginPage: React.FC = () => {
    const handleSocialLogin = async (provider: 'google' | 'kakao') => {
        await supabase.auth.signInWithOAuth({ 
            provider,
            options: {
                redirectTo: window.location.origin,
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center">로그인</h1>
                <div className="space-y-4">
                    <Button onClick={() => handleSocialLogin('google')} className="w-full bg-red-500 hover:bg-red-600">
                        Google로 로그인
                    </Button>
                    <Button onClick={() => handleSocialLogin('kakao')} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black">
                        카카오로 로그인
                    </Button>
                </div>
            </div>
        </div>
    );
};

// 6.3. 메인 페이지
const MainPage: React.FC<{ 
  setPage: (page: Page) => void; 
  setEditingPlan: (plan: Plan | null) => void;
  openNotice?: () => void;
}> = ({ setPage, setEditingPlan, openNotice }) => {
  const { user, signOut } = useAuth();

  const handleNewPlan = () => {
    setEditingPlan(null); // 새 플랜이므로 기존 데이터 없음
    setPage('plan-editor');
  };
  
  // 결과 보기 페이지로 이동
  const handleGoToResults = () => {
      setPage('results');
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold truncate">안녕하세요, {user?.user_metadata?.name || user?.email}님!</h1>

        <div className="flex space-x-2">
          {openNotice && (
            <Button onClick={openNotice} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
              공지사항
            </Button>
          )}
          <Button onClick={signOut} className="bg-gray-500 hover:bg-gray-600 flex-shrink-0">로그아웃</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div onClick={handleNewPlan} className="p-6 bg-blue-500 text-white rounded-lg shadow-md cursor-pointer hover:bg-blue-600 transition-colors">
          <h2 className="text-2xl font-bold">새 플랜 만들기</h2>
          <p>새로운 투자 시나리오를 시작합니다.</p>
        </div>
        <div onClick={handleGoToResults} className="p-6 bg-green-500 text-white rounded-lg shadow-md cursor-pointer hover:bg-green-600 transition-colors">
          <h2 className="text-2xl font-bold">결과 보기</h2>
          <p>저장된 플랜의 시뮬레이션 결과를 확인합니다.</p>
        </div>
        {/* 중복되는 결과 보기 항목 제거 */}
      </div>
    </div>
  );
};

// 6.4. 플랜 편집기 페이지 (멀티스텝 폼)
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
                setPage('results');
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

// 6.5. 결과 보기 페이지
const ResultsPage: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
    const { session } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [view, setView] = useState<'selection' | 'results'>('selection');

    // 플랜 목록 가져오기 (기본 정보만)
    useEffect(() => {
        const fetchPlans = async () => {
            if (!session) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const fetchedPlans = await api.getPlans(session.access_token);
                setPlans(fetchedPlans);
                
                // 기본적으로 첫 번째 플랜 선택
                if (fetchedPlans.length > 0) {
                    setSelectedPlanId(fetchedPlans[0].id || null);
                }
            } catch (err) {
                console.error('Failed to fetch plans:', err);
                setError('플랜 목록을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchPlans();
    }, [session]);
    
    // 플랜 선택 변경 시
    const handlePlanChange = (planId: string) => {
        const plan = plans.find(p => p.id === planId) || null;
        setSelectedPlanId(planId);
        setSelectedPlan(plan);
    };
    
    // 플랜을 선택하고 결과 화면으로 이동 - 백엔드에서 상세 정보 요청
    const handleViewResults = async () => {
        if (!selectedPlanId || !session) {
            alert('먼저 플랜을 선택해주세요.');
            return;
        }
        
        setLoading(true);
        
        try {
            // 백엔드에서 선택한 플랜의 상세 정보(시뮬레이션 결과 포함) 요청
            const planDetails = await api.getPlanDetails(selectedPlanId, session.access_token);
            setSelectedPlan(planDetails);
            setView('results');
        } catch (error) {
            console.error('플랜 상세 정보 로드 실패:', error);
            alert('선택한 플랜의 시뮬레이션 결과를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };
    
    // 선택된 플랜의 시뮬레이션 결과 표시
    const renderSimulationResults = () => {
        if (!selectedPlan?.simulation_results) {
            return (
                <div className="text-center py-8">
                    <p>선택한 플랜의 시뮬레이션 결과가 없습니다.</p>
                </div>
            );
        }
        
        const results = selectedPlan.simulation_results;
        const lastRound = results.history[results.history.length - 1];
        
        return (
            <div>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-bold text-gray-700 mb-2">플랜 정보</h3>
                        <p>플랜 타입: <span className="font-semibold">{selectedPlan.plan_type}</span></p>
                        <p>회사 회차: <span className="font-semibold">{selectedPlan.company_round}</span></p>
                        <p>총 시뮬레이션 회차: <span className="font-semibold">{selectedPlan.simulation_rounds}</span></p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="font-bold text-gray-700 mb-2">시뮬레이션 요약</h3>
                        <p>총 라운드: <span className="font-semibold">{results.history.length}</span></p>
                        <p>최종 투자자 수: <span className="font-semibold">{lastRound?.investor_count || 0}</span></p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="font-bold text-gray-700 mb-2">최종 수익 결과</h3>
                        <p>최종 누적 순이익: <span className="font-semibold text-lg text-purple-700">{lastRound?.cumulative_net_profit.toLocaleString() || 0} 원</span></p>
                    </div>
                </div>
                
                <div className="overflow-x-auto mb-4">
                    <h3 className="font-bold text-lg mb-3">상세 시뮬레이션 결과</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-3 py-2">회차</th>
                                <th scope="col" className="px-3 py-2">투자자 수</th>
                                <th scope="col" className="px-3 py-2">총 투자금</th>
                                <th scope="col" className="px-3 py-2">세후 수익</th>
                                <th scope="col" className="px-3 py-2">순이익</th>
                                <th scope="col" className="px-3 py-2">누적 순이익</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.history.map((round) => (
                                <tr key={round.company_round} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-3 py-2">{round.company_round}</td>
                                    <td className="px-3 py-2">{round.investor_count}</td>
                                    <td className="px-3 py-2">{round.total_payment.toLocaleString()}</td>
                                    <td className="px-3 py-2">{round.total_revenue_after_tax.toLocaleString()}</td>
                                    <td className="px-3 py-2">{round.net_profit_after_tax.toLocaleString()}</td>
                                    <td className="px-3 py-2 font-semibold">
                                        {round.cumulative_net_profit.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    // 플랜 선택 화면
    const renderPlanSelectionView = () => {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">플랜 선택</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {plans.map((plan) => (
                        <div 
                            key={plan.id} 
                            onClick={() => handlePlanChange(plan.id!)}
                            className={`p-4 border rounded-lg cursor-pointer ${
                                selectedPlanId === plan.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                        >
                            <h3 className="font-bold text-lg">{plan.plan_type} 플랜</h3>
                            <p>회사 회차: {plan.company_round}</p>
                            <p>시뮬레이션 회차: {plan.simulation_rounds}</p>
                            {plan.simulation_results && (
                                <div className="mt-2 text-sm text-green-700">
                                    <p>✓ 시뮬레이션 결과 있음</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-end">
                    <Button 
                        onClick={handleViewResults} 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!selectedPlanId}
                    >
                        결과 보기
                    </Button>
                </div>
            </div>
        );
    };
    
    // 결과 화면
    const renderResultsView = () => {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                        {selectedPlan?.plan_type} 플랜 ({selectedPlan?.company_round}회차) 시뮬레이션 결과
                    </h2>
                    <Button 
                        onClick={() => setView('selection')} 
                        className="bg-gray-500 hover:bg-gray-600"
                    >
                        ← 플랜 선택으로 돌아가기
                    </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                    {loading ? (
                        <div className="text-center py-8">
                            <p className="text-lg">결과 로딩 중...</p>
                        </div>
                    ) : (
                        renderSimulationResults()
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">시뮬레이션 결과</h1>
            
            {loading ? (
                <div className="text-center py-16">
                    <p className="text-lg">데이터 로딩 중...</p>
                </div>
            ) : error ? (
                <div className="bg-red-100 p-4 rounded-md text-red-700 mb-4">
                    <p>{error}</p>
                </div>
            ) : plans.length === 0 ? (
                <div className="bg-yellow-50 p-6 rounded-lg shadow-md mb-4">
                    <p>아직 생성된 플랜이 없습니다. 먼저 플랜을 생성해주세요.</p>
                </div>
            ) : (
                view === 'selection' ? renderPlanSelectionView() : renderResultsView()
            )}
            
            <Button onClick={() => setPage('main')} className="mt-4 bg-gray-200 text-black hover:bg-gray-300">
                메인으로 돌아가기
            </Button>
        </div>
    );
}


// --- 7. 메인 앱 컨트롤러 ---
// 앱의 전체적인 흐름(페이지 전환, 인증 상태에 따른 화면 표시)을 제어합니다.
const AppController: React.FC = () => {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('main');
  const [isWhitelisted, setWhitelisted] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isNoticeOpen, setNoticeOpen] = useState(false);

  // Show notice when user first logs in
  useEffect(() => {
    if (session && !loading) {
      setNoticeOpen(true);
    }
  }, [session, loading]);

  // 로딩 중일 때는 로딩 화면을 표시
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  // 로그인이 되어 있지 않은 경우
  if (!session) {
    if (!isWhitelisted) {
      return <WhitelistCheckPage onVerified={() => setWhitelisted(true)} />;
    }
    return <LoginPage />;
  }

  // 로그인이 되어 있는 경우
  const renderPage = () => {
    switch (page) {
      case 'main':
        return <MainPage 
          setPage={setPage} 
          setEditingPlan={setEditingPlan}
          openNotice={() => setNoticeOpen(true)}
        />;
      case 'plan-editor':
        return <PlanEditorPage setPage={setPage} editingPlan={editingPlan} />;
      case 'results':
        return <ResultsPage setPage={setPage} />;
      default:
        return <MainPage 
          setPage={setPage} 
          setEditingPlan={setEditingPlan}
          openNotice={() => setNoticeOpen(true)}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Modal isOpen={isNoticeOpen} onClose={() => setNoticeOpen(false)} title="공지사항">
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-md border-l-4 border-blue-500">
            <p className="text-gray-700">공지 1: 신규 시뮬레이션 기능이 추가되었습니다.</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md border-l-4 border-blue-500">
            <p className="text-gray-700">공지 2: 7월 30일 시스템 점검 예정입니다.</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md border-l-4 border-blue-500">
            <p className="text-gray-700">공지 3: 새로운 투자 전략 플랜이 출시되었습니다.</p>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button onClick={() => setNoticeOpen(false)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              확인
            </Button>
          </div>
        </div>
      </Modal>
      {renderPage()}
    </div>
  );
};


// --- 8. 최종 앱 렌더링 ---
// AuthProvider로 AppController를 감싸서 앱 전체에 인증 컨텍스트를 제공합니다.
function App() {
  return (
    <AuthProvider>
      <AppController />
    </AuthProvider>
  );
}

export default App;


