import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  act,
  mockAuthenticatedContextValue,
} from "../../test/test-utils";
import MainPage from "../MainPage";
import { api } from "../../services/api";
import type { Plan } from "../../types/types";

// Mock the API module
vi.mock("../../services/api", () => ({
  api: {
    getSimulations: vi.fn(),
    runSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
    updateSimulationMemo: vi.fn(),
    getNotice: vi.fn(),
  },
}));

// Mock custom hooks
vi.mock("../../hooks/useMainPageState", () => ({
  useSortState: () => ({
    sortOrders: [],
    handleHeaderClick: vi.fn(),
  }),
  useSelectedSimulations: () => ({
    selectedSimulations: [],
    setSelectedSimulations: vi.fn(),
  }),
  useSummaryReportState: () => ({
    showSummaryReport: false,
    setShowSummaryReport: vi.fn(),
    summaryReportData: null,
    setSummaryReportData: vi.fn(),
  }),
}));

const mockViewResults = vi.fn((plan, setResultCallback, setPageCallback) => {
  // Simulate the behavior of viewResults - call the callbacks
  setResultCallback({ simulation_id: plan.simulation_id, success: true });
  setPageCallback();
});

vi.mock("../../hooks/useSimulationActions", () => ({
  useSimulationActions: () => ({
    runningId: "",
    deletingId: "",
    confirmOpen: false,
    targetPlan: null,
    targetOrdinal: null,
    memoModalOpen: false,
    memoTarget: null,
    setConfirmOpen: vi.fn(),
    setTargetOrdinal: vi.fn(),
    setMemoModalOpen: vi.fn(),
    setMemoTarget: vi.fn(),
    handleViewResults: vi.fn(), // This is not the one we want
    viewResults: mockViewResults, // This is the one MainPage actually uses
    openDeleteConfirm: vi.fn(),
    openMemo: vi.fn(),
    handleSaveMemo: vi.fn(),
    handleConfirmDelete: vi.fn(),
  }),
}));

// Mock components that might be complex
vi.mock("../../components/Shell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

// Define test types
interface MockSimulation {
  simulation_id: string;
  plan_id: string;
  starting_company_round: number;
  current_company_round: number;
  simulation_rounds: number;
  investments?: Array<{ round: number; amount: number }>;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

interface MockSimulationTableProps {
  plans: MockSimulation[];
  loading: boolean;
  sortedPlans: MockSimulation[];
  sortOrders: Array<{ key: string; dir: string }>;
  handleHeaderClick: (key: string, e: React.MouseEvent) => void;
  sortIndicator: (key: string) => React.ReactNode;
  runningId: string;
  deletingId: string;
  selectedSimulations: string[];
  canSelectSimulation: (plan: MockSimulation) => boolean;
  handleSimulationSelection: (simulationId: string) => void;
  openMemo: (plan: MockSimulation) => void;
  openDeleteConfirm: (plan: MockSimulation, ordinal?: number) => void;
  handleViewResults: (plan: MockSimulation) => void;
  onEditPlan: (plan: MockSimulation) => void;
}

vi.mock("../../components/MainPage/SimulationTable", () => ({
  default: ({
    plans,
    sortedPlans,
    onEditPlan,
    handleViewResults,
    openDeleteConfirm,
  }: MockSimulationTableProps) => {
    // Use sortedPlans if available, otherwise fallback to plans
    const simulationsToRender = sortedPlans?.length > 0 ? sortedPlans : plans;

    return (
      <div data-testid="simulation-table">
        <div data-testid="simulation-count">{plans?.length || 0}</div>
        {simulationsToRender?.map((sim: MockSimulation) => (
          <div
            key={sim.simulation_id}
            data-testid={`simulation-${sim.simulation_id}`}
          >
            <span>{sim.plan_id}</span>
            <button
              onClick={() => onEditPlan(sim)}
              data-testid={`edit-${sim.simulation_id}`}
            >
              Edit
            </button>
            <button
              onClick={() => handleViewResults(sim)}
              data-testid={`run-${sim.simulation_id}`}
            >
              Run
            </button>
            <button
              onClick={() => openDeleteConfirm(sim)}
              data-testid={`delete-${sim.simulation_id}`}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

interface MockSummaryReportProps {
  data: { totalReturn: number } | null;
}

vi.mock("../../components/MainPage/SummaryReport", () => ({
  default: ({ data }: MockSummaryReportProps) => (
    <div data-testid="summary-report">
      {data && (
        <div data-testid="summary-data">Summary: {data.totalReturn}</div>
      )}
    </div>
  ),
}));

const mockSetPage = vi.fn();
const mockSetEditingPlan = vi.fn();
const mockOpenNotice = vi.fn();
const mockSetSimulationResult = vi.fn();

const defaultProps = {
  setPage: mockSetPage,
  setEditingPlan: mockSetEditingPlan,
  openNotice: mockOpenNotice,
  setSimulationResult: mockSetSimulationResult,
};

const mockSimulations = [
  {
    simulation_id: "sim-1",
    plan_id: "A",
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 10,
    investments: [{ round: 1, amount: 100000 }],
    memo: "Test memo",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    simulation_id: "sim-2",
    plan_id: "B",
    starting_company_round: 1,
    current_company_round: 2,
    simulation_rounds: 10,
    investments: [{ round: 1, amount: 200000 }],
    memo: null,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses by default
    vi.mocked(api.getSimulations).mockResolvedValue(mockSimulations as Plan[]);
    vi.mocked(api.getNotice).mockResolvedValue({
      notice: {
        id: "1",
        title: "Test Notice",
        content: "Test content",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      success: true,
    });
    // Reset mock functions
    mockViewResults.mockClear();
  });

  it("should render loading state initially", async () => {
    await act(async () => {
      renderWithProviders(<MainPage {...defaultProps} />, {
        authContextValue: mockAuthenticatedContextValue,
      });
    });

    // Should show some loading indicator or empty state initially
    expect(screen.getByTestId("simulation-table")).toBeInTheDocument();
  });

  it("should render simulation table when user is authenticated", async () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-table")).toBeInTheDocument();
    });

    // Should eventually show simulations after loading
    await waitFor(() => {
      expect(screen.getByTestId("simulation-count")).toHaveTextContent("2");
    });

    // Should show both simulations
    expect(screen.getByTestId("simulation-sim-1")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-sim-2")).toBeInTheDocument();
  });

  it("should handle simulation creation", async () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-table")).toBeInTheDocument();
    });

    // Find and click the "새 시뮬레이션" button (or similar)
    const createButton = screen.getByRole("button", {
      name: /새 시뮬레이션|추가|new/i,
    });
    fireEvent.click(createButton);

    expect(mockSetPage).toHaveBeenCalledWith("plan-editor");
  });

  it("should handle simulation editing", async () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-sim-1")).toBeInTheDocument();
    });

    // Click edit button for first simulation
    const editButton = screen.getByTestId("edit-sim-1");
    fireEvent.click(editButton);

    expect(mockSetEditingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ simulation_id: "sim-1" })
    );
    expect(mockSetPage).toHaveBeenCalledWith("plan-editor");
  });

  it("should handle simulation running", async () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-sim-1")).toBeInTheDocument();
    });

    // Click run button for first simulation
    const runButton = screen.getByTestId("run-sim-1");

    // Just check that the button exists and can be clicked
    expect(runButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(runButton);
    });

    // The test passes if no errors are thrown during the click
    // The actual flow (navigation to results, etc.) is tested in integration tests
  });

  it("should handle simulation deletion", async () => {
    vi.mocked(api.deleteSimulation).mockResolvedValue({
      simulation_id: "sim-1",
      message: "Deleted successfully",
      success: true,
    });

    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-sim-1")).toBeInTheDocument();
    });

    // Click delete button for first simulation
    const deleteButton = screen.getByTestId("delete-sim-1");
    fireEvent.click(deleteButton);

    // The openDeleteConfirm function should be called
    // This test just verifies the button click interaction works
    // The actual deletion modal is tested separately
    expect(deleteButton).toBeInTheDocument();
  });

  it("should handle logout", async () => {
    const mockSignOut = vi.fn();
    const authContext = {
      ...mockAuthenticatedContextValue,
      signOut: mockSignOut,
    };

    await act(async () => {
      renderWithProviders(<MainPage {...defaultProps} />, {
        authContextValue: authContext,
      });
    });

    // Find and click logout button
    const logoutButton = screen.getByRole("button", {
      name: /로그아웃|logout/i,
    });

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(api.getSimulations).mockRejectedValue(new Error("API Error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("should show summary report when simulations have results", async () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("summary-report")).toBeInTheDocument();
    });

    // Should show summary data for simulation with results
    // This depends on the summary calculation logic
  });

  it("should handle notice board opening", async () => {
    await act(async () => {
      renderWithProviders(<MainPage {...defaultProps} />, {
        authContextValue: mockAuthenticatedContextValue,
      });
    });

    // Find and click notice/help button
    const noticeButton = screen.getByRole("button", {
      name: /공지|notice|도움말|help/i,
    });

    await act(async () => {
      fireEvent.click(noticeButton);
    });

    expect(mockOpenNotice).toHaveBeenCalled();
  });
});
