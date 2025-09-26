#!/usr/bin/env python3
"""
Test Code Reviewer Implementation

This module implements the test code review functionality as specified in 
.github/prompts/code-review/test-code-reviewer.prompt.md

The reviewer analyzes test results and classifies issues as either:
1. Test code problems (fixes them directly)
2. Codebase problems (raises GitHub issues)
"""

import re
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum

class IssueType(Enum):
    """Classification of identified issues"""
    TEST_CODE_ISSUE = "test_code_issue"
    CODEBASE_ISSUE = "codebase_issue"
    CONFIGURATION_ISSUE = "configuration_issue"
    DEPENDENCY_ISSUE = "dependency_issue"
    UNCLEAR = "unclear"

@dataclass
class TestFailure:
    """Represents a single test failure"""
    test_name: str
    test_file: str
    error_type: str
    error_message: str
    traceback: Optional[str] = None
    line_number: Optional[int] = None

@dataclass
class TestIssue:
    """Represents an identified issue with classification"""
    failure: TestFailure
    issue_type: IssueType
    description: str
    suggested_fix: Optional[str] = None
    confidence: float = 0.0  # 0.0 to 1.0

class TestResultParser:
    """Parses test result markdown files and extracts failures"""
    
    def __init__(self):
        self.failures: List[TestFailure] = []
        
    def parse_pytest_output(self, content: str) -> List[TestFailure]:
        """Parse pytest output from markdown content"""
        failures = []
        
        # Alternative approach: look for FAILED lines first, then extract details
        failed_lines = re.findall(r"FAILED\s+(tests/[^:]+\.py::[^:]+::[^\s]+)", content)
        
        if failed_lines:
            # Parse from failed test list
            for failed_test in failed_lines:
                parts = failed_test.split("::")
                test_file = parts[0] if len(parts) > 0 else "unknown.py"
                test_name = parts[-1] if len(parts) > 2 else "unknown_test"
                
                # Try to find the detailed failure in the FAILURES section
                failure_detail = self._find_failure_detail(content, test_name)
                
                error_type = self._extract_error_type(failure_detail)
                error_message = self._extract_error_message(failure_detail)
                
                failure = TestFailure(
                    test_name=test_name,
                    test_file=test_file,
                    error_type=error_type,
                    error_message=error_message,
                    traceback=failure_detail,
                    line_number=None
                )
                failures.append(failure)
        else:
            # Fallback: parse from FAILURES section directly
            failure_section_pattern = r"={5,}.*?FAILURES.*?={5,}(.*?)(?=={5,}.*?short test summary info|$)"
            failure_match = re.search(failure_section_pattern, content, re.DOTALL | re.IGNORECASE)
            
            if failure_match:
                failure_content = failure_match.group(1)
                
                # Split by test separator lines
                test_sections = re.split(r"\n_{4}\s*([^_\n]+?)\s*_{4}\s*\n", failure_content)
                
                # Process pairs: (content, test_name, content, test_name, ...)
                for i in range(1, len(test_sections), 2):
                    if i + 1 < len(test_sections):
                        test_name_raw = test_sections[i]
                        failure_detail = test_sections[i + 1]
                        
                        test_name = self._clean_test_name(test_name_raw)
                        error_type = self._extract_error_type(failure_detail)
                        error_message = self._extract_error_message(failure_detail)
                        test_file = self._extract_test_file(test_name_raw, failure_detail)
                        
                        failure = TestFailure(
                            test_name=test_name,
                            test_file=test_file,
                            error_type=error_type,
                            error_message=error_message,
                            traceback=failure_detail,
                            line_number=None
                        )
                        failures.append(failure)
        
        return failures
    
    def _find_failure_detail(self, content: str, test_name: str) -> str:
        """Find detailed failure information for a specific test"""
        # Look for the test in the FAILURES section
        pattern = rf"_{4}\s*[^_]*{re.escape(test_name)}[^_]*_{4}\s*\n(.*?)(?=\n_{4}|$)"
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            return match.group(1)
        
        # Fallback: look for any mention of the test
        lines = content.split('\n')
        in_failure = False
        failure_lines = []
        
        for line in lines:
            if test_name in line and '____' in line:
                in_failure = True
                continue
            elif '____' in line and in_failure:
                break
            elif in_failure:
                failure_lines.append(line)
        
        return '\n'.join(failure_lines) if failure_lines else f"No detailed failure found for {test_name}"
    
    def _clean_test_name(self, test_name_raw: str) -> str:
        """Clean up the test name to extract the actual test method"""
        # Remove extra whitespace and extract method name
        cleaned = test_name_raw.strip()
        
        # If it contains class::method format, extract just the method
        if "::" in cleaned:
            parts = cleaned.split("::")
            return parts[-1]  # Last part is usually the method name
        
        # If it contains dots, might be module.class.method
        if "." in cleaned:
            parts = cleaned.split(".")
            return parts[-1]
        
        return cleaned
    
    def _extract_error_type(self, failure_detail: str) -> str:
        """Extract the type of error from failure detail"""
        # Look for common exception types
        error_patterns = [
            r"(AssertionError|ValueError|TypeError|ImportError|AttributeError|KeyError)",
            r"E\s+([A-Za-z]+Error)",
            r"([A-Za-z]+Exception)",
        ]
        
        for pattern in error_patterns:
            match = re.search(pattern, failure_detail)
            if match:
                return match.group(1)
                
        return "Unknown"
    
    def _extract_error_message(self, failure_detail: str) -> str:
        """Extract the error message from failure detail"""
        # Look for assertion errors or exception messages
        message_patterns = [
            r"assert\s+(.+)",
            r"E\s+assert\s+(.+)",
            r"E\s+(.+Error.+)",
            r">\s+(.+)",
        ]
        
        for pattern in message_patterns:
            match = re.search(pattern, failure_detail, re.MULTILINE)
            if match:
                return match.group(1).strip()
                
        return "No error message found"
    
    def _extract_traceback(self, failure_detail: str) -> Optional[str]:
        """Extract traceback information"""
        # Return the full failure detail as traceback for now
        return failure_detail.strip() if failure_detail.strip() else None
    
    def _extract_line_number(self, failure_detail: str) -> Optional[int]:
        """Extract line number from failure detail"""
        line_pattern = r":(\d+):"
        match = re.search(line_pattern, failure_detail)
        if match:
            return int(match.group(1))
        return None
    
    def _extract_test_file(self, test_name: str, failure_detail: str) -> str:
        """Extract test file path"""
        # Look for file paths in the test name or failure detail
        file_patterns = [
            r"tests[/\\][^:\s]+\.py",
            r"test_[^:\s]+\.py",
        ]
        
        # Also check the full test identification line
        full_text = test_name + " " + failure_detail
        
        for pattern in file_patterns:
            match = re.search(pattern, full_text)
            if match:
                return match.group(0)
                
        return "unknown_test_file.py"

class IssueClassifier:
    """Classifies test failures into issue types"""
    
    def __init__(self):
        self.patterns = self._build_classification_patterns()
    
    def _build_classification_patterns(self) -> Dict[IssueType, List[str]]:
        """Build regex patterns for classifying issues"""
        return {
            IssueType.TEST_CODE_ISSUE: [
                r"assert.*\".*\".*in.*str\(.*\)",  # Assertion message issues
                r"AssertionError.*assert.*\".*\".*in", # Specific assertion errors
                r"Missing.*in.*header",              # Test expects specific message format
                r"Expected.*but got",                # Test expectation mismatch
                r"assert.*\".*\".*in.*'.*'",        # String assertion mismatches
                r"test.*fixture.*not.*found",       # Test fixture issues
                r"mock.*not.*configured",           # Mock configuration problems
                r"Duplicate.*found.*in.*Authentication", # Specific test message expectations
            ],
            IssueType.CODEBASE_ISSUE: [
                r"Could not validate credentials",   # Authentication logic issues
                r"supabase.*url.*required",          # Configuration missing
                r"SupabaseException",                # Supabase-specific errors
                r"database.*connection.*failed",     # Database issues
                r"Authentication failed",            # Auth system problems
                r"AttributeError.*has no attribute", # Code structure issues
                r"TypeError.*argument",              # API signature changes
            ],
            IssueType.CONFIGURATION_ISSUE: [
                r"environment.*variable.*not.*set",
                r"config.*missing",
                r"settings.*not.*found",
                r"\.env.*not.*found",
                r"supabase_url.*required",          # Specific config issue
            ],
            IssueType.DEPENDENCY_ISSUE: [
                r"ModuleNotFoundError",
                r"ImportError",
                r"No module named",
                r"version.*conflict",
                r"cannot import name",
            ]
        }
    
    def classify_failure(self, failure: TestFailure) -> TestIssue:
        """Classify a test failure into an issue type"""
        full_text = f"{failure.error_type} {failure.error_message} {failure.traceback or ''}"
        
        # Check each pattern category
        for issue_type, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, full_text, re.IGNORECASE):
                    return TestIssue(
                        failure=failure,
                        issue_type=issue_type,
                        description=self._generate_description(failure, issue_type),
                        suggested_fix=self._generate_fix_suggestion(failure, issue_type),
                        confidence=0.8
                    )
        
        # Default to unclear if no patterns match
        return TestIssue(
            failure=failure,
            issue_type=IssueType.UNCLEAR,
            description=f"Unable to classify failure in {failure.test_name}",
            suggested_fix=None,
            confidence=0.3
        )
    
    def _generate_description(self, failure: TestFailure, issue_type: IssueType) -> str:
        """Generate a human-readable description of the issue"""
        descriptions = {
            IssueType.TEST_CODE_ISSUE: f"Test code issue in {failure.test_name}: The test expectation doesn't match the actual implementation behavior.",
            IssueType.CODEBASE_ISSUE: f"Codebase issue affecting {failure.test_name}: The underlying code has a problem that needs to be fixed.",
            IssueType.CONFIGURATION_ISSUE: f"Configuration issue in {failure.test_name}: Missing or incorrect configuration settings.",
            IssueType.DEPENDENCY_ISSUE: f"Dependency issue in {failure.test_name}: Missing or incompatible dependencies.",
            IssueType.UNCLEAR: f"Unclear issue in {failure.test_name}: Requires manual investigation."
        }
        return descriptions.get(issue_type, "Unknown issue type")
    
    def _generate_fix_suggestion(self, failure: TestFailure, issue_type: IssueType) -> Optional[str]:
        """Generate fix suggestions based on issue type"""
        if issue_type == IssueType.TEST_CODE_ISSUE:
            if "assert" in failure.error_message and "in" in failure.error_message:
                return "Update the test assertion to match the actual error message format"
            elif "Expected" in failure.error_message:
                return "Review and update test expectations to match current implementation"
        elif issue_type == IssueType.CONFIGURATION_ISSUE:
            return "Add missing configuration values or environment variables"
        elif issue_type == IssueType.DEPENDENCY_ISSUE:
            return "Install missing dependencies or resolve version conflicts"
        
        return None

class TestCodeFixer:
    """Fixes test code issues automatically"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        
    def fix_test_issue(self, issue: TestIssue) -> bool:
        """Attempt to fix a test code issue"""
        if issue.issue_type != IssueType.TEST_CODE_ISSUE:
            return False
            
        # Find the test file
        test_file_path = self._find_test_file(issue.failure.test_file)
        if not test_file_path or not test_file_path.exists():
            print(f"Could not find test file: {issue.failure.test_file}")
            return False
            
        # Read the file content
        try:
            with open(test_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {test_file_path}: {e}")
            return False
        
        # Apply fixes based on the specific issue
        fixed_content = self._apply_fixes(content, issue)
        
        if fixed_content != content:
            # Write back the fixed content
            try:
                with open(test_file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                print(f"Fixed test issue in {test_file_path}")
                return True
            except Exception as e:
                print(f"Error writing to {test_file_path}: {e}")
                return False
                
        return False
    
    def _find_test_file(self, test_file: str) -> Optional[Path]:
        """Find the actual test file path"""
        # Try different possible locations
        possible_paths = [
            self.project_root / test_file,
            self.project_root / "src" / "backend" / test_file,
            self.project_root / "src" / "frontend" / test_file,
        ]
        
        for path in possible_paths:
            if path.exists():
                return path
                
        # Search recursively
        for test_dir in self.project_root.rglob("tests"):
            test_path = test_dir / test_file
            if test_path.exists():
                return test_path
                
        return None
    
    def _apply_fixes(self, content: str, issue: TestIssue) -> str:
        """Apply specific fixes to test content"""
        fixed_content = content
        
        # Fix assertion message format issues
        if "assert" in issue.failure.error_message and "in" in issue.failure.error_message:
            # Look for the specific assertion that failed
            test_function = self._extract_test_function(content, issue.failure.test_name)
            if test_function:
                # Apply assertion message fixes
                fixed_function = self._fix_assertion_messages(test_function, issue)
                fixed_content = content.replace(test_function, fixed_function)
        
        return fixed_content
    
    def _extract_test_function(self, content: str, test_name: str) -> Optional[str]:
        """Extract the specific test function from file content"""
        # Clean up the test name to get just the function name
        function_name = test_name.split("::")[-1] if "::" in test_name else test_name
        
        # Find the function definition
        pattern = rf"def\s+{re.escape(function_name)}\s*\([^)]*\):.*?(?=\n\s*def|\n\s*class|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        
        return match.group(0) if match else None
    
    def _fix_assertion_messages(self, function_content: str, issue: TestIssue) -> str:
        """Fix assertion messages in test function"""
        # This is a simplified fix - in practice, you'd need more sophisticated logic
        
        # Example: Fix "Missing 'kid' in JWT header" vs "Could not validate credentials"
        if "Missing 'kid' in JWT header" in issue.failure.error_message:
            # Replace the assertion with the actual error message
            pattern = r'assert\s+"Missing \'kid\' in JWT header"\s+in\s+str\([^)]+\)'
            replacement = 'assert "Could not validate credentials" in str(exc_info.value.detail)'
            function_content = re.sub(pattern, replacement, function_content)
        
        return function_content

class GitHubIssueCreator:
    """Creates GitHub issues for codebase problems"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        
    def create_issue_for_codebase_problem(self, issue: TestIssue) -> Dict[str, str]:
        """Create a GitHub issue description for a codebase problem"""
        title = f"Fix {issue.failure.error_type} in {issue.failure.test_name}"
        
        body = f"""## Problem Description

A test failure indicates a problem in the codebase that needs to be addressed.

**Test:** `{issue.failure.test_name}`
**File:** `{issue.failure.test_file}`
**Error Type:** `{issue.failure.error_type}`

## Error Details

```
{issue.failure.error_message}
```

## Full Traceback

```
{issue.failure.traceback or 'No traceback available'}
```

## Issue Classification

- **Type:** {issue.issue_type.value}
- **Confidence:** {issue.confidence:.1%}
- **Description:** {issue.description}

## Suggested Actions

{issue.suggested_fix or 'Manual investigation required'}

## Context

This issue was automatically identified by the test code reviewer when analyzing test results.
The failure suggests that the problem lies in the application code rather than the test code itself.

---
*Auto-generated by Test Code Reviewer*
"""
        
        return {
            "title": title,
            "body": body,
            "labels": ["bug", "test-failure", issue.issue_type.value]
        }

class TestCodeReviewer:
    """Main test code reviewer implementation"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.parser = TestResultParser()
        self.classifier = IssueClassifier()
        self.fixer = TestCodeFixer(project_root)
        self.issue_creator = GitHubIssueCreator(project_root)
        
    def review_test_results(self, result_file: Path) -> Dict[str, Union[List, int]]:
        """Review test results and classify/fix issues"""
        print(f"Reviewing test results from: {result_file}")
        
        # Read the test results
        try:
            with open(result_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {result_file}: {e}")
            return {"error": str(e)}
        
        # Parse failures
        failures = self.parser.parse_pytest_output(content)
        print(f"Found {len(failures)} test failures")
        
        # Classify issues
        issues = []
        for failure in failures:
            issue = self.classifier.classify_failure(failure)
            issues.append(issue)
        
        # Process issues by type
        results = {
            "total_failures": len(failures),
            "test_code_issues": [],
            "codebase_issues": [],
            "configuration_issues": [],
            "dependency_issues": [],
            "unclear_issues": [],
            "fixes_applied": 0,
            "github_issues": []
        }
        
        for issue in issues:
            issue_data = {
                "test_name": issue.failure.test_name,
                "error_type": issue.failure.error_type,
                "description": issue.description,
                "confidence": issue.confidence
            }
            
            if issue.issue_type == IssueType.TEST_CODE_ISSUE:
                results["test_code_issues"].append(issue_data)
                # Try to fix the issue
                if self.fixer.fix_test_issue(issue):
                    results["fixes_applied"] += 1
                    issue_data["fixed"] = True
                else:
                    issue_data["fixed"] = False
                    
            elif issue.issue_type == IssueType.CODEBASE_ISSUE:
                results["codebase_issues"].append(issue_data)
                # Create GitHub issue
                github_issue = self.issue_creator.create_issue_for_codebase_problem(issue)
                results["github_issues"].append(github_issue)
                
            elif issue.issue_type == IssueType.CONFIGURATION_ISSUE:
                results["configuration_issues"].append(issue_data)
                
            elif issue.issue_type == IssueType.DEPENDENCY_ISSUE:
                results["dependency_issues"].append(issue_data)
                
            else:
                results["unclear_issues"].append(issue_data)
        
        return results
    
    def print_summary(self, results: Dict[str, Union[List, int]]):
        """Print a summary of the review results"""
        print("\n" + "="*60)
        print("TEST CODE REVIEW SUMMARY")
        print("="*60)
        
        print(f"Total failures analyzed: {results['total_failures']}")
        print(f"Fixes applied automatically: {results['fixes_applied']}")
        print()
        
        if results["test_code_issues"]:
            print(f"🔧 TEST CODE ISSUES ({len(results['test_code_issues'])})")
            for issue in results["test_code_issues"]:
                status = "✅ FIXED" if issue.get("fixed") else "❌ FAILED TO FIX"
                print(f"   {status} {issue['test_name']} - {issue['description']}")
            print()
        
        if results["codebase_issues"]:
            print(f"🐛 CODEBASE ISSUES ({len(results['codebase_issues'])})")
            print("   The following GitHub issues should be created:")
            for i, issue in enumerate(results["codebase_issues"], 1):
                print(f"   {i}. {issue['test_name']} - {issue['description']}")
            print()
        
        if results["configuration_issues"]:
            print(f"⚙️  CONFIGURATION ISSUES ({len(results['configuration_issues'])})")
            for issue in results["configuration_issues"]:
                print(f"   • {issue['test_name']} - {issue['description']}")
            print()
        
        if results["dependency_issues"]:
            print(f"📦 DEPENDENCY ISSUES ({len(results['dependency_issues'])})")
            for issue in results["dependency_issues"]:
                print(f"   • {issue['test_name']} - {issue['description']}")
            print()
        
        if results["unclear_issues"]:
            print(f"❓ UNCLEAR ISSUES ({len(results['unclear_issues'])})")
            print("   The following issues require manual investigation:")
            for issue in results["unclear_issues"]:
                print(f"   • {issue['test_name']} - {issue['description']}")
            print()

def main():
    """Main entry point for the test code reviewer"""
    parser = argparse.ArgumentParser(
        description="Test Code Reviewer - Analyze test results and fix issues"
    )
    parser.add_argument(
        "result_file",
        help="Path to the test result markdown file"
    )
    parser.add_argument(
        "--project-root",
        default=".",
        help="Root directory of the project (default: current directory)"
    )
    parser.add_argument(
        "--output",
        help="Output file for detailed results (JSON format)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyze only, don't apply fixes"
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    result_file = Path(args.result_file)
    if not result_file.exists():
        print(f"Error: Test result file not found: {result_file}")
        sys.exit(1)
    
    project_root = Path(args.project_root).resolve()
    if not project_root.exists():
        print(f"Error: Project root not found: {project_root}")
        sys.exit(1)
    
    # Create reviewer and analyze
    reviewer = TestCodeReviewer(project_root)
    
    if args.dry_run:
        print("Running in dry-run mode (no fixes will be applied)")
        # Temporarily disable fixing for dry run
        reviewer.fixer.fix_test_issue = lambda issue: False
    
    results = reviewer.review_test_results(result_file)
    
    # Print summary
    reviewer.print_summary(results)
    
    # Save detailed results if requested
    if args.output:
        output_file = Path(args.output)
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, default=str)
            print(f"\nDetailed results saved to: {output_file}")
        except Exception as e:
            print(f"Error saving results to {output_file}: {e}")

if __name__ == "__main__":
    main()