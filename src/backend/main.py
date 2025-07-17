import os
import hashlib
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
SECRET_KEY = os.getenv("SUPABASE_JWT_SECRET")
ALGORITHM = "HS256"
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # 이 프로젝트에서는 직접 사용하지 않음
oauth2_scheme = HTTPBearer()

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
        # HTTPBearer는 토큰 자체(credentials)를 반환
        token = token_result.credentials
        # Supabase에서 발급한 JWT 토큰을 해독
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub") # 'sub' 클레임에 사용자 ID(uuid)가 들어있음
        if user_id is None:
            raise credentials_exception
    except (JWTError, AttributeError):
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