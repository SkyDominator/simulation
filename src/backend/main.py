import hashlib
import requests  # JWKS를 가져오기 위해 추가

from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict
from supabase import create_client, Client
from fastapi.security import HTTPBearer
from constants import PLAN_PARAMETERS


from simulation_service import FinancialSimulationService

# 로깅 설정
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. 초기 설정 ---

# Supabase URL과 키를 환경 변수에서 불러오기
SUPABASE_URL: str = "https://kihlqhomsychihwzwzuo.supabase.co"
SUPABASE_KEY: str = "sb_publishable_8H_WkhgiIM40Y9H32qaahw_2HKn3fdF"
SUPABASE_SECRET_KEY: str = "sb_secret_gp3MLdgaREIYCrRsaNZZeQ_KO7XXoRk"

# .env 파일에서 환경 변수 불러오기
load_dotenv()

# FastAPI 앱 인스턴스 생성
app = FastAPI()

# CORS 미들웨어 설정 (로컬 개발 시 프론트엔드와 통신 허용)
origins = [
    "http://localhost:5173", # Vite React 기본 개발 서버 주소
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase 클라이언트 초기화
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# JWT 인증 설정
# (업그레이드) JWT 인증 설정
oauth2_scheme = HTTPBearer()
# JWKS(공개키 목록)를 가져올 URL
jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
# JWKS를 캐싱하여 매번 요청하지 않도록 함
jwks_cache = {}

# --- 2. Pydantic 모델 정의 (데이터 유효성 검사) ---

# 사용자 명단 확인 요청 모델
class UserCheckRequest(BaseModel):
    name: str
    phone_number: str

# 투자 플랜 생성/수정 요청 모델
class PlanCreate(BaseModel):
    plan_id: str
    company_round: int
    total_rounds: int
    investments: List[Dict[str, Any]]

# API Response Models
class ParametersVersionResponse(BaseModel):
    version: str
    last_updated: str

# Add new model for plan parameters
class PlanParametersResponse(BaseModel):
    parameters: Dict[str, Dict[str, Any]]
    
# Custom simulation response model
class SimulationResponse(BaseModel):
    """Full simulation response including original creation parameters.

    Includes all fields from SimulationCreateRequest (plan_id, company_round,
    simulation_rounds, scheduled_payment) plus simulation execution metadata
    and results history.
    """
    simulation_id: str
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]
    history: List[Dict[str, Any]]
    message: str
    success: bool

# --- DB row models (Pydantic v2) ---
class InvestmentItem(BaseModel):
    round: int
    amount: int

class SimulationRow(BaseModel):
    id: str
    user_id: str
    plan_id: str
    company_round: int
    simulation_rounds: int
    investments: List[InvestmentItem] = []
    simulation_results: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(extra='allow')  # allow created_at, updated_at, etc.

def _scheduled_payment_from_investments(investments: List[InvestmentItem]) -> Dict[str, int]:
    """Convert investment list to the scheduled_payment mapping (string keys)."""
    return {str(item.round): int(item.amount) for item in investments}

# --- 3. 사용자 인증 의존성 ---

async def authenticate_jwt_token(token_result: HTTPAuthorizationCredentials = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = token_result.credentials
        
        # 1. 토큰 헤더에서 kid(Key ID)와 alg(알고리즘) 가져오기
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")
        if not kid or not alg:
            raise credentials_exception

        # 2. JWKS(공개키 목록) 가져오기 (캐시 확인)
        global jwks_cache
        if not jwks_cache:
            response = requests.get(jwks_url)
            response.raise_for_status()
            jwks_cache = response.json()

        # 3. kid에 맞는 공개키(public key) 찾기
        public_key = None
        keys = jwks_cache.get("keys", [])[0]
        if keys["kid"] == kid:
            public_key = keys
        
        if not public_key:
            # 캐시가 오래되었을 수 있으므로, 캐시를 비우고 다시 시도
            jwks_cache = {}
            raise credentials_exception

        # 4. 찾은 공개키와 토큰 헤더의 알고리즘으로 검증 및 해독
        payload = jwt.decode(
            token,
            public_key, # python-jose는 JWK 딕셔너리를 직접 처리할 수 있습니다.
            algorithms=[alg], # 토큰 헤더에서 가져온 알고리즘(ES256 등)을 사용합니다.
            audience="authenticated" 
        )
        
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
            
        user_id: str = str(sub)
            
    except (JWTError, AttributeError, requests.exceptions.RequestException):
        raise credentials_exception
        
    return user_id

# --- 4. API 엔드포인트 구현 ---

# 루트 엔드포인트 (서버 동작 확인용)
@app.get("/")
def read_root():
    return {"message": "Investment Simulator API is running"}


# 명단 확인 API
@app.post("/api/verify-user")
def verify_user(request: UserCheckRequest):
    combined_string = f"{request.name}-{request.phone_number}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    
    response = supabase.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()

    if response.data:
        return {"is_whitelisted": True}
    return {"is_whitelisted": False, "detail": "User not in whitelist"}

# 특정 사용자의 모든 시뮬레이션 정보 조회 API 
@app.get("/api/simulations")
def get_simulations(user_id: str = Depends(authenticate_jwt_token)):
    response = supabase.table('simulations').select("id, company_round, investments, simulation_rounds, created_at, updated_at, plan_id").eq('user_id', user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="No simulations found for this user")
    return response.data

# 특정 시뮬레이션의 상세 정보 및 결과 조회 API
@app.get("/api/simulations/{simulation_id}")
def get_simulation_details(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    """Fetch a single simulation record (including results if present)."""
    response = supabase.table('simulations').select("*").eq('id', simulation_id).eq('user_id', user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")
    return response.data[0]

# --- 시뮬레이션 관련 API 엔드포인트 --- 

class SimulationCreateRequest(BaseModel):
    """Model for creating a simulation plan without running the simulation"""
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]

class SimulationCreateResponse(BaseModel):
    """Response model for creating a simulation plan"""
    simulation_id: str
    plan_id: str
    message: str
    success: bool

class SimulationRunRequest(BaseModel):
    """Request model for running a simulation on an existing plan"""
    simulation_id: str  # ID of the plan in the database

class SimulationDeleteRequest(BaseModel):
    """Request model for deleting an existing simulation"""
    simulation_id: str

class SimulationDeleteResponse(BaseModel):
    """Response model for deleting an existing simulation"""
    simulation_id: str
    message: str
    success: bool

class SimulationUpdateRequest(BaseModel):
    """Request model for updating an existing simulation plan (invalidates previous results)"""
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]

class SimulationUpdateResponse(BaseModel):
    """Response model for updating an existing simulation plan"""
    simulation_id: str
    plan_id: str
    message: str
    success: bool

@app.post("/api/simulation/create", response_model=SimulationCreateResponse)
def create_simulation(
    request: SimulationCreateRequest, 
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationCreateResponse:
    """
    Step 1: Save the simulation request info in the database without running the simulation.
    
    Parameters:
    - request: The simulation plan parameters
    - user_id: The authenticated user's ID
    
    Returns:
    - SimulationPlanCreateResponse: The created plan's details
    """
    logger.info(f"Creating simulation plan for user_id: {user_id}")
    
    try:
        # Validate the plan type
        if request.plan_id not in PLAN_PARAMETERS:
            raise HTTPException(status_code=400, detail=f"Invalid plan type: {request.plan_id}")
        
        # Prepare plan data for database
        plan_data = {
            "user_id": user_id,
            "plan_id": request.plan_id,
            "company_round": request.company_round,
            "simulation_rounds": request.simulation_rounds,
            "investments": [
                {"round": int(round_num), "amount": amount}
                for round_num, amount in request.scheduled_payment.items()
            ],
            # No simulation_results yet
        }
        
        # Create a new plan in the database
        db_response = supabase.table("simulations").insert(plan_data).execute()
        
        # Check if save was successful
        if not db_response or not db_response.data:
            logger.error(f"Failed to save plan to database: {db_response}")
            raise HTTPException(status_code=500, detail="Failed to save plan to database")
        
        # Return success response with the created plan ID
        created_plan = db_response.data[0]
        logger.info(f"Created plan with ID: {created_plan['id']}")
        
        return SimulationCreateResponse(
            simulation_id=created_plan['id'],
            plan_id=request.plan_id,
            message="Simulation request saved successfully",
            success=True
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in create_simulation_plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create simulation plan: {str(e)}")

@app.post("/api/simulation/run", response_model=SimulationResponse)
def run_simulation(
    request: SimulationRunRequest, 
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationResponse:
    """
    Steps 2-5: Run a simulation for an existing plan.
    
    This function:
    1. Finds and loads simulation request info from the database
    2. If simulation results already exist, returns them
    3. Otherwise, runs the simulation, saves and returns the results
    
    Parameters:
    - request: Contains the database plan ID to run simulation for
    - user_id: The authenticated user's ID
    
    Returns:
    - SimulationResponse: The simulation results
    """
    logger.info(f"Running simulation for plan ID: {request.simulation_id}, user_id: {user_id}")
    
    try:
        # Step 2: Find and load the simulation request info
        db_response = supabase.table("simulations").select("*").eq("id", request.simulation_id).eq("user_id", user_id).execute()
        
        if not db_response.data:
            logger.error(f"Plan not found: {request.simulation_id}")
            raise HTTPException(status_code=404, detail=f"Plan with ID {request.simulation_id} not found")
        
        plan_data = db_response.data[0]

        # Validate and normalize via Pydantic
        row = SimulationRow.model_validate(plan_data)  # raises if inconsistent
        scheduled_payment_map = _scheduled_payment_from_investments(row.investments)

        # If results already exist, return them
        if row.simulation_results:
            logger.info(f"Returning existing simulation results for plan: {request.simulation_id}")
            results_dict = row.simulation_results or {}
            return SimulationResponse(
                simulation_id=row.id,
                plan_id=row.plan_id,
                company_round=row.company_round,
                simulation_rounds=row.simulation_rounds,
                scheduled_payment=scheduled_payment_map,
                history=results_dict.get("history", []),
                message="Retrieved existing simulation results",
                success=True,
            )

        # Run new simulation
        logger.info(f"Running new simulation for plan: {request.simulation_id}")
        # Build int-keyed dict for simulator
        scheduled_payment_int = {int(k): v for k, v in scheduled_payment_map.items()}

        simulator = FinancialSimulationService(
            plan_id=row.plan_id,
            scheduled_payment=scheduled_payment_int,
        )
        results = simulator.run_simulation(row.simulation_rounds)
        results_dict = results.to_dict()

        # Persist results
        update_response = (
            supabase
            .table("simulations")
            .update({"simulation_results": results_dict})
            .eq("id", request.simulation_id)
            .execute()
        )
        if not update_response.data:
            logger.error(f"Failed to update plan with simulation results: {update_response}")

        return SimulationResponse(
            simulation_id=row.id,
            plan_id=row.plan_id,
            company_round=row.company_round,
            simulation_rounds=row.simulation_rounds,
            scheduled_payment=scheduled_payment_map,
            history=results_dict.get("history", []),
            message="Simulation completed and results saved",
            success=True,
        )
        
    except ValueError as e:
        logger.error(f"Simulation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in run_simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@app.patch("/api/simulations/{simulation_id}", response_model=SimulationUpdateResponse)
def update_simulation(
    simulation_id: str,
    request: SimulationUpdateRequest,
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationUpdateResponse:
    """
    Update an existing simulation's parameters (plan type, company round, max rounds, scheduled payments).
    This invalidates any previously stored simulation_results so they will be recomputed on next run.
    """
    logger.info(f"Updating simulation id={simulation_id} for user_id={user_id}")
    try:
        # Validate plan type
        if request.plan_id not in PLAN_PARAMETERS:
            raise HTTPException(status_code=400, detail=f"Invalid plan type: {request.plan_id}")

        # Check ownership & existence
        existing = (
            supabase
            .table("simulations")
            .select("id")
            .eq("id", simulation_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")

        investments = [
            {"round": int(round_num), "amount": amount}
            for round_num, amount in request.scheduled_payment.items()
        ]

        update_payload = {
            "plan_id": request.plan_id,
            "company_round": request.company_round,
            "simulation_rounds": request.simulation_rounds,
            "investments": investments,
            # Invalidate existing results so they are recalculated on next run
            "simulation_results": None,
        }

        db_response = (
            supabase
            .table("simulations")
            .update(update_payload)
            .eq("id", simulation_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not db_response.data:
            raise HTTPException(status_code=500, detail="Failed to update simulation")

        return SimulationUpdateResponse(
            simulation_id=simulation_id,
            plan_id=request.plan_id,
            message="Simulation updated successfully (previous results invalidated)",
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update simulation: {str(e)}")

@app.delete("/api/simulations/{simulation_id}", response_model=SimulationDeleteResponse)
def delete_simulation(
    simulation_id: str,
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationDeleteResponse:
    """
    Delete a simulation row owned by the authenticated user.

    Parameters:
    - simulation_id: The ID of the simulation (row id in `simulations` table)
    - user_id: The authenticated user's ID

    Returns:
    - SimulationDeleteResponse indicating success
    """
    logger.info(f"Deleting simulation id={simulation_id} for user_id={user_id}")
    try:
        # Verify the record exists and belongs to the user
        check_response = (
            supabase
            .table("simulations")
            .select("id")
            .eq("id", simulation_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            logger.warning(f"Delete requested for non-existent or unauthorized simulation id={simulation_id} user_id={user_id}")
            raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")

        # Perform the delete
        _ = (
            supabase
            .table("simulations")
            .delete()
            .eq("id", simulation_id)
            .eq("user_id", user_id)
            .execute()
        )

        logger.info(f"Deleted simulation id={simulation_id}")
        return SimulationDeleteResponse(
            simulation_id=simulation_id,
            message="Simulation deleted",
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete simulation: {str(e)}")

@app.post("/api/simulation/delete", response_model=SimulationDeleteResponse)
def delete_simulation_post(
    request: SimulationDeleteRequest,
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationDeleteResponse:
    """
    Alternative POST endpoint to delete a simulation using a JSON body.
    Useful when DELETE with a body is inconvenient from some clients.
    """
    return delete_simulation(request.simulation_id, user_id)  # type: ignore[arg-type]

# --- 5. 로컬에서 개발 서버 실행 ---

# 이 파일이 직접 실행될 때 uvicorn 서버를 구동
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)