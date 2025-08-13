import { type Plan, type WhitelistCheckResponse, type SimulationCreateResponse, type SimulationRunResponse } from '../types/types';

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
  return { success: false, message: String(error), is_whitelisted: false };
    }
  },
  
  deleteSimulation: async (
    simulation_id: string,
    token: string
  ): Promise<{ simulation_id: string; message: string; success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/simulations/${simulation_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.message || '삭제에 실패했습니다.');
    }
    return data;
  },
  
  runSimulation: async (
    simulation_id: string,
    token: string
  ): Promise<SimulationRunResponse> => {
    const response = await fetch(`${API_BASE_URL}/simulation/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ simulation_id }),
    });

    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data: SimulationRunResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || '시뮬레이션 실행에 실패했습니다.');
    }
    return data;
  },
  
  getSimulations: async (token: string): Promise<Plan[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/simulations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
          data.forEach((item: { [key: string]: unknown }) => {
              if (item && typeof item === 'object' && 'id' in item) {
                  item.simulation_id = item.id;
                  delete item.id;
              }
          });
      }
      return data;

    } catch (error) {
      console.error('Get simulations error:', error);
      return [];
    }
  },

  getSimulationDetails: async (simulationId: string, token: string): Promise<Plan> => {
    try {
      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}`, {
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
  
  createSimulation: async (
    plan_id: string,
    max_rounds: number,
    scheduled_payment: Record<string, number>,
    token: string,
    company_round: number = 1
  ): Promise<SimulationCreateResponse> => {
    const response = await fetch(`${API_BASE_URL}/simulation/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_id,
        max_rounds,
        company_round,
        scheduled_payment,
      }),
    });
    if (!response.ok) {
      // Try to surface backend error message if available
      try {
        const err = await response.json();
        throw new Error(err?.detail || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status}`);
      }
    }

  const data: SimulationCreateResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || '시뮬레이션 생성 요청에 실패했습니다.');
    }
    return data;
  }
};
