"""
Utility functions for the general simulation system.
"""

import logging
import os
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime

from ..models.results import GeneralSimulationResults

logger = logging.getLogger(__name__)


def setup_logging(log_dir: str = "logs") -> None:
    """
    Set up logging for the general simulation.
    
    Args:
        log_dir (str): Directory to store log files
    """
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(log_dir, f"general_simulation_{timestamp}.log")
    
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(
        logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    
    logger.info(f"Logging initialized to {log_file}")


def print_simulation_summary(results: GeneralSimulationResults) -> None:
    """
    Print a summary of the general simulation results.
    
    Args:
        results (GeneralSimulationResults): The simulation results to summarize
    """
    summary = results.get_summary()
    
    print("\n" + "="*50)
    print(f"일반 시뮬레이션 결과 요약 - 플랜: {summary['plan_id']}")
    print(f"투자자 수: {summary['investor_count']}")
    print(f"회사 회차 수: {summary['total_company_rounds']}")
    print("-"*50)
    print(f"최종 순수익: {summary['final_net_profit']:,.0f}원")
    print(f"최종 활성 투자자 수: {summary['final_investor_count']:,}")
    print(f"총 납입금: {summary['total_payments']:,.0f}원")
    print(f"총 수익금: {summary['total_revenue']:,.0f}원")
    print(f"회차당 평균 순수익: {summary['average_net_profit_per_round']:,.0f}원")
    
    # Print sustainability metrics
    sustainability = summary['sustainability_metrics']
    print("\n[지속가능성 지표]")
    if sustainability.get('first_profitable_round'):
        print(f"첫 흑자 전환 회차: {sustainability['first_profitable_round']} 회차")
    else:
        print(f"흑자 전환 실패")
        
    if sustainability.get('sustained_profitability'):
        print(f"지속적인 흑자 유지: 예")
    else:
        print(f"지속적인 흑자 유지: 아니오")
        print(f"흑자 후 적자 전환 회차: {', '.join(map(str, sustainability.get('unprofitable_after_profit_rounds', [])))}")
    
    if 'growth_metrics' in sustainability and sustainability['growth_metrics']:
        growth = sustainability['growth_metrics']
        if 'avg_investor_growth_rate' in growth:
            print(f"지속가능한 신규 투자자 증가율: {growth['avg_investor_growth_rate']:.2f}x")
        if 'avg_payment_growth_rate' in growth:
            print(f"지속가능한 납입금 증가율: {growth['avg_payment_growth_rate']:.2f}x")
    
    # Print ROI distribution
    roi_dist = summary['roi_distribution']
    print("\n[ROI 분포]")
    print(f"최소 ROI: {roi_dist['min']:.2f}%")
    print(f"최대 ROI: {roi_dist['max']:.2f}%")
    print(f"평균 ROI: {roi_dist['mean']:.2f}%")
    print(f"중앙값 ROI: {roi_dist['median']:.2f}%")
    
    for i, p in enumerate(roi_dist['percentiles']):
        print(f"{p}% 백분위: {roi_dist['percentile_values'][i]:.2f}%")
    
    print("="*50)


def plot_simulation_results(results: GeneralSimulationResults, output_dir: str = "output") -> None:
    """
    Create visualizations of the general simulation results.
    
    Args:
        results (GeneralSimulationResults): The simulation results to visualize
        output_dir (str): Directory to save the plots
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    df = results.to_dataframe()
    
    # Plot 1: Net profit over time
    plt.figure(figsize=(10, 6))
    plt.plot(df['회사 회차'], df['누적 순수익(세후)'], 'b-', linewidth=2)
    plt.axhline(y=0, color='r', linestyle='-', alpha=0.3)
    plt.title(f'누적 순수익 추이 (플랜: {results.plan_id}, 투자자 수: {results.investor_count:,}명)')
    plt.xlabel('회사 회차')
    plt.ylabel('누적 순수익 (원)')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f"net_profit_{results.plan_id}_{timestamp}.png"))
    
    # Plot 2: New investors and payments
    fig, ax1 = plt.subplots(figsize=(10, 6))
    
    color = 'tab:blue'
    ax1.set_xlabel('회사 회차')
    ax1.set_ylabel('신규 투자자 수', color=color)
    ax1.plot(df['회사 회차'], df['신규 투자자 수'], color=color)
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()
    color = 'tab:red'
    ax2.set_ylabel('총 납입금 (원)', color=color)
    ax2.plot(df['회사 회차'], df['총 납입금'], color=color)
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title(f'신규 투자자 및 납입금 추이 (플랜: {results.plan_id})')
    fig.tight_layout()
    plt.savefig(os.path.join(output_dir, f"investors_payments_{results.plan_id}_{timestamp}.png"))
    
    # Plot 3: Revenue to Payment Ratio
    payment_flow = results.get_payment_flow_analysis()
    ratio_data = payment_flow['revenue_payment_ratio']
    rounds = sorted(ratio_data.keys())
    ratios = [ratio_data[r] for r in rounds]
    
    plt.figure(figsize=(10, 6))
    plt.plot(rounds, ratios, 'g-', marker='o')
    plt.axhline(y=1, color='r', linestyle='--', alpha=0.3)
    plt.title(f'수익/납입금 비율 (플랜: {results.plan_id})')
    plt.xlabel('회사 회차')
    plt.ylabel('비율 (수익/납입금)')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f"ratio_{results.plan_id}_{timestamp}.png"))
    
    # Plot 4: ROI Distribution
    summary = results.get_summary()
    roi_data = [investor.get_roi() for investor in results.investors]
    
    plt.figure(figsize=(10, 6))
    plt.hist(roi_data, bins=30, alpha=0.7, color='teal')
    plt.axvline(x=100, color='r', linestyle='--', alpha=0.7, label='원금 회수 (100%)')
    plt.title(f'투자자별 ROI 분포 (플랜: {results.plan_id})')
    plt.xlabel('ROI (%)')
    plt.ylabel('투자자 수')
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f"roi_dist_{results.plan_id}_{timestamp}.png"))
    
    logger.info(f"Plots saved to {output_dir}")


def export_to_excel(results: GeneralSimulationResults, output_dir: str = "output") -> str:
    """
    Export the general simulation results to an Excel file.
    
    Args:
        results (GeneralSimulationResults): The simulation results to export
        output_dir (str): Directory to save the Excel file
        
    Returns:
        str: Path to the saved Excel file
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"general_simulation_{results.plan_id}_{timestamp}.xlsx")
    
    # Create a Pandas Excel writer
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Sheet 1: Round-by-round results
        df_rounds = results.to_dataframe()
        df_rounds.to_excel(writer, sheet_name='회차별_결과', index=False)
        
        # Sheet 2: Investor statistics
        investor_data = []
        for investor in results.investors:
            investor_data.append({
                '투자자 ID': investor.id,
                '시작 회차': investor.start_company_round,
                '투자자 유형': investor.investor_type,
                '내부 회차': investor.internal_round,
                '상태': investor.current_status,
                '총 납입금': investor.get_total_payments(),
                '총 수익금': investor.get_total_revenue(),
                '순이익': investor.get_net_profit(),
                'ROI (%)': investor.get_roi()
            })
        df_investors = pd.DataFrame(investor_data)
        df_investors.to_excel(writer, sheet_name='투자자별_통계', index=False)
        
        # Sheet 3: Summary statistics
        summary = results.get_summary()
        sustainability = summary['sustainability_metrics']
        
        # Convert the summary to a format suitable for Excel
        summary_data = []
        
        # Basic info
        summary_data.extend([
            ('기본 정보', ''),
            ('플랜', summary['plan_id']),
            ('투자자 수', summary['investor_count']),
            ('총 회사 회차 수', summary['total_company_rounds']),
            ('', ''),
            ('재무 지표', ''),
            ('최종 순이익', summary['final_net_profit']),
            ('최종 활성 투자자 수', summary['final_investor_count']),
            ('총 납입금', summary['total_payments']),
            ('총 수익금', summary['total_revenue']),
            ('회차당 평균 순이익', summary['average_net_profit_per_round']),
            ('', ''),
            ('지속가능성 지표', ''),
            ('첫 흑자 회차', sustainability.get('first_profitable_round', 'N/A')),
            ('지속적 흑자 여부', 'Y' if sustainability.get('sustained_profitability', False) else 'N'),
        ])
        
        # Growth metrics
        growth = sustainability.get('growth_metrics', {})
        if growth:
            summary_data.extend([
                ('필요 신규 투자자 증가율', growth.get('avg_investor_growth_rate', 'N/A')),
                ('필요 납입금 증가율', growth.get('avg_payment_growth_rate', 'N/A')),
            ])
            
        # ROI distribution
        roi_dist = summary['roi_distribution']
        summary_data.extend([
            ('', ''),
            ('ROI 분포', ''),
            ('최소 ROI (%)', roi_dist['min']),
            ('최대 ROI (%)', roi_dist['max']),
            ('평균 ROI (%)', roi_dist['mean']),
            ('중앙값 ROI (%)', roi_dist['median']),
        ])
        
        for i, p in enumerate(roi_dist['percentiles']):
            summary_data.append((f'{p}% 백분위 ROI', roi_dist['percentile_values'][i]))
        
        # Convert to DataFrame and write to Excel
        df_summary = pd.DataFrame(summary_data, columns=['항목', '값'])
        df_summary.to_excel(writer, sheet_name='요약', index=False)
        
        # Sheet 4: Internal Round Distribution
        round_dist = results.get_investor_distribution_by_round()
        
        # Prepare data for the sheet
        dist_data = []
        for company_round, internal_dist in round_dist.items():
            for internal_round, count in internal_dist.items():
                dist_data.append({
                    '회사 회차': company_round,
                    '내부 회차': internal_round,
                    '투자자 수': count
                })
        
        df_dist = pd.DataFrame(dist_data)
        df_dist.to_excel(writer, sheet_name='내부_회차_분포', index=False)
    
    logger.info(f"Simulation results exported to {output_file}")
    return output_file
