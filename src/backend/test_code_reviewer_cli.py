#!/usr/bin/env python3
"""
Test Code Reviewer CLI

Command-line interface for the test code reviewer that implements
the functionality specified in .github/prompts/code-review/test-code-reviewer.prompt.md

Usage:
    python test_code_reviewer_cli.py <test_result_file> [options]

Example:
    python test_code_reviewer_cli.py test_results.md --dry-run
    python test_code_reviewer_cli.py test_results.md --output analysis.json
"""

import sys
from pathlib import Path
from test_code_reviewer import TestCodeReviewer, main

if __name__ == "__main__":
    # Add the current directory to Python path for imports
    sys.path.insert(0, str(Path(__file__).parent))
    
    # Run the main function
    main()