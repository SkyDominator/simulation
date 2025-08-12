import { type Plan, type SimulationResults, type WhitelistCheckResponse } from '../types/types';

const API_BASE_URL = 'http://127.0.0.1:8000/api'; // 로컬 FastAPI 서버 주소

export const api = {
  checkWhitelist: async (name: string, phone_number: string): Promise<WhitelistCheckResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone_number }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Whitelist check error:', error);
      return { success: false, message: error, is_whitelisted: false };
    }
  },
  
  getPlans: async (token: string): Promise<Plan[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get plans error:', error);
      return [];
    }
  },
  
  getPlanDetails: async (planId: string, token: string): Promise<Plan> => {
    try {
      const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get plan details error:', error);
      throw error;
    }
  },
  
  runCustomSimulation: async (
    plan_type: string,
    max_rounds: number,
    scheduled_payment: Record<string, number>,
    token: string,
    company_round: number = 1
  ): Promise<SimulationResults & { success: boolean, message: string }> => {
    const response = await fetch(`${API_BASE_URL}/request-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_type,
        max_rounds,
        scheduled_payment,
        company_round,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 백엔드에서 반환된 success 및 message 필드 확인
    if (!data.success) {
      throw new Error(data.message || '시뮬레이션 실행에 실패했습니다.');
    }
    
    return data;
  }
};
