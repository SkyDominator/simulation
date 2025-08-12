import os
import hashlib
import requests # JWKS를 가져오기 위해 추가

from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.security import HTTPBearer
from constants import PLAN_PARAMETERS

import json

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
    plan_id: str
    history: List[Dict[str, Any]]
    message: str
    success: bool

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

# Plan parameters version endpoint
@app.get("/api/parameters/version", response_model=ParametersVersionResponse)
def get_parameters_version(user_id: str = Depends(authenticate_jwt_token)):
    """
    Returns the current version of plan parameters.
    This allows clients to check if their cached parameters are up to date.
    """
    # Generate a version hash based on the actual parameters content
    try:    
        # Create a hash from the stringified parameters to use as version
        params_str = json.dumps(PLAN_PARAMETERS, sort_keys=True)
        version = hashlib.sha256(params_str.encode()).hexdigest()[:10]
        
        return {
            "version": version,
            "last_updated": "2023-07-25T00:00:00Z"  # Use actual timestamp in production
        }
    except Exception as e:
        logging.error(f"Error generating parameters version: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate parameters version: {str(e)}")

# Plan parameters endpoint
@app.get("/api/parameters", response_model=PlanParametersResponse)
def get_parameters(version_info: Dict = Depends(get_parameters_version)):
    """
    Returns all plan parameters, focusing on min_payment_new for now.
    """
    try:
        # Extract only the min_payment_new from each plan's parameters
        parameters = {}
        for plan_id in ['A', 'B', 'C', 'D', 'R', 'E', 'F', 'K', 'P']:
            plan_params = PLAN_PARAMETERS.get(plan_id, {})
            parameters[plan_id] = {
                "min_payment_new": plan_params.get('min_payment_new', {}),
                "max_rounds": plan_params.get('max_rounds', 30)
            }
            
        return {"parameters": parameters}
    except Exception as e:
        logging.error(f"Error fetching parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch parameters: {str(e)}")
    
# 명단 확인 API
@app.post("/api/verify-user")
def verify_user(request: UserCheckRequest):
    combined_string = f"{request.name}-{request.phone_number}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    
    response = supabase.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()

    if response.data:
        return {"is_whitelisted": True}
    return {"is_whitelisted": False, "detail": "User not in whitelist"}

# 특정 사용자의 모든 플랜 조회 API - 간단한 정보만 반환
@app.get("/api/plans")
def get_plans(user_id: str = Depends(authenticate_jwt_token)):
    # 시뮬레이션 결과는 제외하고 기본 정보만 조회
    response = supabase.table('plans').select(
        "id, plan_id, company_round, simulation_rounds, created_at, updated_at"
    ).eq('user_id', user_id).execute()
    return response.data

# 특정 플랜의 상세 정보 및 시뮬레이션 결과 조회 API
@app.get("/api/plans/{plan_id}")
def get_plan_details(plan_id: str, user_id: str = Depends(authenticate_jwt_token)):
    # 특정 플랜의 모든 정보(시뮬레이션 결과 포함) 조회
    response = supabase.table('plans').select("*").eq('id', plan_id).eq('user_id', user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Plan with ID {plan_id} not found")
    
    return response.data[0]

# 새 플랜 생성 API
@app.post("/api/plans")
def create_plan(plan: PlanCreate, user_id: str = Depends(authenticate_jwt_token)):
    # Pydantic 모델을 딕셔너리로 변환하고, user_id 추가
    plan_data = plan.dict()
    plan_data['user_id'] = user_id
    
    response = supabase.table('plans').insert(plan_data).execute()
    
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=400, detail="Failed to create plan")

# --- 시뮬레이션 관련 API 엔드포인트 --- 

class SimulationPlanCreate(BaseModel):
    """Model for creating a simulation plan without running the simulation"""
    plan_id: str
    max_rounds: int
    company_round: int = 1
    scheduled_payment: Dict[str, int]

class SimulationPlanCreateResponse(BaseModel):
    """Response model for creating a simulation plan"""
    id: str
    plan_id: str
    message: str
    success: bool

class SimulationRunRequest(BaseModel):
    """Request model for running a simulation on an existing plan"""
    simulation_id: str  # ID of the plan in the database

@app.post("/api/simulation/plan", response_model=SimulationPlanCreateResponse)
def create_simulation_plan(
    request: SimulationPlanCreate, 
    user_id: str = Depends(authenticate_jwt_token)
) -> SimulationPlanCreateResponse:
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
        
        # Get max_rounds from plan or use provided value, whichever is smaller
        plan_max_rounds = PLAN_PARAMETERS[request.plan_id].get('max_rounds', 36)
        max_rounds = min(request.max_rounds, plan_max_rounds)
        
        # Prepare plan data for database
        plan_data = {
            "user_id": user_id,
            "plan_id": request.plan_id,
            "company_round": request.company_round,
            "simulation_rounds": max_rounds,
            "investments": [
                {"round": int(round_num), "amount": amount}
                for round_num, amount in request.scheduled_payment.items()
            ],
            # No simulation_results yet
        }
        
        # Create a new plan in the database
        db_response = supabase.table("plans").insert(plan_data).execute()
        
        # Check if save was successful
        if not db_response or not db_response.data:
            logger.error(f"Failed to save plan to database: {db_response}")
            raise HTTPException(status_code=500, detail="Failed to save plan to database")
        
        # Return success response with the created plan ID
        created_plan = db_response.data[0]
        logger.info(f"Created plan with ID: {created_plan['id']}")
        
        return SimulationPlanCreateResponse(
            id=created_plan['id'],
            plan_id=request.plan_id,
            message="Simulation plan saved successfully",
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
        db_response = supabase.table("plans").select("*").eq("id", request.simulation_id).eq("user_id", user_id).execute()
        
        if not db_response.data:
            logger.error(f"Plan not found: {request.simulation_id}")
            raise HTTPException(status_code=404, detail=f"Plan with ID {request.simulation_id} not found")
        
        plan_data = db_response.data[0]
        
        # Step 3: Check if simulation results already exist
        if plan_data.get("simulation_results"):
            logger.info(f"Returning existing simulation results for plan: {request.simulation_id}")
            results_dict = plan_data["simulation_results"]
            
            # Ensure plan_id is available
            plan_id = plan_data.get("plan_id", "")
            if not isinstance(plan_id, str):
                plan_id = str(plan_id) if plan_id else ""
            
            # Construct properly typed response
            response_data = SimulationResponse(
                plan_id=plan_id,
                history=results_dict.get("history", []),
                message="Retrieved existing simulation results",
                success=True
            )
            return response_data
        
        # Step 4: If no simulation results exist, run the simulation
        logger.info(f"Running new simulation for plan: {request.simulation_id}")
        
        # Extract plan details with proper type checking
        plan_id = plan_data.get("plan_id")
        if not isinstance(plan_id, str):
            raise ValueError(f"Invalid plan_id: {plan_id}")
            
        max_rounds = plan_data.get("simulation_rounds")
        if not isinstance(max_rounds, int):
            max_rounds = int(max_rounds) if max_rounds else 30  # Default if missing or invalid
        
        # Extract investments and convert to scheduled_payment format
        investments = plan_data.get("investments", [])
        scheduled_payment = {str(inv.get("round", 0)): inv.get("amount", 0) for inv in investments}
        
        # Convert string keys in scheduled_payment dict to integers with proper validation
        scheduled_payment_int: Dict[int, int] = {}
        for k, v in scheduled_payment.items():
            try:
                scheduled_payment_int[int(k)] = int(v)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid scheduled payment entry: {k}={v}, error: {e}")
                # Skip invalid entries
        
        # Initialize and run simulation
        simulator = FinancialSimulationService(
            plan_id=plan_id,
            scheduled_payment=scheduled_payment_int
        )
        
        results = simulator.run_simulation(max_rounds)
        results_dict = results.to_dict()
        
        # Step 5: Save simulation results back to the database
        update_response = supabase.table("plans").update({
            "simulation_results": results_dict
        }).eq("id", request.simulation_id).execute()
        
        if not update_response.data:
            logger.error(f"Failed to update plan with simulation results: {update_response}")
            # Continue anyway - we'll return results even if saving failed
        
        # Prepare the response data
        response_data = SimulationResponse(
            plan_id=plan_id,
            history=results_dict.get("history", []),
            message="Simulation completed and results saved",
            success=True
        )
        return response_data
        
    except ValueError as e:
        logger.error(f"Simulation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in run_simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

# --- 5. 로컬에서 개발 서버 실행 ---

# 이 파일이 직접 실행될 때 uvicorn 서버를 구동
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)