import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import WhitelistCheckPage from './pages/WhitelistCheckPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import PlanEditorPage from './pages/PlanEditor';
import ResultsPage from './pages/ResultsPage';
import { type Plan, type Page } from './types/types';
import type { SimulationRunResponse } from './types/types';

const AppController = () => {
  const [page, setPage] = useState<Page>('whitelist');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [, setNoticeOpen] = useState(false);
  const { user } = useAuth();
  const [simulationResult, setSimulationResult] = useState<SimulationRunResponse | null>(null);

  // 공지사항 열기
  const handleOpenNotice = () => {
    setNoticeOpen(true);
  };

  const whitelistOrLogin: Record<'whitelist' | 'login', React.ReactElement> = useMemo(() => ({
    whitelist: <WhitelistCheckPage onVerified={() => setPage('login')} />,
    login: <LoginPage />,
  }), [setPage]);

  const mainPages: Record<'main' | 'plan-editor' | 'results', React.ReactElement> = useMemo(() => ({
    main: (
      <MainPage
        setPage={setPage}
        setEditingPlan={setEditingPlan}
        openNotice={handleOpenNotice}
        setSimulationResult={setSimulationResult}
      />
    ),
    'plan-editor': <PlanEditorPage setPage={setPage} editingPlan={editingPlan} />,
    results: <ResultsPage setPage={setPage} result={simulationResult} />,
  }), [editingPlan, simulationResult, setPage]);

  const renderPage = useCallback(() => {
    if (!user) {
      return (page === 'whitelist' || page === 'login')
        ? whitelistOrLogin[page]
        : whitelistOrLogin.whitelist;
    }
    if (page === 'main' || page === 'plan-editor' || page === 'results') {
      return mainPages[page];
    }
    return mainPages.main;
  }, [user, page, whitelistOrLogin, mainPages]);

  useEffect(() => {
    if (user) setPage('main');
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  );
};

export default AppController;
