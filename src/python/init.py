import pandas as pd
import numpy as np
import traceback

class GeneralFinancialSimulator:
    """
    모든 주요 변수가 파라미터로 제어되는 범용 금융 시스템 시뮬레이터입니다.
    CSV 파일 의존성이 없습니다.
    """

    def __init__(self, params):
        """
        시뮬레이터를 초기화합니다.

        Args:
            params (dict): 시뮬레이션에 필요한 모든 변수를 담은 마스터 딕셔너리.
        """
        # 1. 파라미터 유효성 검사 및 설정
        required_keys = [
            'max_investor_count', 'scheduled_payment', 'min_payment_new', 
            'min_payment_re', 'revenue_base_divisor', 'sales_commission', 
            'settlement_bonus', 'max_bonus', 'round_bonus_rates', 
            'sales_achievement_rates'
        ]
        for key in required_keys:
            if key not in params:
                raise ValueError(f"필수 파라미터 '{key}'가 제공되지 않았습니다.")
        
        self.params = params
        self.M = params['max_investor_count'] # 총 Investor 수 (졸업 기준)

        # 2. 시뮬레이션 상태 변수 초기화
        self.investors = []
        self.current_company_round = 0
        self.history = []

    def _add_new_investor(self, investor_type=None):
        """지정된 유형의 새로운 Investor를 시스템에 추가합니다."""
        self.investors.append({
            'start_company_round': self.current_company_round,
            'internal_round': 1,
            'type': investor_type,
            'base_return_r3': None,
            'payment_history': [],  # 납입금 기록을 위한 배열
            'revenue_history': []   # 수익금 기록을 위한 배열
        })

    def _calculate_revenue(self, investor, actual_payment):
        """개별 Investor의 수익금을 동적으로 계산합니다."""
        internal_round = investor['internal_round']
        p = self.params
        
        base_calc_value = actual_payment / p['revenue_base_divisor']

        if internal_round <= 2:
            return base_calc_value * p['sales_commission']
        
        elif internal_round == 3:
            revenue_k3 = (base_calc_value * p['sales_commission']) + p['settlement_bonus']
            investor['base_return_r3'] = revenue_k3
            return revenue_k3
        
        elif internal_round >= 4:
            bonus_amount = min(
                base_calc_value * p['round_bonus_rates'].get(internal_round, 0),
                p['max_bonus']
            )
            additional_revenue = bonus_amount * p['sales_achievement_rates'].get(self.current_company_round, 0)
            return investor['base_return_r3'] + additional_revenue
            
        return 0

    def run(self, total_simulation_rounds):
        """지정된 총 회차만큼 시뮬레이션을 실행합니다."""
        print("범용 파라미터 기반 시뮬레이션을 시작합니다...")
        
        # 이전 라운드의 세후 수익과 누적 순수익을 추적하기 위한 변수 추가
        prev_round_return_after_tax = 0
        cumulative_net_profit = 0
        
        for t in range(1, total_simulation_rounds + 1):
            self.current_company_round = t
            total_payment_this_round = 0
            total_return_this_round = 0
            next_round_investors = []
            graduation_count = 0

            # 성장기(t <= M): '신규' Investor 추가
            if t <= self.M:
                self._add_new_investor(investor_type='신규')
                
            # 안정기(t > M): 졸업한 수만큼 '재입학' Investor 추가
            if t > self.M:
                self._add_new_investor(investor_type='재입학')

            for inv in self.investors:
                internal_round = inv['internal_round']
                start_company_round = inv['start_company_round']

                # 실제 납입액 계산
                scheduled_payment = self.params['scheduled_payment'].get(start_company_round, 0)
                min_payment = self.params['min_payment_new'].get(start_company_round, 0) if inv['type'] == '신규' else self.params['min_payment_re']
                actual_payment = max(scheduled_payment, min_payment)
                
                # 동적 수익 계산
                revenue = self._calculate_revenue(inv, actual_payment)
                revenue = round(revenue)

                # 개별 투자자의 납입금과 수익금 기록 저장
                inv['payment_history'].append({'round': t, 'amount': actual_payment})
                inv['revenue_history'].append({'round': t, 'amount': revenue})

                total_payment_this_round += actual_payment
                total_return_this_round += revenue
                
                # 상태 업데이트 및 졸업 처리 (M 기준)
                if internal_round < self.M:
                    inv['internal_round'] += 1
                    next_round_investors.append(inv)
                else:
                    inv['type'] = '졸업'  # 졸업 처리
                    graduation_count += 1
            
            # 세후 수익 계산 (3.3% 세금 공제)
            total_return_after_tax = total_return_this_round - (total_return_this_round * 0.033)
            
            # 새로운 계산 방식으로 순수익(세후) 계산
            # t=1일 때는 -총납입, t>1일 때는 t-1 총수익(세후) - t 총납입
            if t == 1:
                net_profit_after_tax = -total_payment_this_round
            else:
                net_profit_after_tax = prev_round_return_after_tax - total_payment_this_round
            
            # 누적 순수익 계산
            cumulative_net_profit += net_profit_after_tax
            
            # 다음 라운드를 위해 현재 세후 수익 저장
            prev_round_return_after_tax = total_return_after_tax
            
            # 최종 보고서에는 세후 결과만 포함
            result = {
                '전체 회차': t, 
                '총 Investor 수': len(self.investors), 
                '총 납입금': total_payment_this_round,
                '총 수익금(세후)': total_return_after_tax, 
                '순수익(세후)': net_profit_after_tax,
                '누적 순수익(세후)': cumulative_net_profit
            }
            self.history.append(result)
            
            print(f"회차 {t:2d}: [투자자 수: {len(self.investors):2d}] [총납입: {total_payment_this_round:10,.0f}] " + 
                  f"[총수익(세후): {total_return_after_tax:10,.0f}] [순수익(세후): {net_profit_after_tax:10,.0f}] " +
                  f"[누적순수익(세후): {cumulative_net_profit:10,.0f}]")
            
            self.investors = next_round_investors
                  
        print("시뮬레이션이 종료되었습니다.")
        return pd.DataFrame(self.history)

# --- 시뮬레이션 실행 (사용자 설정 영역) ---

# 1. 시뮬레이션을 위한 모든 파라미터를 직접 정의합니다.
# 예시: 총 Investor 수를 10명으로 운영하는 시나리오
master_parameters = {
    # 시스템 구조 파라미터
    'max_investor_count': 15,  # 총 Investor 수를 15명으로 설정 (졸업은 15회차)
    # T가 증가할 수록 investor 수가 증가하는 구조.
    # max_investor_count에 따라 졸업 회차(investor를 졸업시키고 삭제하는 회차가 결정됨.

    # 납입 관련 파라미터
    # 각 회차별 납입금액 스케줄 (회차: 납입금액)
    'scheduled_payment': {1: 1100000, 2: 2420000, 3:330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13:3300000, 14:5500000, 15: 11000000, 16: 11000000, 17: 11000000, 18: 11000000, 19: 11000000, 20: 11000000, 21: 11000000, 22: 11000000, 23: 11000000, 24: 11000000, 25: 11000000, 26: 11000000, 27: 11000000, 28: 11000000, 29: 11000000, 30: 11000000},
    
    'min_payment_new': {1: 0, 2: 220000, 3:330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13:3300000, 14:5500000, 15: 11000000, 16: 11000000, 17: 11000000, 18: 11000000, 19: 11000000, 20: 11000000, 21: 11000000, 22: 11000000, 23: 11000000, 24: 11000000, 25: 11000000, 26: 11000000, 27: 11000000, 28: 11000000, 29: 11000000, 30: 11000000},

    'min_payment_re': 11000000, # 재입학자 최소 납입액 1100만원

    # 수익 관련 파라미터
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,  # 판매수당 32%
    'settlement_bonus': 100000,   # 정착보너스 10만원
    'max_bonus': 30000000, # 최대 보너스 3000만원
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10, 13:20, 14:50, 15:100},
    # 4~30회차 달성률 100%
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1, 13:1, 14:1, 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 21:1, 22:1, 23:1, 24:1, 25:1, 26:1, 27:1, 28:1, 29:1, 30:1} 
    
}

try:
    # 2. 시뮬레이터 객체 생성 시 파라미터 딕셔너리를 전달
    simulator = GeneralFinancialSimulator(params=master_parameters)

    # 3. 시뮬레이션 실행 (총 30회차 진행)
    results_df = simulator.run(total_simulation_rounds=30)

    # 4. 결과 출력
    print("\n--- 범용 시뮬레이션 결과 요약 ---")
    print(results_df.to_string())

except ValueError as e:
    print(f"\n시뮬레이션 설정 오류: {e}")
except Exception as e:
    # add line number and file name to the error message
    tb_str = traceback.format_exception(etype=type(e), value=e, tb=e.__traceback__)
    print(f"\n알 수 없는 오류 발생: {e}")
    print("".join(tb_str))