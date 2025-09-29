import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Checkbox,
  Box,
  LinearProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import type { Plan } from "../../types/types";

// Types for sorting
export type SortKey =
  | "plan_id"
  | "starting_company_round"
  | "simulation_rounds"
  | "created_at";

export interface SortSpec {
  key: SortKey;
  dir: "asc" | "desc";
}

interface SimulationTableProps {
  plans: Plan[];
  loading: boolean;
  sortedPlans: Plan[];
  sortOrders: SortSpec[];
  handleHeaderClick: (
    key: SortKey,
    e: React.MouseEvent<HTMLTableCellElement>
  ) => void;
  sortIndicator: (key: SortKey) => React.ReactNode;
  runningId: string;
  deletingId: string;
  selectedSimulations: string[];
  canSelectSimulation: (plan: Plan) => boolean;
  handleSimulationSelection: (simulationId: string) => void;
  openMemo: (plan: Plan) => void;
  openDeleteConfirm: (plan: Plan, ordinal?: number) => void;
  handleViewResults: (plan: Plan) => void;
  onEditPlan: (plan: Plan) => void;
}

const SimulationTable: React.FC<SimulationTableProps> = ({
  plans,
  loading,
  sortedPlans,
  handleHeaderClick,
  sortIndicator,
  runningId,
  deletingId,
  selectedSimulations,
  canSelectSimulation,
  handleSimulationSelection,
  openMemo,
  openDeleteConfirm,
  handleViewResults,
  onEditPlan,
}) => {
  if (loading) {
    return <LinearProgress sx={{ mb: 2 }} data-testid="simulation-loading" />;
  }

  if (plans.length === 0) {
    return (
      <Box py={4} textAlign="center" color="text.secondary">
        아직 생성된 플랜이 없습니다. '새 시뮬레이션' 버튼을 눌러 시작하세요.
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Tooltip
                title="종합 결과를 위해 시뮬레이션을 선택하세요. 각 플랜 타입당 하나의 시뮬레이션만 선택 가능합니다."
                arrow
              >
                <span>선택</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ width: 40 }}>번호</TableCell>
            <TableCell
              onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                handleHeaderClick("plan_id", e)
              }
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Tooltip
                title="Click to sort. Shift+Click for secondary sort"
                arrow
              >
                <Box display="inline-flex" alignItems="center">
                  플랜 타입 {sortIndicator("plan_id")}
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell
              onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                handleHeaderClick("starting_company_round", e)
              }
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Tooltip
                title="Click to sort. Shift+Click for secondary sort"
                arrow
              >
                <Box display="inline-flex" alignItems="center">
                  시작 회차 {sortIndicator("starting_company_round")}
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell
              onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                handleHeaderClick("simulation_rounds", e)
              }
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Tooltip
                title="Click to sort. Shift+Click for secondary sort"
                arrow
              >
                <Box display="inline-flex" alignItems="center">
                  총 회차 {sortIndicator("simulation_rounds")}
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell
              onClick={(e: React.MouseEvent<HTMLTableCellElement>) =>
                handleHeaderClick("created_at", e)
              }
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Tooltip
                title="Click to sort. Shift+Click for secondary sort"
                arrow
              >
                <Box display="inline-flex" alignItems="center">
                  생성일 {sortIndicator("created_at")}
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell>메모</TableCell>
            <TableCell align="right">액션</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPlans.map((plan: Plan, idx: number) => {
            const isRunning = runningId === plan.simulation_id;
            const isDeleting = deletingId === plan.simulation_id;
            const memoDisplay = plan.memo || "메모 없음";
            const isSelected = selectedSimulations.includes(plan.simulation_id);
            const canSelect = canSelectSimulation(plan);
            const truncated =
              memoDisplay.length > 20
                ? `${memoDisplay.slice(0, 20)}…`
                : memoDisplay;

            return (
              <TableRow key={plan.simulation_id} hover selected={isSelected}>
                <TableCell padding="checkbox">
                  <Tooltip
                    title={
                      !canSelect && !isSelected
                        ? "이미 동일한 플랜 타입의 시뮬레이션이 선택되었습니다"
                        : ""
                    }
                    arrow
                  >
                    <span>
                      <Checkbox
                        color="primary"
                        checked={isSelected}
                        onChange={() =>
                          handleSimulationSelection(plan.simulation_id)
                        }
                        disabled={!canSelect && !isSelected}
                      />
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{plan.plan_id} 플랜</TableCell>
                <TableCell>{plan.starting_company_round}</TableCell>
                <TableCell>{plan.simulation_rounds}</TableCell>
                <TableCell>
                  {plan.created_at &&
                    new Date(plan.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Tooltip
                    title={memoDisplay}
                    arrow
                    disableHoverListener={memoDisplay === "메모 없음"}
                  >
                    <Chip
                      icon={<NoteAltIcon />}
                      label={truncated}
                      size="small"
                      onClick={() => openMemo(plan)}
                      variant={plan.memo ? "filled" : "outlined"}
                      color={plan.memo ? "primary" : "default"}
                      sx={{ maxWidth: 200 }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="편집" arrow>
                      <span>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => onEditPlan(plan)}
                          data-testid="edit-simulation"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={isRunning ? "실행 중" : "결과 보기"} arrow>
                      <span>
                        <IconButton
                          color="success"
                          size="small"
                          onClick={() => handleViewResults(plan)}
                          disabled={isRunning}
                          data-testid="run-simulation-btn"
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={isDeleting ? "삭제 중" : "삭제"} arrow>
                      <span>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => openDeleteConfirm(plan, idx + 1)}
                          disabled={isDeleting}
                          data-testid="delete-simulation"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(SimulationTable);
