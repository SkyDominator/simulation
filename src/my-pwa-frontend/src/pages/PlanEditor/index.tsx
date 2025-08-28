import React, { useState, useRef, useEffect } from "react";
import { Button } from "../../components/Button";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import type { Plan, Page } from "../../types/types";
import type { ValidationData } from "./types/index";
import { getJSON, setJSON } from "../../utils/persist";

interface PlanEditorPageProps {
  setPage: (page: Page) => void;
  editingPlan: Plan | null;
}
import {
  PlanTypeSelector,
  StartingCompanyRoundSelector,
  CurrentCompanyRoundSelector,
  SimulationRoundsSelector,
  InvestmentEditor,
} from "./components";
import { ConfirmationModal, ValidationModal } from "./modals";
import { getPlanLimits, generateInvestments } from "./utils/investmentUtils";
import { validateNumericValue } from "./utils/validationUtils";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

const steps = [
  "플랜 타입",
  "가입한 회사 회차",
  "현재 회사 회차",
  "시뮬레이션 총 회차",
  "회차 매출액 입력",
];

const PlanEditorPage: React.FC<PlanEditorPageProps> = ({
  setPage,
  editingPlan,
}) => {
  const { session } = useAuth();
  const [step, setStep] = useState<number>(() =>
    getJSON<number>("ui.planEditor.step", 1)
  );
  const getDefaultSimulationRounds = (planType: string) =>
    ["A", "B", "C"].includes(planType) ? 15 : 18;
  const basePlanType = editingPlan?.plan_id || "A";
  const defaultSimRounds = getDefaultSimulationRounds(basePlanType);
  const persistedPlan = getJSON<Plan | null>("ui.planEditor.plan", null);
  const initialPlan: Plan = persistedPlan || {
    simulation_id: editingPlan?.simulation_id || "",
    plan_id: basePlanType,
    starting_company_round: editingPlan?.starting_company_round || 1,
    current_company_round: editingPlan?.current_company_round || 1,
    simulation_rounds: editingPlan?.simulation_rounds ?? defaultSimRounds,
    investments:
      editingPlan?.investments ||
      generateInvestments(
        editingPlan?.simulation_rounds ?? defaultSimRounds,
        basePlanType,
        editingPlan?.investments || []
      ),
    sales_achievement_rates: editingPlan?.sales_achievement_rates || {},
  };
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(
    null
  );

  // (Investment validation modal removed)

  // Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Keep draft persisted for later return
    };
  }, []);

  // Persist step and plan on changes
  useEffect(() => {
    setJSON("ui.planEditor.step", step);
  }, [step]);
  useEffect(() => {
    setJSON("ui.planEditor.plan", plan);
  }, [plan]);

  // Attempt restore when returning to visible state
  useEffect(() => {
    const restore = () => {
      const s = getJSON<number>("ui.planEditor.step", step);
      if (s !== step) setStep(s);
      const p = getJSON<Plan | null>("ui.planEditor.plan", plan);
      const toJSONLen = (v: unknown) => {
        try {
          return JSON.stringify(v)?.length ?? 0;
        } catch {
          return 0;
        }
      };
      if (toJSONLen(p) !== toJSONLen(plan) && p) setPlan(p);
    };
    document.addEventListener("visibilitychange", restore);
    window.addEventListener("focus", restore);
    return () => {
      document.removeEventListener("visibilitychange", restore);
      window.removeEventListener("focus", restore);
    };
  }, [step, plan]);

  // Handlers
  const handleInvestmentChange = (round: number, amount: string) => {
    // Ensure amount is parsed as an integer
    const parsedAmount = amount === "" ? 0 : parseInt(amount, 10);
    const newInvestments = (plan.investments || []).map((inv) =>
      inv.round === round ? { ...inv, amount: parsedAmount } : inv
    );
    setPlan({ ...plan, investments: newInvestments });
  };

  const handleSalesRateChange = (round: number, rate: number) => {
    setPlan((prev) => ({
      ...prev,
      sales_achievement_rates: {
        ...(prev.sales_achievement_rates || {}),
        [round.toString()]: rate,
      },
    }));
  };

  const handleValidation = (
    value: number,
    min: number,
    max: number,
    field: keyof Plan
  ) => {
    const validationResult = validateNumericValue(value, min, max, field);
    if (validationResult) {
      setValidationData(validationResult);
      setValidationModalOpen(true);
      return false;
    }
    return true;
  };

  const handleValidationConfirm = () => {
    if (!validationData) return;

    const { value, min, max, field } = validationData;
    const newValue = value < min ? min : max;

    setPlan((prev) => ({ ...prev, [field]: newValue }));
    setValidationModalOpen(false);
  };

  const handleSaveClick = () => {
    // Inputs now auto-correct on blur; just open confirmation
    setConfirmModalOpen(true);
  };

  const handleNext = () => {
    if (step === 2) {
      // Validate starting_company_round
      const MIN_STARTING_ROUND = 1;
      const MAX_STARTING_ROUND = 100;

      if (
        !handleValidation(
          plan.starting_company_round,
          MIN_STARTING_ROUND,
          MAX_STARTING_ROUND,
          "starting_company_round"
        )
      ) {
        return;
      }
    } else if (step === 3) {
      // Validate current_company_round is >= starting_company_round
      const MIN_CURRENT_ROUND = plan.starting_company_round;
      const MAX_CURRENT_ROUND = 100;

      if (
        !handleValidation(
          plan.current_company_round,
          MIN_CURRENT_ROUND,
          MAX_CURRENT_ROUND,
          "current_company_round"
        )
      ) {
        return;
      }
    } else if (step === 4) {
      const { min, max } = getPlanLimits(plan.plan_id);

      if (
        !handleValidation(plan.simulation_rounds, min, max, "simulation_rounds")
      ) {
        return;
      }

      // Force update investments when going from step 4 to 5
      const newInvestments = generateInvestments(
        plan.simulation_rounds,
        plan.plan_id,
        plan.investments
      );
      setPlan((prevPlan) => ({ ...prevPlan, investments: newInvestments }));
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    // Close all modals when going back
    setConfirmModalOpen(false);
    // removed investment validation modal state
    setValidationModalOpen(false);

    // Go back one step
    setStep((s) => s - 1);
  };

  const handleSave = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const scheduled_payment: Record<string, number> = {};
      const sales_achievement_rates: Record<string, number> = {
        ...(plan.sales_achievement_rates || {}),
      };
      (plan.investments || []).forEach((inv) => {
        scheduled_payment[inv.round.toString()] = inv.amount;
        if (!(inv.round.toString() in sales_achievement_rates)) {
          sales_achievement_rates[inv.round.toString()] = 100;
        }
      });

      if (plan.simulation_id) {
        // Update existing simulation
        await api.updateSimulation(
          session.access_token,
          plan.simulation_id,
          plan.plan_id,
          plan.starting_company_round,
          plan.current_company_round,
          plan.simulation_rounds,
          scheduled_payment,
          sales_achievement_rates
        );
      } else {
        // Create new simulation
        const createResponse = await api.createSimulation(
          session.access_token,
          plan.plan_id,
          plan.starting_company_round,
          plan.current_company_round,
          plan.simulation_rounds,
          scheduled_payment,
          sales_achievement_rates
        );
        if (createResponse?.simulation_id) {
          setPlan((prev) => ({
            ...prev,
            simulation_id: createResponse.simulation_id,
          }));
        } else {
          alert("시뮬레이션 ID를 찾을 수 없습니다.");
          return;
        }
      }

      if (isMountedRef.current) {
        setConfirmModalOpen(false);
        setIsLoading(false);
        alert(
          plan.simulation_id
            ? "시뮬레이션이 업데이트되었습니다."
            : "시뮬레이션이 생성되었습니다."
        );
        // Clear persisted draft after successful save
        setJSON("ui.planEditor.step", 1);
        setJSON("ui.planEditor.plan", null);
        setPage("main");
      }
    } catch (error) {
      console.error("Save or simulation error:", error);
      if (isMountedRef.current) {
        alert("시뮬레이션 요청에 실패했습니다.");
      }
    } finally {
      // do nothing
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <PlanTypeSelector
            planType={plan.plan_id}
            onChange={(value) => {
              setPlan((prev) => {
                const prevDefault = getDefaultSimulationRounds(prev.plan_id);
                const nextDefault = getDefaultSimulationRounds(value);
                const userUnmodified = prev.simulation_rounds === prevDefault;
                return {
                  ...prev,
                  plan_id: value,
                  simulation_rounds: userUnmodified
                    ? nextDefault
                    : prev.simulation_rounds,
                  investments: userUnmodified
                    ? generateInvestments(nextDefault, value, prev.investments)
                    : prev.investments,
                };
              });
            }}
          />
        );
      case 2:
        return (
          <StartingCompanyRoundSelector
            companyRound={plan.starting_company_round}
            onChange={(value) =>
              setPlan({ ...plan, starting_company_round: value })
            }
          />
        );
      case 3:
        return (
          <CurrentCompanyRoundSelector
            companyRound={plan.current_company_round}
            startingCompanyRound={plan.starting_company_round}
            onChange={(value) =>
              setPlan({ ...plan, current_company_round: value })
            }
          />
        );
      case 4:
        return (
          <SimulationRoundsSelector
            simulationRounds={plan.simulation_rounds}
            planType={plan.plan_id}
            onChange={(value) => setPlan({ ...plan, simulation_rounds: value })}
          />
        );
      case 5:
        return (
          <InvestmentEditor
            investments={plan.investments || []}
            startingCompanyRound={plan.starting_company_round}
            planType={plan.plan_id}
            onInvestmentChange={handleInvestmentChange}
            salesAchievementRates={plan.sales_achievement_rates || {}}
            onSalesRateChange={handleSalesRateChange}
          />
        );
      default:
        return null;
    }
  };

  // No useEffect needed; investments are initialized above and refreshed on step transitions

  // (Investment validation modal removed)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {editingPlan ? "플랜 수정하기" : "새 플랜 만들기"}
      </Typography>
      <Paper elevation={3} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
        <Stepper activeStep={step - 1} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box>{renderStep()}</Box>
        <Divider sx={{ my: 4 }} />
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          {step > 1 ? (
            <Button
              onClick={handleBack}
              className="bg-gray-500 hover:bg-gray-600"
            >
              뒤로 가기
            </Button>
          ) : (
            <span />
          )}
          <Stack direction="row" spacing={2}>
            {step < 5 && (
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                다음 단계
              </Button>
            )}
            {step === 5 && (
              <Button
                onClick={handleSaveClick}
                className="bg-green-600 hover:bg-green-700"
              >
                저장
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
      <Box sx={{ mt: 3 }}>
        <Button
          onClick={() => {
            setConfirmModalOpen(false);
            setValidationModalOpen(false);
            // Clear any persisted draft and step so next open is fresh
            try {
              localStorage.removeItem("ui.planEditor.step");
            } catch {
              /* ignore */
            }
            try {
              localStorage.removeItem("ui.planEditor.plan");
            } catch {
              /* ignore */
            }
            try {
              // Also clear any persisted editing context
              localStorage.removeItem("ui.editingPlan");
            } catch {
              /* ignore */
            }
            // Reset local state (defensive) before leaving
            setStep(1);
            const nextDefault = getDefaultSimulationRounds("A");
            setPlan({
              simulation_id: "",
              plan_id: "A",
              starting_company_round: 1,
              current_company_round: 1,
              simulation_rounds: nextDefault,
              investments: generateInvestments(nextDefault, "A", []),
              sales_achievement_rates: {},
            });
            // Navigate to main
            setPage("main");
          }}
          className="bg-gray-200 text-black hover:bg-gray-300"
        >
          메인으로 돌아가기
        </Button>
      </Box>

      {/* Modals */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleSave}
        plan={plan}
        isLoading={isLoading}
      />

      <ValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        onConfirm={handleValidationConfirm}
        validationData={validationData}
      />

      {/* InvestmentValidationModal removed (auto-correction in inputs) */}
    </Container>
  );
};

export default PlanEditorPage;
