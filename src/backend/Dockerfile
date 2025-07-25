# /my-project/backend/Dockerfile

FROM python:3.11.6

# 컨테이너 안의 작업 폴더 설정
WORKDIR /app

# 파이썬 라이브러리 설치
COPY requirements.txt .
RUN pip install -r requirements.txt

# 백엔드 폴더의 모든 파일을 컨테이너로 복사
COPY . .

# 컨테이너가 실행될 때 이 명령어를 실행 (개발 서버 실행)
# --reload 옵션으로 코드 변경 시 자동 재시작
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]