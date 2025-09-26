#!/usr/bin/env python3
"""
Test Code Reviewer Example

This script demonstrates the complete workflow of the test code reviewer
as specified in .github/prompts/code-review/test-code-reviewer.prompt.md

It shows how to:
1. Run tests and capture results
2. Analyze test failures
3. Classify issues
4. Apply automatic fixes
5. Generate GitHub issues for codebase problems
"""

import sys
import subprocess
from pathlib import Path

def run_example():
    """Run the complete test code reviewer example"""
    
    print("=" * 60)
    print("TEST CODE REVIEWER EXAMPLE")
    print("=" * 60)
    print()
    
    # Step 1: Run tests and capture results
    print("Step 1: Running backend tests and capturing results...")
    backend_dir = Path("src/backend")
    
    if backend_dir.exists():
        try:
            # Run pytest and capture output
            result = subprocess.run(
                ["python", "-m", "pytest", "--tb=short", "-v"],
                cwd=backend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            # Save results to file
            with open(backend_dir / "current_test_results.md", "w") as f:
                f.write("=== PYTEST OUTPUT ===\n")
                f.write(result.stdout)
                if result.stderr:
                    f.write("\n=== STDERR ===\n")
                    f.write(result.stderr)
            
            print(f"   ✅ Test results saved to {backend_dir / 'current_test_results.md'}")
            
        except subprocess.TimeoutExpired:
            print("   ⚠️  Tests timed out, using sample results instead")
        except Exception as e:
            print(f"   ⚠️  Error running tests: {e}, using sample results instead")
    
    # Step 2: Analyze results with the test code reviewer
    print("\nStep 2: Analyzing test results...")
    
    # Use sample results if available, otherwise try current results
    result_file = backend_dir / "sample_test_results.md"
    if not result_file.exists():
        result_file = backend_dir / "current_test_results.md"
    
    if result_file.exists():
        try:
            # Import and run the reviewer
            sys.path.insert(0, str(backend_dir))
            from test_code_reviewer import TestCodeReviewer
            
            reviewer = TestCodeReviewer(Path("."))
            results = reviewer.review_test_results(result_file)
            
            print("   ✅ Analysis complete!")
            
            # Step 3: Show results
            print("\nStep 3: Review Results")
            reviewer.print_summary(results)
            
            # Step 4: Save detailed results
            output_file = Path("test_analysis_example.json")
            import json
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            print(f"\nStep 4: Detailed results saved to {output_file}")
            
            # Step 5: Show what to do next
            print("\nStep 5: Next Actions")
            print("-" * 40)
            
            if results.get("fixes_applied", 0) > 0:
                print(f"🔧 {results['fixes_applied']} test code issues were automatically fixed")
                print("   → Re-run tests to verify fixes")
            
            if results.get("codebase_issues"):
                print(f"🐛 {len(results['codebase_issues'])} codebase issues need GitHub issues:")
                for i, issue in enumerate(results["codebase_issues"], 1):
                    print(f"   {i}. Create issue: '{issue['test_name']}' ({issue['error_type']})")
                
                if results.get("github_issues"):
                    print(f"\n   Issue templates generated - see detailed JSON output")
            
            if results.get("configuration_issues"):
                print(f"⚙️  {len(results['configuration_issues'])} configuration issues need attention")
            
            if results.get("dependency_issues"):
                print(f"📦 {len(results['dependency_issues'])} dependency issues need resolution")
            
            if results.get("unclear_issues"):
                print(f"❓ {len(results['unclear_issues'])} issues need manual investigation")
            
        except ImportError as e:
            print(f"   ❌ Cannot import test_code_reviewer: {e}")
            print("   Make sure you're running from the project root directory")
        except Exception as e:
            print(f"   ❌ Error during analysis: {e}")
    else:
        print(f"   ❌ No test result file found at {result_file}")
    
    print("\n" + "=" * 60)
    print("EXAMPLE COMPLETE")
    print("=" * 60)
    print("\nFor more information, see docs/test-code-reviewer.md")

if __name__ == "__main__":
    run_example()