#!/usr/bin/env python3
"""
Test script for multi-plan simulation functionality.

This script demonstrates the enhanced simulation capabilities
without requiring user input.
"""

import sys
import os

# Add the src/python directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'python'))

from init import run_simulation, run_multi_plan_simulation, list_available_plans
from utils.reporting import print_multi_plan_summary, export_multi_plan_to_excel


def test_single_plan():
    """Test single plan simulation."""
    print("=== Testing Single Plan Simulation ===")
    try:
        results = run_simulation("A", 10)
        print(f"✓ Single plan simulation successful for Plan A with {len(results.history)} rounds")
        summary = results.get_summary()
        print(f"✓ Final profit: {summary['final_net_profit']:,.0f}")
    except Exception as e:
        print(f"✗ Single plan simulation failed: {e}")


def test_multi_plan():
    """Test multi-plan simulation."""
    print("\n=== Testing Multi-Plan Simulation ===")
    try:
        # Test with a subset of plans
        test_plans = ["A", "B", "C"]
        multi_results = run_multi_plan_simulation(test_plans, 10)
        print(f"✓ Multi-plan simulation successful for plans {test_plans}")
        
        # Test comprehensive summary
        comprehensive = multi_results.get_comprehensive_summary()
        print(f"✓ Comprehensive summary generated for {comprehensive['total_plans_simulated']} plans")
        
        # Test comparative dataframe
        comparison_df = multi_results.to_comparative_dataframe()
        print(f"✓ Comparative dataframe created with {len(comparison_df)} rows")
        
        return multi_results
    except Exception as e:
        print(f"✗ Multi-plan simulation failed: {e}")
        return None


def test_reporting(multi_results):
    """Test reporting functionality."""
    print("\n=== Testing Reporting Functionality ===")
    try:
        # Test console reporting
        print("✓ Testing console reporting...")
        print_multi_plan_summary(multi_results, show_individual=False)
        
        # Test Excel export
        try:
            export_multi_plan_to_excel(multi_results, "test_results.xlsx")
            print("✓ Excel export successful")
            
            # Clean up test file
            if os.path.exists("test_results.xlsx"):
                os.remove("test_results.xlsx")
                print("✓ Test file cleaned up")
        except Exception as e:
            print(f"⚠ Excel export failed (may need openpyxl): {e}")
            
    except Exception as e:
        print(f"✗ Reporting test failed: {e}")


def test_plan_listing():
    """Test plan listing functionality."""
    print("\n=== Testing Plan Listing ===")
    try:
        plans = list_available_plans()
        print(f"✓ Available plans: {', '.join(plans)}")
        print(f"✓ Found {len(plans)} plans")
    except Exception as e:
        print(f"✗ Plan listing failed: {e}")


def main():
    """Run all tests."""
    print("Partner Club Multi-Plan Simulation Test")
    print("=" * 50)
    
    # Test plan listing
    test_plan_listing()
    
    # Test single plan
    test_single_plan()
    
    # Test multi-plan
    multi_results = test_multi_plan()
    
    # Test reporting if multi-plan worked
    if multi_results:
        test_reporting(multi_results)
    
    print("\n" + "=" * 50)
    print("Test completed!")


if __name__ == "__main__":
    main()
