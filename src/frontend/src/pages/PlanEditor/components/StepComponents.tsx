import React from "react";
import { Input } from "../../../components/Input";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  TextField,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import {
  getSimulationRoundLimits,
  getDefaultInvestmentAmount,
} from "../utils/investmentUtils";
import type { Investment } from "../types/index";

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
  startingCompanyRound: number;
  planType: string;
  onInvestmentChange: (round: number, amount: string) => void;
  salesAchievementRates: Record<string, number>;
  onSalesRateChange?: (round: number, rate: number) => void;
}

// SalesRateInput: behaves like FormattedAmountInput but for percentage (50-100) with step controls
function SalesRateInput({
  value,
  onChange,
  onTabNext,
  inputRef,
}: {
  value: number;
  onChange: (val: number) => void;
  onTabNext?: () => boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const MIN = 50;
  const MAX = 100;
  const ref = React.useRef<HTMLInputElement>(null);
  const [rawDigits, setRawDigits] = React.useState<string>(value.toString());
  const [internalValue, setInternalValue] = React.useState<number>(value);

  React.useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      if (rawDigits !== value.toString()) setRawDigits(value.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

  const commitValue = (digits: string) => {
    const num = parseInt(digits, 10);
    if (isNaN(num)) return;
    const clamped = clamp(num);
    setInternalValue(clamped);
    setRawDigits(clamped.toString());
    onChange(clamped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, "");
    if (input === "") {
      setRawDigits("");
      return;
    }
    const next = input.slice(0, 3);
    setRawDigits(next);
  };

  const handleBlur = () => {
    if (rawDigits === "") {
      setInternalValue(100);
      setRawDigits("100");
      onChange(100);
      return;
    }
    commitValue(rawDigits);
  };

  const step = (dir: 1 | -1) => {
    const current =
      rawDigits === ""
        ? internalValue
        : parseInt(rawDigits, 10) || internalValue;
    const next = clamp(current + dir);
    setInternalValue(next);
    setRawDigits(next.toString());
    onChange(next);
    requestAnimationFrame(() => ref.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.shiftKey && onTabNext) {
      const handled = onTabNext();
      if (handled) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Enter") {
      commitValue(rawDigits);
    }
  };

  const numeric = rawDigits === "" ? undefined : parseInt(rawDigits, 10);
  const atMin = numeric !== undefined && numeric <= MIN;
  const atMax = numeric !== undefined && numeric >= MAX;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TextField
        size="small"
        inputRef={(el) => {
          ref.current = el;
          if (inputRef) inputRef(el);
        }}
        value={rawDigits}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="50 - 100"
        aria-label="매출 달성율"
        InputProps={{
          inputMode: "numeric",
          endAdornment: (
            <Typography variant="body2" component="span">
              %
            </Typography>
          ),
          sx: { width: 90, textAlign: "right" },
        }}
      />
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="감소">
          <span>
            <IconButton
              size="small"
              onClick={() => step(-1)}
              disabled={atMin}
              aria-label="감소"
            >
              <RemoveIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="증가">
          <span>
            <IconButton
              size="small"
              onClick={() => step(1)}
              disabled={atMax}
              aria-label="증가"
            >
              <AddIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

// Formatted number input with thousands separators, live min enforcement, and caret preservation
const FormattedAmountInput: React.FC<{
  value: number | undefined;
  minValue?: number;
  placeholder?: string;
  onValueChange: (val: number | null) => void;
  onTabNext?: () => boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}> = ({ value, minValue, placeholder, onValueChange, onTabNext, inputRef }) => {
  const [display, setDisplay] = React.useState<string>(
    value ? value.toLocaleString() : ""
  );
  const [belowMin, setBelowMin] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  const STEP = 10000;

  React.useEffect(() => {
    const formatted = value ? value.toLocaleString() : "";
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
    const digitsBeforeCursor = rawInput.slice(0, selection).replace(/,/g, "");
    const rawDigits = rawInput.replace(/,/g, "");
    if (rawDigits === "") {
      setDisplay("");
      onValueChange(null);
      return;
    }
    if (!/^\d+$/.test(rawDigits)) return;
    const numeric = parseInt(rawDigits, 10);
    setBelowMin(!!minValue && numeric < minValue);
    const formatted = numeric.toLocaleString();
    setDisplay(formatted);
    onValueChange(numeric);
    const caretDigits = Math.min(
      digitsBeforeCursor.length,
      numeric.toString().length
    );
    const newCaret = computeNewCaret(formatted, caretDigits);
    setCaret(newCaret);
  };

  const applyNumericValue = (numeric: number) => {
    if (numeric < 0) numeric = 0;
    setBelowMin(!!minValue && numeric < (minValue || 0));
    const formatted = numeric === 0 ? "0" : numeric.toLocaleString();
    setDisplay(formatted);
    onValueChange(numeric === 0 ? 0 : numeric);
    setCaret(formatted.length);
  };

  const handleStep = (direction: 1 | -1) => {
    const currentRawDigits = display.replace(/,/g, "");
    let current = currentRawDigits ? parseInt(currentRawDigits, 10) : 0;
    current += direction * STEP;
    if (current < 0) current = 0;
    applyNumericValue(current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.shiftKey && onTabNext) {
      const handled = onTabNext();
      if (handled) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleStep(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleStep(-1);
    }
  };

  const handleBlur = () => {
    const rawDigits = display.replace(/,/g, "");
    if (!rawDigits) {
      if (minValue !== undefined) {
        applyNumericValue(minValue);
      }
      return;
    }
    const numeric = parseInt(rawDigits, 10);
    if (
      minValue !== undefined &&
      (isNaN(numeric) || numeric < minValue || numeric <= 0)
    ) {
      applyNumericValue(minValue);
    }
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TextField
        size="small"
        inputRef={(el) => {
          ref.current = el;
          if (inputRef) inputRef(el);
        }}
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        error={belowMin}
        helperText={
          belowMin && minValue ? `최소 ${minValue.toLocaleString()} 이상` : ""
        }
        InputProps={{
          inputMode: "numeric",
          sx: { width: 140 },
        }}
      />
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="감소">
          <IconButton
            size="small"
            onClick={() => handleStep(-1)}
            aria-label="감소"
          >
            <RemoveIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="증가">
          <IconButton
            size="small"
            onClick={() => handleStep(1)}
            aria-label="증가"
          >
            <AddIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export const PlanTypeSelector: React.FC<PlanTypeSelectorProps> = ({
  planType,
  onChange,
}) => {
  const options = ["A", "B", "C", "D", "R", "E", "F", "K", "P"];
  return (
    <div>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        1. 플랜 선택
      </Typography>
      <FormControl fullWidth size="small">
        <InputLabel id="plan-type-label">플랜</InputLabel>
        <Select
          labelId="plan-type-label"
          id="plan-type-select"
          label="플랜"
          value={planType}
          onChange={(e) => onChange(e.target.value as string)}
        >
          {options.map((p) => (
            <MenuItem key={p} value={p}>
              {p} 플랜
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export const StartingCompanyRoundSelector: React.FC<
  CompanyRoundSelectorProps
> = ({ companyRound, onChange }) => {
  const MIN_ROUND = 1;
  const MAX_ROUND = 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure it's parsed as an integer
    const value = parseInt(e.target.value, 10) || 0;
    onChange(value);
  };

  // No onBlur handler - validation will be handled by modal

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">2. 가입한 회차 선택</h2>
      <p className="text-sm mb-2">
        최소: {MIN_ROUND}, 최대: {MAX_ROUND}
      </p>
      <Input
        type="number"
        value={companyRound === 0 ? "" : companyRound}
        placeholder={`회차를 입력하세요 (최소: ${MIN_ROUND}, 최대: ${MAX_ROUND})`}
        onChange={handleChange}
      />
    </div>
  );
};

export const CurrentCompanyRoundSelector: React.FC<
  CompanyRoundSelectorProps & { startingCompanyRound: number }
> = ({ companyRound, onChange, startingCompanyRound }) => {
  const MIN_ROUND = startingCompanyRound;
  const MAX_ROUND = 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure it's parsed as an integer
    const value = parseInt(e.target.value, 10) || 0;
    onChange(value);
  };

  // No onBlur handler - validation will be handled by modal

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">3. 현재 회차 선택</h2>
      <p className="text-sm mb-2">
        최소: {MIN_ROUND} (가입한 회차 이상이어야 합니다), 최대: {MAX_ROUND}
      </p>
      <Input
        type="number"
        value={companyRound === 0 ? "" : companyRound}
        placeholder={`회차를 입력하세요 (최소: ${MIN_ROUND}, 최대: ${MAX_ROUND})`}
        onChange={handleChange}
      />
    </div>
  );
};

export const SimulationRoundsSelector: React.FC<
  SimulationRoundsSelectorProps
> = ({ simulationRounds, planType, onChange }) => {
  const { min, max } = getSimulationRoundLimits(planType);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">4. 시뮬레이션 총 회차 수 선택</h2>
      <p className="text-sm mb-2">
        최소: {min}, 최대: {max}
      </p>
      <Input
        type="number"
        placeholder={`최소 ${min}, 최대 ${max} 회차`}
        value={isNaN(simulationRounds) ? "" : simulationRounds}
        onChange={(e) => {
          // Parse as integer or NaN if empty
          const value =
            e.target.value === "" ? NaN : parseInt(e.target.value, 10);
          onChange(value);
        }}
      />
    </div>
  );
};

export const InvestmentEditor: React.FC<InvestmentEditorProps> = ({
  investments,
  startingCompanyRound,
  planType,
  onInvestmentChange,
  salesAchievementRates,
  onSalesRateChange,
}) => (
  <div>
    <h2 className="text-xl font-bold mb-4">
      5. 회차별 매출액 및 매출 달성율 입력
    </h2>
    <div className="max-h-96 overflow-y-auto">
      <InvestmentTable
        investments={investments}
        startingCompanyRound={startingCompanyRound}
        planType={planType}
        onInvestmentChange={onInvestmentChange}
        salesAchievementRates={salesAchievementRates}
        onSalesRateChange={onSalesRateChange}
      />
    </div>
  </div>
);

// Separated table to allow hooks usage
const InvestmentTable: React.FC<InvestmentEditorProps> = ({
  investments,
  startingCompanyRound,
  planType,
  onInvestmentChange,
  salesAchievementRates,
  onSalesRateChange,
}) => {
  const amountRefs = React.useRef<HTMLInputElement[]>([]);
  const rateRefs = React.useRef<HTMLInputElement[]>([]);

  const focusAmount = (idx: number): boolean => {
    const next = amountRefs.current[idx + 1];
    if (next) {
      next.focus();
      return true;
    }
    return false;
  };
  const focusRate = (idx: number): boolean => {
    const next = rateRefs.current[idx + 1];
    if (next) {
      next.focus();
      return true;
    }
    return false;
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 384 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>회사 회차</TableCell>
            <TableCell>개인 회차</TableCell>
            <TableCell>매출액</TableCell>
            <TableCell>매출 달성율 (%)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {investments.length > 0 ? (
            investments.map((inv, index) => {
              const defaultAmount = getDefaultInvestmentAmount(
                planType,
                inv.round
              );
              const showRate = inv.round >= 4; // Hide sales rate for rounds 1-3
              return (
                <TableRow key={inv.round} hover>
                  <TableCell>{startingCompanyRound + index}</TableCell>
                  <TableCell>{inv.round}</TableCell>
                  <TableCell>
                    <FormattedAmountInput
                      value={inv.amount}
                      minValue={defaultAmount}
                      placeholder={
                        defaultAmount
                          ? `최소값: ${defaultAmount.toLocaleString()}`
                          : "매출액 입력 (0 불가)"
                      }
                      onValueChange={(val) => {
                        if (val === null) {
                          onInvestmentChange(inv.round, "");
                        } else {
                          onInvestmentChange(inv.round, val.toString());
                        }
                      }}
                      onTabNext={() => focusAmount(index)}
                      inputRef={(el: HTMLInputElement | null) => {
                        if (el) amountRefs.current[index] = el;
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {showRate ? (
                      <SalesRateInput
                        value={
                          salesAchievementRates[inv.round.toString()] ?? 100
                        }
                        onChange={(val) =>
                          onSalesRateChange && onSalesRateChange(inv.round, val)
                        }
                        onTabNext={() => focusRate(index)}
                        inputRef={(el: HTMLInputElement | null) => {
                          if (el) rateRefs.current[index] = el;
                        }}
                      />
                    ) : (
                      <span />
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} align="center">
                회차 정보가 없습니다. 이전 단계에서 총 회차를 설정해주세요.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
