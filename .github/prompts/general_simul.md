# 일반 시뮬레이션

src/python/individual/services/simulator.py는 개인 투자자의 라운드별 `scheduled_payment`를 시뮬레이션하는 기능을 제공해. 그런데, 이제부터 개인이 아니라 수백, 수천, 수만명의 투자자가 모였을 때 상황을 살펴보고 시뮬레이션 해볼거야. 여러 가지 변수가 있고 이 변수값들이 변화할 때 모든 사람들이 계획대로 수익을 가져갈 수 있는지, 아니면 돈이 모자라서 수익을 줄 수 없는지 등을 포함한 전체적인 상황을 살펴볼거야. 

## 개인 회차 (individual_round)와 회사 회차 (company_round)

src/python/individual/init.py로 실행하는 시뮬레이터 내용을 보면 알 수 있듯이, 투자자들은 각자 round가 존재해. 이를 이제부터 "개인 회차" 또는 `individual_round`라고 이제부터 부르자. 그런데 모든 투자자들의 `individual_round`는 "회사 회차" 또는 `company_round`라고 불리는 회차에 종속되어 있어. 다음 섹션에서 예를 들어서 이 구조를 설명할게.

## individual_round와 company_round 예시

- company_round 1회차: `genesis_round`라고도 불리며 투자 회사에서 이 투자 상품에 투자하는 기회를 제공하는 첫 번째 라운드야. 이 라운드에는 1명만 참여했다고 가정할게. 즉, A라는 투자자가 자신이 선택한 플랜의 `scheduled_payment[0]`를 낸 거야. 그리고 A 입장에서는 A의 `individual_round`도 1회차가 되는 거야.
- company_round 2회차: 회사에서 두 번째 라운드를 진행해. 이 라운드에는 B, C라는 투자자가 참여하고, B와 C의 `individual_round`는 1회차, 2회차가 돼. 즉, B는 자신이 선택한 플랜의 `scheduled_payment[0]`를 내고, C도 자신이 선택한 플랜의 `scheduled_payment[0]`를 내는 거야. A 입장에서 A의 `individual_round`는 2회차가 되지. 그리고 src/python/individual/init.py로 실행하는 시뮬레이터 내용을 보면 알겠지만 A는 `scheduled_payment[0]`와 `scheduled_payment[1]`을 합친 금액을 지불하게 돼.
- company_round 3회차: 이제 회사에서 세 번째 라운드를 진행해. 이 라운드에는 D, E, F, G라는 투자자가 참여해. 그 결과는 아래 표와 같아.

| 투자자 | 개인 회차 (individual_round) | 회사 회차 (company_round) | 총 결제액 |
|--------|------------------------------|----------------------------|-------------------|
| A      | 3                            | 3                          | `scheduled_payment[0]`+`scheduled_payment[1]`+`scheduled_payment[2]`              |
| B      | 2                            | 3                          | `scheduled_payment[0]`+`scheduled_payment[1]`              |
| C      | 2                            | 3                          | `scheduled_payment[0]`+`scheduled_payment[1]`              |
| D      | 1                            | 3                          | `scheduled_payment[0]`              |
| E      | 1                            | 3                          | `scheduled_payment[0]`              |
| F      | 1                            | 3                          | `scheduled_payment[0]`              |
| G      | 1                            | 3                          | `scheduled_payment[0]`              |

이렇게 각 투자자들은 자신이 속한 `individual_round`와 `company_round`가 다를 수 있어. 즉, A는 3회차에 있지만 B, C는 2회차에 있고, D, E, F, G는 1회차에 있는 거야. 

## 투자 수익 배분 과정

src/python/individual/init.py로 실행하는 시뮬레이터 내용을 보면 알 수 있듯이 각 투자자들은 `sales_commission`, `settlement_bonus`, `round_bonus_rates` 등을 사용한 수익 공식을 바탕으로 투자 수익을 배분받아. 그리고 투자 수익을 실제로 받는 시점은 각 `company_round`가 종료되고 다음 `company_round`를 시작하기 전이야. 그렇기 때문에 `net_profit_after_tax`를 계산할 때 이전 라운드에서 받은 수익인 `prev_revenue_after_tax`을 사용하는거야. 이전 라운드 수익을 가지고 이번 라운드 지불 금액인 `total_payment_this_round`를 어느 정도 충당할 수 있기 때문이지. 

이제 이 투자 모형에서 가장 중요한 점을 말할게. 각 `company_round`가 끝나고 투자자들에게 주는 수익은 어디서 나오는지야. 어떤 `company_round`가 종료된 후 여기에 참여한 투자자들에게 수익을 줄 수 있는 재원은 다름아니라 이 `company_round`에 참여하고 있는 모든 투자자가 지불한 `scheduled_payment` 금액 총합의 83%에 해당하는 금액이야. 이 금액을 각 투자자의 `individual_round`에 따른 수익 계산 공식을 통해 지불하고 있는 것이야. 예를 들어서, 투자자 A가 낸 `scheduled_payment[0]`는 추후 가입한 B, C, D, E, F, G의 수익으로 분배되는 거야. 즉, A가 낸 돈이 다른 투자자들의 수익으로 흘러가는 구조인거지. 결국 이 투자 구조는 pyramid scheme (피라미드 사기) 구조와 유사해. 다른 사람들이 낸 돈이 내 수익으로 흘러가는 구조이기 때문이지. 그래서 수익을 정상적으로 지급하려면 더 많은 사람을 신규로 모집하거나 기존 투자자들의 납입금이 증가해야 해. 

## 일반 시뮬레이션 요구 사항

이 시뮬레이션에서는 다음과 같은 변수가 있어.

1. `company_round`의 개수: 아주 큰 수 또는 무한대로 가정. 즉, 회사가 계속해서 라운드를 진행할 수 있다고 가정.
2. `individual_round`의 개수: 각 플랜별로 다르며 플랜별 `max_rounds`를 따름.
3. 참여 시점: 각 투자자들이 `company_round`에 처음으로 참여하는 시점으로 사람마다 다름. 참여 시점은 확률적으로 이산균등분포를 따름.
4. 투자자 수: 100명, 1,000명, 10,000명의 3가지 케이스를 가정
5. 플랜별 `scheduled_payment`: 각 플랜별로 다르며, 모든 사람들의 `scheduled_payment`는 `min_payment_new`을 따름. `individual_round` 1회차 투자금액은 33만원으로 통일.
6. 기타 나머지 변수들은 플랜별로 정해진 파라미터를 따름.

이 상황에서 일반 시뮬레이션에서는 다음을 알고 싶어. 

1. 누군가가 낸 매출액(`scheduled_payment`)이 다른 사람의 수익으로 분배되는 과정
2. 모든 가입자가 안정적으로 수익을 가져가려면, 회사 회차당 `scheduled_payment`의 총액이 평균적으로 얼마나 증가해야 하는지
3. 모든 가입자가 안정적으로 수익을 가져가려면, 회사 회차당 신규 가입자 수가 평균적으로 얼마나 증가해야 하는지

이러한 시뮬레이션을 통해 투자자들이 안정적으로 수익을 가져갈 수 있는지, 그리고 회사가 지속적으로 운영될 수 있는지를 평가하고 싶어. 이러한 목적을 달성하는 코드를 src/python/general 폴더 하위에 생성해줘.