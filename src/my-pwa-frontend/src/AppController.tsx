import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import WhitelistCheckPage from './pages/WhitelistCheckPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import PlanEditorPage from './pages/PlanEditorPage';
import ResultsPage from './pages/ResultsPage';
import { type Plan, type Page } from './types/types';

const AppController: React.FC = () => {
  const [page, setPage] = useState<Page>('whitelist');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isNoticeOpen, setNoticeOpen] = useState(false);
  const { user } = useAuth();

  // 공지사항 열기
  const handleOpenNotice = () => {
    setNoticeOpen(true);
  };

  // 적절한 페이지 렌더링
  const renderPage = () => {
    // 로그인 여부에 따라 페이지 처리
    if (!user) {
      // 아직 로그인하지 않은 경우
      switch (page) {
        case 'whitelist':
          return <WhitelistCheckPage onVerified={() => setPage('login')} />;
        case 'login':
          return <LoginPage />;
        default:
          return <WhitelistCheckPage onVerified={() => setPage('login')} />;
      }
    } else {
      // 로그인한 경우
      switch (page) {
        case 'main':
          return (
            <MainPage 
              setPage={setPage} 
              setEditingPlan={setEditingPlan}
              openNotice={handleOpenNotice}
            />
          );
        case 'plan-editor':
          return <PlanEditorPage setPage={setPage} editingPlan={editingPlan} />;
        case 'results':
          return <ResultsPage setPage={setPage} />;
        default:
          return <MainPage setPage={setPage} setEditingPlan={setEditingPlan} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  );
};

export default AppController;
