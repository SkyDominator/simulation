import React from "react";
import type { Plan, SimulationRunResponse } from "../types/types";
import { api } from "../services/api";

export const useSimulationActions = (
  session: { access_token: string } | null,
  refreshPlans: () => Promise<void>
) => {
  const [runningId, setRunningId] = React.useState<string>("");
  const [deletingId, setDeletingId] = React.useState<string>("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [targetPlan, setTargetPlan] = React.useState<Plan | null>(null);
  const [targetOrdinal, setTargetOrdinal] = React.useState<number | null>(null);
  const [memoModalOpen, setMemoModalOpen] = React.useState(false);
  const [memoTarget, setMemoTarget] = React.useState<Plan | null>(null);

  // Run simulation and navigate to results
  const handleViewResults = async (
    plan: Plan,
    setSimulationResult: (result: SimulationRunResponse | null) => void,
    navigateToResults: () => void
  ) => {
    if (!session) return;
    const simId = plan.simulation_id;

    try {
      setRunningId(simId);
      const data = await api.runSimulation(
        simId,
        session.access_token,
        plan.updated_at
      );
      setSimulationResult(data);
      navigateToResults();
    } catch (e: unknown) {
      console.error("Run simulation error:", e);
      const msg = (e as Error)?.message ?? "";
      if (msg.includes("409") || msg.includes("not up to date")) {
        alert(
          "업데이트가 아직 반영되지 않았습니다. 잠시 후 다시 시도해 주세요."
        );
      } else {
        alert("시뮬레이션 실행에 실패했습니다.");
      }
    } finally {
      setRunningId("");
    }
  };

  const openDeleteConfirm = (plan: Plan, ordinal?: number) => {
    setTargetPlan(plan);
    setTargetOrdinal(ordinal ?? null);
    setConfirmOpen(true);
  };

  const openMemo = (plan: Plan) => {
    setMemoTarget(plan);
    setMemoModalOpen(true);
  };

  const handleSaveMemo = async (
    text: string | null,
    setPlans: React.Dispatch<React.SetStateAction<Plan[]>>
  ) => {
    if (!session || !memoTarget) return;
    try {
      await api.updateSimulationMemo(
        session.access_token,
        memoTarget.simulation_id,
        text
      );
      // optimistic update local state
      setPlans((prev: Plan[]) =>
        prev.map((p: Plan) =>
          p.simulation_id === memoTarget.simulation_id
            ? { ...p, memo: text || null }
            : p
        )
      );
      setMemoTarget((prev: Plan | null) =>
        prev ? { ...prev, memo: text || null } : prev
      );
    } catch (e) {
      console.error("Memo save error:", e);
      alert("메모 저장에 실패했습니다.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!session || !targetPlan) return;
    try {
      setDeletingId(targetPlan.simulation_id);
      await api.deleteSimulation(
        targetPlan.simulation_id,
        session.access_token
      );
      setConfirmOpen(false);
      setTargetPlan(null);
      await refreshPlans();
    } catch (e) {
      console.error("Delete simulation error:", e);
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId("");
    }
  };

  return {
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
    handleViewResults,
    openDeleteConfirm,
    openMemo,
    handleSaveMemo,
    handleConfirmDelete,
  };
};
