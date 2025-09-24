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
import {
  ConfirmationModal,
  DefaultValueWarningModal,
  ValidationModal,
} from "./modals";
import StartingRoundValidationModal from "./modals/StartingRoundValidationModal";
import CurrentRoundValidationModal from "./modals/CurrentRoundValidationModal";
import {
  getSimulationRoundLimits,
  generateInvestments,
  getDefaultInvestmentAmount,
} from "./utils/investmentUtils";
import { validateNumericValue as validateSimulationRounds } from "./utils/validationUtils";
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
  "가입한 회차",
  "현재 회차",
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
  const getDefaultSimulationRounds = (planType: string) => {
    if (planType === "G") return 12;
    return ["A", "B", "C"].includes(planType) ? 15 : 18;
  };
  const basePlanType = editingPlan?.plan_id || "A";
  const defaultSimRounds = getDefaultSimulationRounds(basePlanType);
  const persistedPlan = getJSON<Plan | null>("ui.planEditor.plan", null);

  // Initialize plan based on scenario
  let initialPlan: Plan;

  if (persistedPlan) {
    // Returning to a locally cached plan
    initialPlan = persistedPlan;
  } else if (editingPlan) {
    // Editing an existing plan
    initialPlan = {
      simulation_id: editingPlan.simulation_id,
      plan_id: editingPlan.plan_id,
      starting_company_round: editingPlan.starting_company_round,
      current_company_round: editingPlan.current_company_round,
      simulation_rounds: editingPlan.simulation_rounds,
      investments: editingPlan.investments || [],
      sales_achievement_rates: editingPlan.sales_achievement_rates || {},
    };
  } else {
    // Creating a new plan; generate default investments
    const newInvestments = Array.from({ length: defaultSimRounds }, (_, i) => {
      const round = i + 1;
      // Default amount for this plan type and round
      const defaultAmount = getDefaultInvestmentAmount(basePlanType, round);
      // Return an investment with the default amount
      return { round, amount: defaultAmount };
    });

    initialPlan = {
      simulation_id: "",
      plan_id: basePlanType,
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: defaultSimRounds,
      investments: newInvestments,
      sales_achievement_rates: {},
    };
  }
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isDefaultValueWarningModalOpen, setDefaultValueWarningModalOpen] =
    useState(false);
  const [belowMinInvestments, setBelowMinInvestments] = useState<
    Array<{
      round: number;
      amount: number;
      minAmount: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidationModalOpen, setSimulationRoundsValidationModalOpen] =
    useState(false);
  const [validationData, setSimulationRoundsValidationData] =
    useState<ValidationData | null>(null);

  // Separate modal states for steps 2 and 3
  const [isStartingRoundModalOpen, setStartingRoundModalOpen] = useState(false);
  const [isCurrentRoundModalOpen, setCurrentRoundModalOpen] = useState(false);

  // Track mount status to avoid updates after unmount
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

  // Restore when returning to visible state
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
    // Parse amount as integer
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

  const handleSimulationRoundsValidation = (
    value: number,
    min: number,
    max: number,
    field: keyof Plan
  ) => {
    const simulationRoundsValidationResult = validateSimulationRounds(
      value,
      min,
      max,
      field
    );
    if (simulationRoundsValidationResult) {
      setSimulationRoundsValidationData(simulationRoundsValidationResult);
      setSimulationRoundsValidationModalOpen(true);
      return false;
    }
    return true;
  };

  const handleSimulationRoundsValidationConfirm = () => {
    if (!validationData) return;

    const { value, min, max, field } = validationData;
    const newValue = value < min ? min : max;

    setPlan((prev) => ({ ...prev, [field]: newValue }));
    setSimulationRoundsValidationModalOpen(false);
  };

  const handleDefaultValueWarningCancel = () => {
    setDefaultValueWarningModalOpen(false);
    setBelowMinInvestments([]);
  };

  const handleDefaultValueWarningContinue = () => {
    setDefaultValueWarningModalOpen(false);
    setBelowMinInvestments([]);
    setConfirmModalOpen(true);
  };

  const handleSaveClick = () => {
    // Check for investments below minimum values
    const belowMin = (plan.investments || [])
      .filter((inv) => {
        const minAmount = getDefaultInvestmentAmount(plan.plan_id, inv.round);
        return inv.amount < minAmount;
      })
      .map((inv) => ({
        round: inv.round,
        amount: inv.amount,
        minAmount: getDefaultInvestmentAmount(plan.plan_id, inv.round),
      }));

    if (belowMin.length > 0) {
      setBelowMinInvestments(belowMin);
      setDefaultValueWarningModalOpen(true);
    } else {
      setConfirmModalOpen(true);
    }
  };

  // Confirm starting round validation
  const handleStartingRoundConfirm = () => {
    const MIN_STARTING_ROUND = 1;
    const MAX_STARTING_ROUND = 100;

    // Determine correction based on current value
    let newValue: number;
    if (
      plan.starting_company_round < MIN_STARTING_ROUND ||
      plan.starting_company_round === 0
    ) {
      newValue = MIN_STARTING_ROUND;
    } else if (plan.starting_company_round > MAX_STARTING_ROUND) {
      newValue = MAX_STARTING_ROUND;
    } else {
      newValue = plan.starting_company_round; // No change needed
    }

    setPlan((prev) => ({ ...prev, starting_company_round: newValue }));
    setStartingRoundModalOpen(false);
  };

  // Confirm current round validation
  const handleCurrentRoundConfirm = () => {
    const MIN_CURRENT_ROUND = plan.starting_company_round;
    const MAX_CURRENT_ROUND = 100;

    // Determine correction based on current value
    let newValue: number;
    if (
      plan.current_company_round < MIN_CURRENT_ROUND ||
      plan.current_company_round === 0
    ) {
      newValue = MIN_CURRENT_ROUND;
    } else if (plan.current_company_round > MAX_CURRENT_ROUND) {
      newValue = MAX_CURRENT_ROUND;
    } else {
      newValue = plan.current_company_round; // No change needed
    }

    setPlan((prev) => ({ ...prev, current_company_round: newValue }));
    setCurrentRoundModalOpen(false);
  };

  const handleNext = () => {
    if (step === 2) {
      // Validate starting_company_round
      const MIN_STARTING_ROUND = 1;
      const MAX_STARTING_ROUND = 100;

      if (
        plan.starting_company_round < MIN_STARTING_ROUND ||
        plan.starting_company_round > MAX_STARTING_ROUND ||
        plan.starting_company_round === 0
      ) {
        setStartingRoundModalOpen(true);
        return;
      }
    } else if (step === 3) {
      // Validate current_company_round >= starting_company_round
      const MIN_CURRENT_ROUND = plan.starting_company_round;
      const MAX_CURRENT_ROUND = 100;

      if (
        plan.current_company_round < MIN_CURRENT_ROUND ||
        plan.current_company_round > MAX_CURRENT_ROUND ||
        plan.current_company_round === 0
      ) {
        setCurrentRoundModalOpen(true);
        return;
      }
    } else if (step === 4) {
      // validate simulation_rounds
      const { min, max } = getSimulationRoundLimits();

      if (
        !handleSimulationRoundsValidation(
          plan.simulation_rounds,
          min,
          max,
          "simulation_rounds"
        )
      ) {
        return;
      }

      // Update investments when going from step 4->5; preserve user values
      const newInvestments = Array.from(
        { length: plan.simulation_rounds },
        (_, i) => {
          const round = i + 1;
          // Look for existing investment for this round
          const existing = plan.investments?.find((inv) => inv.round === round);

          if (existing) {
            // Keep the user's existing value
            return existing;
          } else {
            // Create new investment with default value
            const defaultAmount = getDefaultInvestmentAmount(
              plan.plan_id,
              round
            );
            return { round, amount: defaultAmount };
          }
        }
      );

      setPlan((prevPlan) => ({ ...prevPlan, investments: newInvestments }));
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    // Close all modals when going back
    setConfirmModalOpen(false);
    setDefaultValueWarningModalOpen(false);
    setBelowMinInvestments([]);
    setSimulationRoundsValidationModalOpen(false);
    setStartingRoundModalOpen(false);
    setCurrentRoundModalOpen(false);

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
      void 0; // no-op
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

                // Calculate new investments based on the new plan type
                let newInvestments;
                if (userUnmodified) {
                  // If user hasn't modified simulation rounds, generate all new investments
                  newInvestments = Array.from(
                    { length: nextDefault },
                    (_, i) => {
                      const round = i + 1;
                      // Get default amount for the new plan type
                      const defaultAmount = getDefaultInvestmentAmount(
                        value,
                        round
                      );
                      return { round, amount: defaultAmount };
                    }
                  );
                } else {
                  // If rounds are modified, preserve rounds count but update amounts
                  newInvestments = Array.from(
                    { length: prev.simulation_rounds },
                    (_, i) => {
                      const round = i + 1;
                      // Get default amount for the new plan type
                      const defaultAmount = getDefaultInvestmentAmount(
                        value,
                        round
                      );

                      // Find existing investment to check if user modified it
                      const existing = prev.investments?.find(
                        (inv) => inv.round === round
                      );

                      // Keep existing investment if it exists and is not a default value from previous plan
                      if (existing) {
                        // Check if previous value was default
                        const prevDefaultAmount = getDefaultInvestmentAmount(
                          prev.plan_id,
                          round
                        );
                        const wasDefault =
                          existing.amount === prevDefaultAmount;

                        // If it was default, use the new default; otherwise keep user's value
                        return {
                          round,
                          amount: wasDefault ? defaultAmount : existing.amount,
                        };
                      }

                      return { round, amount: defaultAmount };
                    }
                  );
                }

                return {
                  ...prev,
                  plan_id: value,
                  simulation_rounds: userUnmodified
                    ? nextDefault
                    : prev.simulation_rounds,
                  investments: newInvestments,
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
            setDefaultValueWarningModalOpen(false);
            setBelowMinInvestments([]);
            setSimulationRoundsValidationModalOpen(false);
            setStartingRoundModalOpen(false);
            setCurrentRoundModalOpen(false);
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
        onClose={() => setSimulationRoundsValidationModalOpen(false)}
        onConfirm={handleSimulationRoundsValidationConfirm}
        validationData={validationData}
      />

      {/* Validation modals for steps 2 and 3 */}
      <StartingRoundValidationModal
        isOpen={isStartingRoundModalOpen}
        onClose={() => {
          setStartingRoundModalOpen(false);
        }}
        onConfirm={handleStartingRoundConfirm}
        value={plan.starting_company_round}
        min={1}
        max={100}
      />

      <CurrentRoundValidationModal
        isOpen={isCurrentRoundModalOpen}
        onClose={() => {
          setCurrentRoundModalOpen(false);
        }}
        onConfirm={handleCurrentRoundConfirm}
        value={plan.current_company_round}
        startingCompanyRound={plan.starting_company_round}
        max={100}
      />

      <DefaultValueWarningModal
        isOpen={isDefaultValueWarningModalOpen}
        onClose={handleDefaultValueWarningCancel}
        onContinue={handleDefaultValueWarningContinue}
        belowMinInvestments={belowMinInvestments}
      />

      {/* InvestmentValidationModal removed (auto-correction in inputs) */}
    </Container>
  );
};

export default PlanEditorPage;
