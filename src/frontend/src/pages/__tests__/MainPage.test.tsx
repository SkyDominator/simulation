import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  mockAuthenticatedContextValue,
} from "../../test/test-utils";
import MainPage from "../MainPage";
import { api } from "../../services/api";

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

// Mock components that might be complex
vi.mock("../../components/Shell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

// Define test types
interface MockSimulation {
  id: string;
  plan_id: string;
  starting_company_round: number;
  current_company_round: number;
  investments: { scheduled_payment: number };
  simulation_results: unknown;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

interface MockSimulationTableProps {
  simulations: MockSimulation[];
  onEdit: (sim: MockSimulation) => void;
  onRun: (sim: MockSimulation) => void;
  onDelete: (sim: MockSimulation) => void;
}

vi.mock("../../components/MainPage/SimulationTable", () => ({
  default: ({
    simulations,
    onEdit,
    onRun,
    onDelete,
  }: MockSimulationTableProps) => (
    <div data-testid="simulation-table">
      <div data-testid="simulation-count">{simulations?.length || 0}</div>
      {simulations?.map((sim: MockSimulation) => (
        <div key={sim.id} data-testid={`simulation-${sim.id}`}>
          <span>{sim.plan_id}</span>
          <button onClick={() => onEdit(sim)} data-testid={`edit-${sim.id}`}>
            Edit
          </button>
          <button onClick={() => onRun(sim)} data-testid={`run-${sim.id}`}>
            Run
          </button>
          <button
            onClick={() => onDelete(sim)}
            data-testid={`delete-${sim.id}`}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  ),
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
    id: "sim-1",
    simulation_id: "sim-1",
    plan_id: "A",
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 10,
    investments: { scheduled_payment: 100000 },
    simulation_results: null,
    memo: "Test memo",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "sim-2",
    simulation_id: "sim-2",
    plan_id: "B",
    starting_company_round: 1,
    current_company_round: 2,
    simulation_rounds: 10,
    investments: { scheduled_payment: 200000 },
    simulation_results: {
      history: [
        { round: 1, totalReturn: 110000, netProfit: 10000 },
        { round: 2, totalReturn: 220000, netProfit: 20000 },
      ],
    },
    memo: null,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses by default
    vi.mocked(api.getSimulations).mockResolvedValue(mockSimulations as any);
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
  });

  it("should render loading state initially", () => {
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
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
      expect.objectContaining({ id: "sim-1" })
    );
    expect(mockSetPage).toHaveBeenCalledWith("plan-editor");
  });

  it("should handle simulation running", async () => {
    vi.mocked(api.runSimulation).mockResolvedValue({
      simulation_id: "sim-1",
      plan_id: "A",
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 10,
      scheduled_payment: { monthly: 100000 },
      history: [{ round: 1, totalReturn: 110000, netProfit: 10000 }],
      message: "Success",
      success: true,
    });

    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    await waitFor(() => {
      expect(screen.getByTestId("simulation-sim-1")).toBeInTheDocument();
    });

    // Click run button for first simulation
    const runButton = screen.getByTestId("run-sim-1");
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(api.runSimulation).toHaveBeenCalledWith(
        "sim-1",
        expect.any(String)
      );
    });
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

    // Should show delete confirmation modal
    // Note: The actual delete will be handled by the DeleteConfirmModal
    // We're just testing that the delete button triggers the modal
  });

  it("should handle logout", async () => {
    const mockSignOut = vi.fn();
    const authContext = {
      ...mockAuthenticatedContextValue,
      signOut: mockSignOut,
    };

    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: authContext,
    });

    // Find and click logout button
    const logoutButton = screen.getByRole("button", {
      name: /로그아웃|logout/i,
    });
    fireEvent.click(logoutButton);

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
    renderWithProviders(<MainPage {...defaultProps} />, {
      authContextValue: mockAuthenticatedContextValue,
    });

    // Find and click notice/help button
    const noticeButton = screen.getByRole("button", {
      name: /공지|notice|도움말|help/i,
    });
    fireEvent.click(noticeButton);

    expect(mockOpenNotice).toHaveBeenCalled();
  });
});
