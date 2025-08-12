import React from 'react';
import { Input } from '../../../components/Input';
import { getPlanLimits, getDefaultInvestmentAmount } from '../utils/investmentUtils';
import type { Investment } from '../types/index';

interface PlanTypeSelectorProps {
  planType: string;
  onChange: (value: string) => void;
}

interface CompanyRoundSelectorProps {
  companyRound: number;
  onChange: (value: number) => void;
}

interface SimulationRoundsSelectorProps {
  simulationRounds: number;
  planType: string;
  onChange: (value: number) => void;
}

interface InvestmentEditorProps {
  investments: Investment[];
  companyRound: number;
  planType: string;
  onInvestmentChange: (round: number, amount: string) => void;
}

export const PlanTypeSelector: React.FC<PlanTypeSelectorProps> = ({ planType, onChange }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">1. 플랜 선택</h2>
    <select
      value={planType}
      onChange={e => onChange(e.target.value)}
      className="w-full p-2 border rounded-md"
    >
      {['A', 'B', 'C', 'D', 'R', 'E', 'F', 'K', 'P'].map(p => <option key={p} value={p}>{p} 플랜</option>)}
    </select>
  </div>
);

export const CompanyRoundSelector: React.FC<CompanyRoundSelectorProps> = ({ companyRound, onChange }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">2. 회사 회차 선택</h2>
    <Input 
      type="number" 
      value={companyRound === 0 ? "" : companyRound}
      placeholder="회차를 입력하세요 (예: 1)" 
      onChange={e => {
        // Ensure it's parsed as an integer
        const value = parseInt(e.target.value, 10) || 0;
        onChange(value);
      }}
    />
  </div>
);

export const SimulationRoundsSelector: React.FC<SimulationRoundsSelectorProps> = ({ 
  simulationRounds, 
  planType, 
  onChange 
}) => {
  const { min, max } = getPlanLimits(planType);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">3. 시뮬레이션 총 회차 수 선택</h2>
      <p className="text-sm mb-2">최소: {min}, 최대: {max}</p>
      <Input 
        type="number"
        placeholder={`최소 ${min}, 최대 ${max} 회차`}
        value={isNaN(simulationRounds) ? "" : simulationRounds} 
        onChange={e => {
          // Parse as integer or NaN if empty
          const value = e.target.value === "" ? NaN : parseInt(e.target.value, 10);
          onChange(value);
        }}
      />
    </div>
  );
};

export const InvestmentEditor: React.FC<InvestmentEditorProps> = ({ 
  investments, 
  companyRound, 
  planType, 
  onInvestmentChange 
}) => (
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
          {investments.length > 0 ? (
            investments.map((inv, index) => {
              const defaultAmount = getDefaultInvestmentAmount(planType, inv.round);
              return (
                <tr key={inv.round} className="bg-white border-b">
                  <td className="px-6 py-4">{companyRound + index}</td>
                  <td className="px-6 py-4">{inv.round}</td>
                  <td className="px-6 py-4">
                    <Input 
                      type="number" 
                      value={inv.amount || ''}
                      placeholder={defaultAmount ? `최소값: ${defaultAmount.toLocaleString()}` : '투자액 입력 (0 불가)'}
                      onChange={e => {
                        // Ensure we're working with integers
                        const val = parseInt(e.target.value);
                        const amount = isNaN(val) ? '' : e.target.value;
                        // Pass the string to be parsed in the handler
                        onInvestmentChange(parseInt(inv.round.toString(), 10), amount);
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
