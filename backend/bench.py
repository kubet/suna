#!/usr/bin/env python3
"""
Suna Agent Benchmark Suite

A comprehensive benchmarking system to measure agent performance across
diverse test scenarios with quality scoring and performance metrics.

Usage:
    uv run bench.py                          # Run full suite
    uv run bench.py --tests 1,3,5            # Run specific tests
    uv run bench.py --concurrency 10         # High parallelism
    uv run bench.py --model basic            # Only basic model tests
    uv run bench.py --output json            # JSON output only
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from core.benchmark.orchestrator import BenchmarkOrchestrator, BenchmarkConfig
from core.benchmark.test_cases import TEST_CASES
from core.benchmark.report import generate_reports
from core.utils.logger import logger
from core import core_utils
from core.services.supabase import DBConnection


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Suna Agent Benchmark Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run bench.py                      # Run full suite with default settings
  uv run bench.py --concurrency 10     # Run with 10 parallel tests
  uv run bench.py --tests 1,3,5,7      # Run specific tests only
  uv run bench.py --model basic        # Only run kortix/basic tests
  uv run bench.py --model power        # Only run kortix/power tests
  uv run bench.py --output json        # Generate JSON report only
  uv run bench.py --output markdown    # Generate Markdown report only
        """
    )
    
    parser.add_argument(
        '--concurrency', '-c',
        type=int,
        default=5,
        help='Number of concurrent tests to run (default: 5)'
    )
    
    parser.add_argument(
        '--tests', '-t',
        type=str,
        help='Comma-separated list of test IDs to run (e.g., "1,3,5,7")'
    )
    
    parser.add_argument(
        '--model', '-m',
        choices=['basic', 'power', 'both'],
        default='both',
        help='Which model tests to run (default: both)'
    )
    
    parser.add_argument(
        '--output', '-o',
        choices=['json', 'markdown', 'both'],
        default='both',
        help='Output format(s) (default: both)'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='.',
        help='Directory for output files (default: current directory)'
    )
    
    parser.add_argument(
        '--judge-model',
        type=str,
        default='kortix/power',
        help='Model to use for LLM judge (default: kortix/power)'
    )
    
    parser.add_argument(
        '--account-id',
        type=str,
        help='Use specific account ID for tests (must be valid UUID, creates new if not provided)'
    )
    
    parser.add_argument(
        '--list-tests',
        action='store_true',
        help='List all available tests and exit'
    )
    
    return parser.parse_args()


def list_tests():
    """List all available tests"""
    print("\n" + "="*70)
    print("  AVAILABLE BENCHMARK TESTS")
    print("="*70 + "\n")
    
    by_category = {}
    for test in TEST_CASES:
        if test.category not in by_category:
            by_category[test.category] = []
        by_category[test.category].append(test)
    
    for category, tests in sorted(by_category.items()):
        print(f"\n{category.upper()}")
        print("-" * 70)
        
        for test in sorted(tests, key=lambda t: t.id):
            model = test.get_model() if test.runner == "direct" else "http"
            print(f"  [{test.id:2d}] {test.name:<35} ({model})")
            print(f"       {test.prompt[:80]}...")
    
    print("\n" + "="*70)
    print(f"  Total: {len(TEST_CASES)} tests")
    print("="*70 + "\n")


async def main():
    """Main entry point"""
    args = parse_args()
    
    # Handle --list-tests
    if args.list_tests:
        list_tests()
        return 0
    
    # Parse test IDs if provided
    test_ids = None
    if args.tests:
        try:
            test_ids = [int(x.strip()) for x in args.tests.split(',')]
            # Validate test IDs
            valid_ids = {t.id for t in TEST_CASES}
            invalid = [tid for tid in test_ids if tid not in valid_ids]
            if invalid:
                print(f"Error: Invalid test IDs: {invalid}")
                print(f"Valid IDs: {sorted(valid_ids)}")
                return 1
        except ValueError:
            print(f"Error: Invalid test ID format: {args.tests}")
            print("Use comma-separated integers, e.g., '1,3,5'")
            return 1
    
    # Determine output formats
    if args.output == 'both':
        output_formats = ['json', 'markdown']
    else:
        output_formats = [args.output]
    
    # Build config
    config = BenchmarkConfig(
        concurrency=args.concurrency,
        tests=test_ids,
        model_filter=args.model,
        output_formats=output_formats,
        judge_model=args.judge_model,
        benchmark_account_id=args.account_id
    )
    
    # Print banner
    print("\n" + "="*70)
    print("  SUNA AGENT BENCHMARK SUITE")
    print("="*70)
    print(f"\n  Configuration:")
    print(f"    Concurrency: {config.concurrency}")
    print(f"    Model Filter: {config.model_filter}")
    print(f"    Judge Model: {config.judge_model}")
    print(f"    Output Formats: {', '.join(output_formats)}")
    
    if test_ids:
        print(f"    Running Tests: {test_ids}")
    else:
        print(f"    Running Tests: All ({len(TEST_CASES)})")
    
    print("\n" + "="*70 + "\n")
    
    # Initialize database connection
    logger.info("Initializing database connection...")
    db_connection = DBConnection()
    core_utils.initialize(db_connection, f"bench-{args.concurrency}")
    logger.info("Database initialized successfully")
    
    # Run benchmark
    try:
        orchestrator = BenchmarkOrchestrator(config)
        report = await orchestrator.run_suite()
        
        # Generate reports
        print("\n")
        generate_reports(report, args.output_dir, output_formats)
        
        # Exit with appropriate code
        if report.failed > 0 or report.errors > 0:
            return 1
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\nBenchmark interrupted by user")
        return 130
    
    except Exception as e:
        logger.error(f"Benchmark failed: {e}", exc_info=True)
        print(f"\n\nError: {e}")
        return 1
    
    finally:
        # Cleanup database connection
        logger.info("Cleaning up resources...")
        await core_utils.cleanup()


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nInterrupted")
        sys.exit(130)

