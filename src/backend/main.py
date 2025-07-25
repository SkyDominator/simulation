import os
import hashlib
import requests # JWKS를 가져오기 위해 추가

from typing import List, Dict, Any

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

# 로깅 설정
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. 초기 설정 ---

# Supabase URL과 키를 환경 변수에서 불러오기
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY")

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
    plan_type: str
    company_round: int
    total_rounds: int
    investments: List[Dict[str, Any]]

# 시뮬레이션 실행 요청 모델
class SimulationRequest(BaseModel):
    plan_data: Dict[str, Any]

class ParametersVersionResponse(BaseModel):
    version: str
    last_updated: str

# Add new model for plan parameters
class PlanParametersResponse(BaseModel):
    parameters: Dict[str, Dict[str, Any]]

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
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
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
        for plan_type in ['A', 'B', 'C', 'D', 'R', 'E', 'F', 'K', 'P']:
            plan_params = PLAN_PARAMETERS.get(plan_type, {})
            parameters[plan_type] = {
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

# 특정 사용자의 모든 플랜 조회 API
@app.get("/api/plans")
def get_plans(user_id: str = Depends(authenticate_jwt_token)):
    response = supabase.table('plans').select("*").eq('user_id', user_id).execute()
    return response.data

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

# 투자 시뮬레이션 실행 API
@app.post("/api/run-simulation")
def run_simulation(req: SimulationRequest, user_id: str = Depends(authenticate_jwt_token)):
    # 여기에 기존 Python 투자 모델 코드를 함수 형태로 가져와서 사용
    # def run_my_financial_model(plan_data: dict) -> dict: ...
    # simulation_result = run_my_financial_model(req.plan_data)
    
    # 예시 결과
    simulation_result = {"expected_return": 15000, "principal": 10000}
    return simulation_result

# --- 5. 로컬에서 개발 서버 실행 ---

# 이 파일이 직접 실행될 때 uvicorn 서버를 구동
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)