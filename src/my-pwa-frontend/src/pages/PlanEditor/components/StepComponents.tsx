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

// Formatted number input with thousands separators, live min enforcement, and caret preservation
const FormattedAmountInput: React.FC<{
  value: number | undefined;
  minValue?: number;
  placeholder?: string;
  onValueChange: (val: number | null) => void;
}> = ({ value, minValue, placeholder, onValueChange }) => {
  const [display, setDisplay] = React.useState<string>(value ? value.toLocaleString() : '');
  const [belowMin, setBelowMin] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);

  // Sync external value changes
  React.useEffect(() => {
    const formatted = value ? value.toLocaleString() : '';
    if (formatted !== display) setDisplay(formatted);
  }, [value, display]);

  const setCaret = (pos: number) => {
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.setSelectionRange(pos, pos);
      }
    });
  };

  const computeNewCaret = (formatted: string, digitsBefore: number): number => {
  // If no digits should appear before caret, caret stays at start.
  if (digitsBefore === 0) return 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count === digitsBefore) return i + 1;
    }
    return formatted.length;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const rawInput = inputEl.value;
    const selection = inputEl.selectionStart ?? rawInput.length;
    const digitsBeforeCursor = rawInput.slice(0, selection).replace(/,/g, '');
    const rawDigits = rawInput.replace(/,/g, '');

    if (rawDigits === '') {
      setDisplay('');
      onValueChange(null);
      return;
    }
    if (!/^\d+$/.test(rawDigits)) {
      // Ignore invalid characters (don't update state)
      return;
    }

  const numeric = parseInt(rawDigits, 10);
  setBelowMin(!!minValue && numeric < minValue);

    const formatted = numeric.toLocaleString();
    setDisplay(formatted);
    onValueChange(numeric);

    const caretDigits = Math.min(digitsBeforeCursor.length, numeric.toString().length);
    const newCaret = computeNewCaret(formatted, caretDigits);
    setCaret(newCaret);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      title={belowMin && minValue ? `최소 권장 투자액: ${minValue.toLocaleString()} 이상 입력하세요.` : ''}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${belowMin ? 'border-red-500 focus:ring-red-400' : 'border-gray-300'}`}
      data-below-min={belowMin || undefined}
    />
  );
};

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
                    <FormattedAmountInput
                      value={inv.amount}
                      minValue={defaultAmount}
                      placeholder={defaultAmount ? `최소값: ${defaultAmount.toLocaleString()}` : '투자액 입력 (0 불가)'}
                      onValueChange={(val) => {
                        if (val === null) {
                          onInvestmentChange(inv.round, '');
                        } else {
                          onInvestmentChange(inv.round, val.toString());
                        }
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
