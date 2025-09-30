import React from "react";
import { Button } from "../components/Button";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import MemoModal from "../components/MemoModal";
import ContactModal from "../components/ContactModal";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";
import { type ApiServiceInterface } from "../services/ApiService";
import type { Plan, Page, SimulationRunResponse } from "../types/types";
import { Container, Paper, Typography, Stack, Divider } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
// import PolicyIcon from "@mui/icons-material/Gavel";

// Extracted components
import SimulationTable, {
  type SortSpec,
} from "../components/MainPage/SimulationTable";
import SummaryReport from "../components/MainPage/SummaryReport";

// Custom hooks
import {
  useSortState,
  useSelectedSimulations,
  useSummaryReportState,
  type SummaryReportData,
} from "../hooks/useMainPageState";
import { useSimulationActions } from "../hooks/useSimulationActions";
import {
  injectDerivedHistory,
  findMaxNegativeDeepIndex,
} from "../utils/simulation";

interface MainPageProps {
  setPage: (page: Page) => void;
  setEditingPlan: (plan: Plan | null) => void;
  // Opens global notice board modal
  openNotice?: () => void;
  setSimulationResult: (result: SimulationRunResponse | null) => void;
  // Dependency injection for testing
  apiService?: ApiServiceInterface;
}

const MainPage: React.FC<MainPageProps> = ({
  setPage,
  setEditingPlan,
  openNotice,
  setSimulationResult,
  apiService = api, // Default to legacy api object
}) => {
  const { user, session, signOut } = useAuth();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [signOutLoading, setSignOutLoading] = React.useState(false);
  const [contactModalOpen, setContactModalOpen] = React.useState(false);

  // Use custom hooks for state management
  const { sortOrders, handleHeaderClick } = useSortState();
  const { selectedSimulations, setSelectedSimulations } =
    useSelectedSimulations();
  const {
    showSummaryReport,
    setShowSummaryReport,
    summaryReportData,
    setSummaryReportData,
  } = useSummaryReportState();

  // Load simulations
  const refreshPlans = React.useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiService.getSimulations(session.access_token);
      setPlans(data);
    } catch (error) {
      console.error("Error refreshing plans:", error);
    }
  }, [session, apiService]);

  // Simulation actions
  const {
    runningId,
    deletingId,
    confirmOpen,
    targetPlan,
    targetOrdinal,
    memoModalOpen,
    memoTarget,
    setConfirmOpen,
    setTargetOrdinal,
    setMemoModalOpen,
    setMemoTarget,
    handleViewResults: viewResults,
    openDeleteConfirm,
    openMemo,
    handleSaveMemo: saveMemo,
    handleConfirmDelete,
  } = useSimulationActions(session, refreshPlans, apiService);

  // View results and navigate
  const handleViewResults = (plan: Plan) => {
    viewResults(
      plan,
      (result: SimulationRunResponse | null) => setSimulationResult(result),
      () => setPage("results")
    );
  };

  // Save memo and update plans
  const handleSaveMemo = (text: string | null) => {
    saveMemo(text, setPlans);
  };

  // Sort indicator for table headers
  const sortIndicator = (key: SortSpec["key"]) => {
    const idx = sortOrders.findIndex((s: SortSpec) => s.key === key);
    if (idx === -1) return null;
    const arrow = sortOrders[idx].dir === "asc" ? "▲" : "▼";
    return (
      <span className="ml-1 text-[10px] font-semibold text-gray-600">
        {idx + 1}
        {arrow}
      </span>
    );
  };

  // Sort plans based on sortOrders
  const sortedPlans = React.useMemo(() => {
    const copy = [...plans];
    copy.sort((a, b) => {
      for (const spec of sortOrders) {
        let av: number | string = "";
        let bv: number | string = "";
        switch (spec.key) {
          case "plan_id":
            av = a.plan_id || "";
            bv = b.plan_id || "";
            break;
          case "starting_company_round":
            av = a.starting_company_round;
            bv = b.starting_company_round;
            break;
          case "simulation_rounds":
            av = a.simulation_rounds;
            bv = b.simulation_rounds;
            break;
          case "created_at":
          default:
            av = a.created_at ? new Date(a.created_at).getTime() : 0;
            bv = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
        }
        if (av < bv) return spec.dir === "asc" ? -1 : 1;
        if (av > bv) return spec.dir === "asc" ? 1 : -1;
        // equal -> move to next spec
      }
      return 0;
    });
    return copy;
  }, [plans, sortOrders]);

  // 시뮬레이션 데이터 로드
  React.useEffect(() => {
    const loadPlans = async () => {
      if (!user || !session) return;

      setLoading(true);
      try {
        const data = await apiService.getSimulations(session.access_token);
        setPlans(data);
      } catch (error) {
        console.error("Error loading plans:", error);
        alert("플랜 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [user, session, apiService]);

  // (Policy button now visible to all; admin-gated logic moved to page component)

  const handleNewPlan = () => {
    // Clear any old PlanEditor draft/step before creating new
    try {
      localStorage.removeItem("ui.planEditor.step");
      localStorage.removeItem("ui.planEditor.plan");
    } catch {
      /* ignore */
    }
    setEditingPlan(null); // 새 플랜이므로 기존 데이터 없음
    setPage("plan-editor");
  };

  // Validate if a simulation can be selected (limit to one per plan type)
  const canSelectSimulation = (simulation: Plan): boolean => {
    // If this simulation is already selected, allow toggling it off
    if (selectedSimulations.includes(simulation.simulation_id)) {
      return true;
    }

    // Check if we already have a simulation with the same plan type
    const selectedPlanTypes = plans
      .filter((p) => selectedSimulations.includes(p.simulation_id))
      .map((p) => p.plan_id);

    return !selectedPlanTypes.includes(simulation.plan_id);
  };

  // Toggle selection for a simulation
  const handleSimulationSelection = (simulationId: string) => {
    setSelectedSimulations((prev) => {
      if (prev.includes(simulationId)) {
        // Remove if already selected
        return prev.filter((id) => id !== simulationId);
      } else {
        // Add if not already selected
        return [...prev, simulationId];
      }
    });
  };

  // Generate summary report data
  const generateSummaryReport = async () => {
    if (!session || selectedSimulations.length === 0) return;

    try {
      // Create a placeholder for our report data
      const reportData: Record<string, unknown> = {};
      let totalRequiredFunds = 0;

      // For each selected simulation
      for (const simId of selectedSimulations) {
        const plan = plans.find((p) => p.simulation_id === simId);
        if (!plan) continue;

        // Run the simulation to get the results
        const result = await api.runSimulation(
          simId,
          session.access_token,
          plan.updated_at
        );

        // Process history like ResultsPage
        const history = injectDerivedHistory(result);
        let maxNegativeDeepIndex = findMaxNegativeDeepIndex(history);
        if (maxNegativeDeepIndex === -1 && history.length > 0) {
          maxNegativeDeepIndex = history.length - 1;
        }

        // Extract needed data - store the full history up to maxNegativeDeepIndex
        const planData = {
          plan_id: plan.plan_id,
          starting_company_round: plan.starting_company_round,
          current_company_round: plan.current_company_round,
          simulation_rounds: plan.simulation_rounds,
          history: history.slice(0, maxNegativeDeepIndex + 1),
          requiredFunds:
            history[maxNegativeDeepIndex]?.cumulative_net_profit || 0,
        };

        // Add the required funds to total
        totalRequiredFunds += Number(planData.requiredFunds);

        reportData[plan.plan_id] = planData;
      }

      // Add total required funds
      reportData.totalRequiredFunds = totalRequiredFunds;

      setSummaryReportData(reportData as SummaryReportData);
      setShowSummaryReport(true);
    } catch (error) {
      console.error("Error generating summary report:", error);
      alert("종합 결과 생성에 실패했습니다.");
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPage("plan-editor");
  };

  return (
    <div data-testid="main-page">
      <Container
        maxWidth={false}
        disableGutters
        sx={{ py: 2.5, px: { xs: 1, sm: 1.5, md: 2 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={4}
        >
          <Stack direction="row" spacing={1}>
            {openNotice && (
              <Button onClick={openNotice} variant="contained" color="warning">
                공지사항
              </Button>
            )}
            <Button
              onClick={() => setContactModalOpen(true)}
              variant="contained"
              color="info"
              startIcon={<HelpOutlineIcon />}
            >
              문의하기
            </Button>
            <Button
              onClick={async () => {
                if (signOutLoading) return;
                try {
                  setSignOutLoading(true);
                  await signOut();
                } finally {
                  setSignOutLoading(false);
                }
              }}
              variant="outlined"
              color="inherit"
              disabled={signOutLoading}
              data-testid="logout-button"
            >
              <LogoutIcon sx={{ mr: 0.5 }} fontSize="small" />{" "}
              {signOutLoading ? "로그아웃 중..." : "로그아웃"}
            </Button>
            <Button
              onClick={() => setPage("admin-policy")}
              variant="outlined"
              color="secondary"
              // startIcon={<PolicyIcon />}
            >
              개인 정보 보호 정책
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={3} sx={{ p: 2.5, mb: 4 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            mb={2}
          >
            <Typography variant="h6" fontWeight={600}>
              내 시뮬레이션
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                onClick={generateSummaryReport}
                variant="contained"
                color="primary"
                disabled={selectedSimulations.length === 0}
                data-testid="summary-report"
              >
                종합 결과
              </Button>
              <Button
                onClick={handleNewPlan}
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                data-testid="create-simulation"
              >
                새 시뮬레이션
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          <SimulationTable
            plans={plans}
            loading={loading}
            sortedPlans={sortedPlans}
            sortOrders={sortOrders}
            handleHeaderClick={handleHeaderClick}
            sortIndicator={sortIndicator}
            runningId={runningId}
            deletingId={deletingId}
            selectedSimulations={selectedSimulations}
            canSelectSimulation={canSelectSimulation}
            handleSimulationSelection={handleSimulationSelection}
            openMemo={openMemo}
            openDeleteConfirm={openDeleteConfirm}
            handleViewResults={handleViewResults}
            onEditPlan={handleEditPlan}
          />

          <SummaryReport
            showSummaryReport={showSummaryReport}
            summaryReportData={summaryReportData}
            onClose={() => {
              setShowSummaryReport(false); // keep data; only update visibility flag
              try {
                localStorage.setItem("ui.main.showSummaryReport", "false");
              } catch {
                /* Ignore storage errors */
              }
            }}
          />
        </Paper>
      </Container>

      <DeleteConfirmModal
        isOpen={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetOrdinal(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deletingId === targetPlan?.simulation_id}
        ordinal={targetOrdinal}
        targetLabel={
          targetPlan
            ? `${targetPlan.plan_id} / ${targetPlan.simulation_id}`
            : null
        }
        message="선택한 시뮬레이션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      />
      <MemoModal
        isOpen={memoModalOpen}
        initialMemo={memoTarget?.memo || ""}
        onClose={() => {
          setMemoModalOpen(false);
          setMemoTarget(null);
        }}
        onSave={handleSaveMemo}
      />
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
};

export default MainPage;
