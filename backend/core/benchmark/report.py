"""
Report Generators

Generates JSON and Markdown reports from benchmark results.
Also tracks best historical run.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from .metrics import BenchmarkReport, TestResult


class ReportGenerator:
    """Generates benchmark reports in multiple formats"""
    
    @staticmethod
    def generate_json_report(
        report: BenchmarkReport,
        output_path: str
    ):
        """
        Generate JSON report file.
        
        Args:
            report: Benchmark report data
            output_path: Path to save JSON file
        """
        # Convert to dict
        report_dict = report.to_dict()
        
        # Write to file
        with open(output_path, 'w') as f:
            json.dump(report_dict, f, indent=2)
        
        print(f"✓ JSON report saved: {output_path}")
    
    @staticmethod
    def generate_markdown_report(
        report: BenchmarkReport,
        output_path: str
    ):
        """
        Generate Markdown report file.
        
        Args:
            report: Benchmark report data
            output_path: Path to save markdown file
        """
        # Build markdown content
        md = ReportGenerator._build_markdown(report)
        
        # Write to file
        with open(output_path, 'w') as f:
            f.write(md)
        
        print(f"✓ Markdown report saved: {output_path}")
    
    @staticmethod
    def _build_markdown(report: BenchmarkReport) -> str:
        """Build markdown report content"""
        
        md = f"""# Suna Agent Benchmark Report

**Generated:** {report.timestamp.strftime('%Y-%m-%d %H:%M:%S')}  
**Suite Score:** {report.suite_score:.1f} / 100 {'⭐' * (int(report.suite_score / 20))}

## Executive Summary

- **Total Tests:** {report.total_tests}
- **Passed:** {report.passed} ({(report.passed / report.total_tests * 100) if report.total_tests > 0 else 0:.1f}%)
- **Failed:** {report.failed} ({(report.failed / report.total_tests * 100) if report.total_tests > 0 else 0:.1f}%)
- **Errors:** {report.errors}
- **Total Time:** {report.total_time:.1f}s
- **Avg Time per Test:** {report.avg_test_time:.1f}s
- **Total Cost:** ${report.total_cost:.4f}

## Configuration

"""
        
        # Add config details
        for key, value in report.config.items():
            md += f"- **{key}:** {value}\n"
        
        # Model breakdown
        md += "\n## Model Performance\n\n"
        
        basic_tests = [r for r in report.results if r.model == 'kortix/basic']
        power_tests = [r for r in report.results if r.model == 'kortix/power']
        http_tests = [r for r in report.results if r.model == 'http']
        
        md += "| Model | Tests | Avg Score | Pass Rate | Avg Time | Total Cost |\n"
        md += "|-------|-------|-----------|-----------|----------|------------|\n"
        
        for model_name, tests in [
            ('kortix/basic', basic_tests),
            ('kortix/power', power_tests),
            ('http', http_tests)
        ]:
            if tests:
                avg_score = sum(t.test_score for t in tests) / len(tests)
                pass_rate = sum(1 for t in tests if t.verdict == 'PASS') / len(tests) * 100
                avg_time = sum(t.metrics.total_time_seconds for t in tests) / len(tests)
                total_cost = sum(t.metrics.total_cost for t in tests)
                
                md += f"| {model_name} | {len(tests)} | {avg_score:.1f} | {pass_rate:.0f}% | {avg_time:.1f}s | ${total_cost:.4f} |\n"
        
        # Top performers
        md += "\n## Top Performers\n\n"
        
        sorted_results = sorted(report.results, key=lambda r: r.test_score, reverse=True)
        top_5 = sorted_results[:5]
        
        for i, result in enumerate(top_5, 1):
            status = "✓" if result.verdict == "PASS" else "✗"
            md += f"{i}. {status} **Test #{result.test_id}: {result.test_name}** - {result.test_score:.1f} ({result.model})\n"
        
        # Failed tests
        failed = [r for r in report.results if r.verdict == 'FAIL' or r.verdict == 'ERROR']
        if failed:
            md += "\n## Failed Tests\n\n"
            
            for result in failed:
                md += f"### ✗ Test #{result.test_id}: {result.test_name}\n\n"
                md += f"- **Model:** {result.model}\n"
                md += f"- **Score:** {result.test_score:.1f}\n"
                md += f"- **Time:** {result.metrics.total_time_seconds:.1f}s\n"
                md += f"- **Finish Reason:** {result.metrics.finish_reason}\n"
                
                if result.critical_issues:
                    md += "\n**Issues:**\n\n"
                    for issue in result.critical_issues:
                        md += f"- {issue}\n"
                
                if result.suggested_fix:
                    md += f"\n**Suggested Fix:** {result.suggested_fix}\n"
                
                md += "\n"
        
        # Detailed results
        md += "\n## Detailed Results\n\n"
        
        # Group by category
        categories = {}
        for result in report.results:
            if result.category not in categories:
                categories[result.category] = []
            categories[result.category].append(result)
        
        for category, results in sorted(categories.items()):
            md += f"\n### {category.title()}\n\n"
            
            for result in sorted(results, key=lambda r: r.test_id):
                status = "✓" if result.verdict == "PASS" else "✗"
                md += f"**{status} Test #{result.test_id}: {result.test_name}** ({result.model})\n\n"
                md += f"- **Score:** {result.test_score:.1f}\n"
                md += f"- **Time:** {result.metrics.total_time_seconds:.1f}s"
                
                if result.metrics.time_to_first_token:
                    md += f" (TTFT: {result.metrics.time_to_first_token:.2f}s)"
                
                md += "\n"
                md += f"- **Tool Calls:** {len(result.metrics.tool_calls)} (failures: {result.metrics.tool_failures})\n"
                md += f"- **Tokens:** {result.metrics.total_tokens:,} (cache hits: {result.metrics.cache_read_tokens:,})\n"
                md += f"- **Cost:** ${result.metrics.total_cost:.6f}\n"
                
                if result.highlights:
                    md += "\n**Highlights:**\n"
                    for highlight in result.highlights[:3]:
                        md += f"- {highlight}\n"
                
                md += "\n"
        
        # Footer
        md += "\n---\n\n"
        md += "*Report generated by Suna Agent Benchmark Suite*\n"
        
        return md
    
    @staticmethod
    def print_summary(report: BenchmarkReport):
        """
        Print a concise summary to console.
        
        Args:
            report: Benchmark report data
        """
        print("\n" + "="*70)
        print("  BENCHMARK SUITE COMPLETE")
        print("="*70)
        print(f"\n  Suite Score: {report.suite_score:.1f} / 100")
        print(f"  Tests: {report.passed}/{report.total_tests} passed ({(report.passed / report.total_tests * 100) if report.total_tests > 0 else 0:.0f}%)")
        print(f"  Time: {report.total_time:.1f}s")
        print(f"  Cost: ${report.total_cost:.4f}")
        print("\n" + "="*70)
        
        # Show failed tests
        failed = [r for r in report.results if r.verdict != 'PASS']
        if failed:
            print(f"\n  Failed Tests ({len(failed)}):")
            for result in failed:
                print(f"    ✗ #{result.test_id}: {result.test_name} - {result.test_score:.1f}")
        
        print()


def load_best_run(best_run_path: str = "benchmark_best.json") -> Optional[Dict[str, Any]]:
    """
    Load the best historical run.
    
    Args:
        best_run_path: Path to best run file
    
    Returns:
        Best run data or None if doesn't exist
    """
    if not os.path.exists(best_run_path):
        return None
    
    try:
        with open(best_run_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load best run: {e}")
        return None


def save_best_run(report: BenchmarkReport, best_run_path: str = "benchmark_best.json"):
    """
    Save this run as the best run if it's better than the previous best.
    
    Only saves if:
    - No previous best exists, OR
    - Current suite score is better than previous best
    
    Args:
        report: Current benchmark report
        best_run_path: Path to save best run
    """
    current_score = report.suite_score
    
    # Load previous best
    prev_best = load_best_run(best_run_path)
    
    should_save = False
    
    if prev_best is None:
        print(f"\n🎯 First run! Saving as best (score: {current_score:.1f})")
        should_save = True
    else:
        prev_score = prev_best.get('suite_score', 0)
        if current_score > prev_score:
            improvement = current_score - prev_score
            print(f"\n🎉 NEW BEST! Score: {current_score:.1f} (previous: {prev_score:.1f}, +{improvement:.1f})")
            should_save = True
        else:
            decline = prev_score - current_score
            print(f"\n📊 Not better than best. Score: {current_score:.1f} (best: {prev_score:.1f}, -{decline:.1f})")
    
    if should_save:
        best_data = report.to_dict()
        with open(best_run_path, 'w') as f:
            json.dump(best_data, f, indent=2)
        print(f"✓ Saved as best run: {best_run_path}")


def generate_reports(
    report: BenchmarkReport,
    output_dir: str = ".",
    formats: List[str] = ["json", "markdown"]
):
    """
    Generate benchmark reports in specified formats.
    Also updates best run if this run is better.
    
    Args:
        report: Benchmark report data
        output_dir: Directory to save reports
        formats: List of formats to generate (json, markdown)
    """
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Generate timestamp for filenames
    timestamp = report.timestamp.strftime('%Y%m%d_%H%M%S')
    
    generator = ReportGenerator()
    
    # Generate requested formats
    if "json" in formats:
        json_path = f"{output_dir}/benchmark_results_{timestamp}.json"
        generator.generate_json_report(report, json_path)
    
    if "markdown" in formats:
        md_path = f"{output_dir}/benchmark_report_{timestamp}.md"
        generator.generate_markdown_report(report, md_path)
    
    # Check and save best run
    best_run_path = f"{output_dir}/benchmark_best.json"
    save_best_run(report, best_run_path)
    
    # Print summary
    generator.print_summary(report)

