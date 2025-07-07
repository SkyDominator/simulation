import pandas as pd
import numpy as np

class FinancialSystemSimulator:
    """
    최소 납입액 및 동적 수익 계산 규칙이 모두 적용된 금융 시스템을 시뮬레이션합니다.
    """

    def __init__(self, schedule_filepath, sim_params):
        """
        시뮬레이터를 초기화합니다.

        Args:
            schedule_filepath (str): 납입금 원본 스케줄이 담긴 CSV 파일 경로.
            sim_params (dict): 시뮬레이션에 필요한 모든 변수를 담은 딕셔너리.
        """
        # ... (이전과 동일한 파일 로딩 부분) ...
        try:
            schedule_df = pd.read_csv(schedule_filepath)
            header_row_index = schedule_df[schedule_df.iloc[:, 0] == '회차'].index[0]
            schedule_df = pd.read_csv(schedule_filepath, header=header_row_index, index_col='회차')
            payment_col = next((col for col in schedule_df.columns if '납입' in col), None)
            self.P_schedule = schedule_df[payment_col].apply(pd.to_numeric, errors='coerce').to_dict()
        except Exception as e:
            print(f"오류: 파일 처리 중 문제가 발생했습니다. ({e})")
            raise

        # 시뮬레이션 변수 설정
        self.params = sim_params
        
        # Investor 관련 설정
        self.max_rounds_per_investor = 15
        self.investors = []
        self.current_round = 0
        self.history = []

        # 최소 납입액 규칙 (이전과 동일)
        self.min_payment_new_entrant = {
            1: 0, 2: 220000, 3: 330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000,
            9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13: 3300000, 14: 5500000, 15: 11000000
        }
        self.min_payment_re_entrant = 11000000
    
    def _add_new_investor(self, investor_type):
        """지정된 유형의 새로운 Investor를 시스템에 추가합니다."""
        self.investors.append({
            'internal_round': 1, 
            'type': investor_type,
            'base_return_r3': None  # 3회차 기준 수익을 저장할 필드
        })

    def _calculate_revenue(self, investor, actual_payment):
        """개별 Investor의 수익금을 동적으로 계산합니다."""
        k = investor['internal_round']
        base_calc_value = actual_payment / 1.1

        if k <= 2:
            return base_calc_value * self.params['sales_commission']
        
        elif k == 3:
            revenue_k3 = (base_calc_value * self.params['sales_commission']) + self.params['settlement_bonus']
            investor['base_return_r3'] = revenue_k3  # 3회차 수익 저장
            return revenue_k3
        
        elif k >= 4:
            if investor['base_return_r3'] is None:
                # 이론적으로 발생하면 안되는 경우에 대한 방어 코드
                print(f"경고: {k}회차 Investor의 3회차 기준 수익이 기록되지 않았습니다.")
                return 0

            bonus_amount = min(
                base_calc_value * self.params['round_bonus_rates'].get(k, 0),
                self.params['max_bonus']
            )
            
            additional_revenue = bonus_amount * self.params['sales_achievement_rates'].get(k, 0)
            
            return investor['base_return_r3'] + additional_revenue
            
        return 0

    def run_simulation(self, total_rounds):
        print("동적 수익 계산 모델이 적용된 시뮬레이션을 시작합니다...")
        for t in range(1, total_rounds + 1):
            self.current_round = t
            total_payment_this_round = 0
            total_return_this_round = 0
            graduated_count = 0
            next_round_investors = []

            if t <= self.max_rounds_per_investor:
                self._add_new_investor(investor_type='신규')

            for inv in self.investors:
                k = inv['internal_round']
                # 실제 납입액 계산 (이전 모델과 동일)
                scheduled_payment = self.P_schedule.get(k, 0)
                min_payment = self.min_payment_new_entrant.get(k, 0) if inv['type'] == '신규' else self.min_payment_re_entrant
                actual_payment = max(scheduled_payment, min_payment)
                
                # 동적 수익 계산
                revenue = self._calculate_revenue(inv, actual_payment)
                
                total_payment_this_round += actual_payment
                total_return_this_round += revenue
                
                if k < self.max_rounds_per_investor:
                    inv['internal_round'] += 1
                    next_round_investors.append(inv)
                else:
                    graduated_count += 1
            
            self.investors = next_round_investors
            
            if t > self.max_rounds_per_investor:
                for _ in range(graduated_count):
                    self._add_new_investor(investor_type='재입학')

            net_profit_this_round = total_return_this_round - total_payment_this_round
            
            result = {'전체 회차': t, '총 Investor 수': len(self.investors), '총 납입금': total_payment_this_round, '총 수익금': total_return_this_round, '당기 순수익': net_profit_this_round}
            self.history.append(result)
            
            print(f"회차 {t:2d}: [투자자 수: {len(self.investors):2d}] [총납입: {total_payment_this_round:10,.0f}] [총수익: {total_return_this_round:10,.0f}] [순수익: {net_profit_this_round:10,.0f}]")
                  
        print("시뮬레이션이 종료되었습니다.")
        return pd.DataFrame(self.history)

# --- 시뮬레이션 실행 ---
# 사용자가 제공한 변수들의 예시 값을 설정합니다.
# 이 값들은 시뮬레이션 결과에 직접적인 영향을 미칩니다.
simulation_parameters = {
    'sales_commission': 0.8,  # 판매수당 80%
    'settlement_bonus': 500000,  # 정착보너스 50만원
    'max_bonus': 30000000,  # 최대 보너스 3000만원
    # 회차별 보너스율 (예시)
    'round_bonus_rates': {k: 0.5 for k in range(4, 16)}, # 4~15회차 모두 50%
    # 회차별 매출 달성률 (예시)
    'sales_achievement_rates': {k: 1.0 for k in range(4, 16)} # 4~15회차 모두 100%
}

file_path = './A플랜 시뮬레이션 - 간단버전 - 백업용 - 30회차.csv'

try:
    simulator_v3 = FinancialSystemSimulator(
        schedule_filepath=file_path,
        sim_params=simulation_parameters
    )
    results_df_v3 = simulator_v3.run_simulation(total_rounds=30)

    print("\n--- 시뮬레이션 결과 요약 (동적 수익 계산 적용) ---")
    print(results_df_v3.to_string())

except Exception as e:
    print(f"\n시뮬레이션 실행에 실패했습니다. 원인: {e}")