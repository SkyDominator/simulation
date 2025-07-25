# src/backend/Dockerfile

FROM python:3.11.6

# 작업 폴더를 컨테이너 내의 전체 경로로 명시
WORKDIR /workspaces/src/backend

# 프로젝트 루트부터의 전체 경로로 requirements.txt를 복사
COPY src/backend/requirements.txt .
RUN pip install -r requirements.txt

# 현재 폴더(src/backend)의 모든 내용을 컨테이너의 작업 폴더로 복사
COPY src/backend/ .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]