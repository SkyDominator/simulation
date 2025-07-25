/*
  [개발자 노트]
  이 코드를 실행하기 전에, 터미널에서 아래 명령어를 실행하여
  Supabase 클라이언트 라이브러리를 반드시 설치해야 합니다.
  이 과정을 생략하면 "Could not resolve '@supabase/supabase-js'" 에러가 발생합니다.

  npm install @supabase/supabase-js
*/
import React, { useState, useEffect, createContext, useContext } from 'react';
import { createClient, type Session, type User } from '@supabase/supabase-js';

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

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
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
  // 사용자의 모든 플랜 가져오기
  getPlans: async (token: string): Promise<Plan[]> => {
    const response = await fetch(`${API_BASE_URL}/plans`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('플랜 목록을 불러오는 데 실패했습니다.');
    return response.json();
  },
  // 새 플랜 생성하기
  createPlan: async (plan: Plan, token: string): Promise<Plan> => {
    const response = await fetch(`${API_BASE_URL}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(plan),
    });
    if (!response.ok) throw new Error('플랜 생성에 실패했습니다.');
    return response.json();
  },
  // (추가) 기존 플랜 수정하기
  updatePlan: async (plan: Plan, token: string): Promise<Plan> => {
    // 실제 구현 시에는 백엔드에 PUT /api/plans/{plan.id} 와 같은 엔드포인트가 필요합니다.
    console.log('Updating plan:', plan, token);
    // 현재는 생성 API를 임시로 호출합니다.
    return api.createPlan(plan, token); 
  },
  // (추가) 플랜 삭제하기
  deletePlan: async (planId: string, token: string): Promise<void> => {
    // 실제 구현 시에는 백엔드에 DELETE /api/plans/{planId} 와 같은 엔드포인트가 필요합니다.
    console.log('Deleting plan:', planId, token);
    // 현재는 아무 작업도 하지 않습니다.
    return Promise.resolve();
  },
  // 시뮬레이션 결과 가져오기
  runSimulation: async (plan: Plan, token: string): Promise<any> => {
     const response = await fetch(`${API_BASE_URL}/run-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_data: plan }),
    });
    if (!response.ok) throw new Error('시뮬레이션 실행에 실패했습니다.');
    return response.json();
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
const Input: React.FC<{ value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; className?: string; }> = 
({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
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
    } catch (err) {
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
  
  // (구현) 기존 플랜 수정/삭제 기능은 이 곳에 추가합니다.
  const handleManagePlans = () => {
      alert("기존 플랜 수정/삭제 기능은 여기에 구현됩니다.");
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
        <div onClick={handleManagePlans} className="p-6 bg-green-500 text-white rounded-lg shadow-md cursor-pointer hover:bg-green-600 transition-colors">
          <h2 className="text-2xl font-bold">기존 플랜 수정/삭제</h2>
          <p>생성한 플랜을 관리합니다.</p>
        </div>
        <div onClick={() => setPage('results')} className="p-6 bg-purple-500 text-white rounded-lg shadow-md cursor-pointer hover:bg-purple-600 transition-colors col-span-1 md:col-span-2">
          <h2 className="text-2xl font-bold">결과 보기</h2>
          <p>모든 플랜의 시뮬레이션 결과를 확인합니다.</p>
        </div>
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

  // 총 회차가 변경될 때마다 investment 배열을 자동으로 생성/조정합니다.
  useEffect(() => {
    const newInvestments = Array.from({ length: plan.simulation_rounds }, (_, i) => {
        const existing = plan.investments.find(inv => inv.round === i + 1);
        return existing || { round: i + 1, amount: 0 }; // 최소 투자액은 0으로 초기화
    });
    setPlan(p => ({ ...p, investments: newInvestments }));
  }, [plan.simulation_rounds, editingPlan]); // editingPlan이 변경될 때도 investments를 초기화하기 위해 의존성 추가

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleInvestmentChange = (round: number, amount: string) => {
    const newInvestments = plan.investments.map(inv => 
      inv.round === round ? { ...inv, amount: parseInt(amount, 10) || 0 } : inv
    );
    setPlan({ ...plan, investments: newInvestments });
  };

  const handleSave = async () => {
    if (!session) return;
    // 투자액이 0인 경우 최소 투자액(여기서는 100으로 가정)으로 자동 입력
    const finalPlan = {
        ...plan,
        investments: plan.investments.map(inv => ({
            ...inv,
            amount: inv.amount === 0 ? 100 : inv.amount
        }))
    };
    
    try {
        if (editingPlan) {
            await api.updatePlan(finalPlan, session.access_token);
        } else {
            await api.createPlan(finalPlan, session.access_token);
        }
        setConfirmModalOpen(false);
        setPage('main');
    } catch (error) {
        console.error(error);
        alert("저장에 실패했습니다.");
    }
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
              value={plan.company_round} 
              onChange={e => setPlan({ ...plan, company_round: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
        );
      case 3: // 시뮬레이션 총 회차 수 선택
        const isABC = ['A', 'B', 'C'].includes(plan.plan_type);
        const min = isABC ? 15 : 18;
        const max = isABC ? 150 : 180;
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">3. 시뮬레이션 총 회차 수 선택</h2>
            <p className="text-sm mb-2">최소: {min}, 최대: {max}</p>
            <Input 
              type="number" 
              value={plan.simulation_rounds} 
              onChange={e => {
                let val = parseInt(e.target.value, 10) || min;
                if (val < min) val = min;
                if (val > max) val = max;
                setPlan({ ...plan, simulation_rounds: val });
              }}
            />
          </div>
        );
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
                  {plan.investments.map((inv, index) => (
                    <tr key={inv.round} className="bg-white border-b">
                      <td className="px-6 py-4">{plan.company_round + index}</td>
                      <td className="px-6 py-4">{inv.round}</td>
                      <td className="px-6 py-4">
                        <Input 
                          type="number" 
                          value={inv.amount} 
                          onChange={e => handleInvestmentChange(inv.round, e.target.value)} 
                        />
                      </td>
                    </tr>
                  ))}
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
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">최종 저장</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 6.5. 결과 보기 페이지
const ResultsPage: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
    // 이 페이지는 사용자의 모든 플랜을 가져와 각 플랜에 대한 시뮬레이션 결과를 보여줘야 합니다.
    // 현재는 UI 구조만 잡아놓았습니다.
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">시뮬레이션 결과</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p>여기에 각 플랜별 탭과 시뮬레이션 결과가 표시됩니다.</p>
            </div>
            <Button onClick={() => setPage('main')} className="mt-4 bg-gray-200 text-black hover:bg-gray-300">메인으로 돌아가기</Button>
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
