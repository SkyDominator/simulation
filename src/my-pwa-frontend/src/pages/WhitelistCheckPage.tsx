import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../services/api';

interface WhitelistCheckPageProps {
  onVerified: () => void;
}

const WhitelistCheckPage: React.FC<WhitelistCheckPageProps> = ({ onVerified }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('이름과 전화번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.checkWhitelist(name, phone);
      
      if (result.is_whitelisted) {
        onVerified();
      } else {
        setError(result.detail || '명단에 없는 사용자입니다. 관리자에게 문의해주세요.');
      }
    } catch (error) {
      console.error('Whitelist check error:', error);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">투자자 인증</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호 (010-1234-5678)" />
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? '확인 중...' : '인증하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WhitelistCheckPage;
