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

# --- 1. 초기 설정 ---

# Supabase URL과 키를 환경 변수에서 불러오기
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")

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
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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


# --- 3. 사용자 인증 의존성 ---

async def get_current_user_id(token_result: HTTPAuthorizationCredentials = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = token_result.credentials
        
        # 1. 토큰 헤더에서 kid(Key ID) 가져오기
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise credentials_exception

        # 2. JWKS(공개키 목록) 가져오기 (캐시 확인)
        global jwks_cache
        if not jwks_cache:
            response = requests.get(jwks_url)
            response.raise_for_status()
            jwks_cache = response.json()

        # 3. kid에 맞는 공개키(public key) 찾기
        rsa_key = {}
        for key_data in jwks_cache.get("keys", []):
            if key_data["kid"] == kid:
                rsa_key = {
                    "kty": key_data["kty"],
                    "kid": key_data["kid"],
                    "use": key_data["use"],
                    "n": key_data["n"],
                    "e": key_data["e"],
                }
                break
        
        if not rsa_key:
            raise credentials_exception

        # 4. 찾은 공개키로 토큰 검증 및 해독
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["P256"],
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
def get_plans(user_id: str = Depends(get_current_user_id)):
    response = supabase.table('plans').select("*").eq('user_id', user_id).execute()
    return response.data

# 새 플랜 생성 API
@app.post("/api/plans")
def create_plan(plan: PlanCreate, user_id: str = Depends(get_current_user_id)):
    # Pydantic 모델을 딕셔너리로 변환하고, user_id 추가
    plan_data = plan.dict()
    plan_data['user_id'] = user_id
    
    response = supabase.table('plans').insert(plan_data).execute()
    
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=400, detail="Failed to create plan")

# 투자 시뮬레이션 실행 API
@app.post("/api/run-simulation")
def run_simulation(req: SimulationRequest, user_id: str = Depends(get_current_user_id)):
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