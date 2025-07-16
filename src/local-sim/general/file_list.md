# 일반 시뮬레이션 시스템 파일 목록

다음은 일반 시뮬레이션 시스템을 위해 생성된 파일들의 목록과 각 파일의 역할입니다.

## 주요 파일

* **`src/python/general/__init__.py`**
   - 모듈 진입점, 편의 함수와 주요 클래스 노출

* **`src/python/general/main.py`**
   - 시뮬레이션 실행을 위한 명령줄 인터페이스
   - 매개변수 처리 및 결과 보고 담당

* **`src/python/general/README.md`**
   - 시스템 문서화 및 사용 방법 설명

## 모델

* **`src/python/general/models/__init__.py`**
   - 모델 클래스 노출

* **`src/python/general/models/investor.py`**
   - `GeneralInvestor` 클래스: 투자자 데이터 모델
   - 투자자 상태, 결제 이력, 수익 이력 관리

* **`src/python/general/models/results.py`**
   - `CompanyRoundResult`: 회사 회차별 결과 저장
   - `GeneralSimulationResults`: 전체 시뮬레이션 결과 저장 및 분석

## 서비스

* **`src/python/general/services/__init__.py`**
   - 서비스 클래스 노출

* **`src/python/general/services/general_simulator.py`**
   - `GeneralSimulationService`: 핵심 시뮬레이션 로직
   - 투자자 생성, 결제, 수익 계산, 라운드 진행 등 처리

## 유틸리티

* **`src/python/general/utils/__init__.py`**
   - 유틸리티 함수 노출

* **`src/python/general/utils/reporting.py`**
    - 결과 보고, 시각화, Excel 내보내기 등 기능 제공

## 테스트

* **`test_general_simulation.py`**
    - 일반 시뮬레이션 시스템 기능 테스트

## 사용 방법

시뮬레이션을 실행하려면 다음 명령을 사용하세요:

```bash
python test_general_simulation.py
```

또는 보다 자세한 설정으로 실행하려면:

```bash
python -m src.python.general.main --plan A --investors 1000 --rounds 100 --plot --excel
```

## 주요 기능 요약

1. 대규모 투자자(100명, 1,000명, 10,000명) 시뮬레이션
2. 회사 회차와 개인 회차의 구분된 추적
3. 투자자별 납입금 및 수익 흐름 분석
4. 시스템 지속가능성 평가
5. 결과 시각화 및 Excel 내보내기
