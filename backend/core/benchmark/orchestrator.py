"""
Benchmark Orchestrator

Coordinates test execution with parallel running, model distribution,
LLM judging, and score calculation.
"""

import asyncio
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime

from core.utils.logger import logger
from .test_cases import TestCase, TEST_CASES
from .metrics import BenchmarkReport, TestResult, QualityScores
from .runners.direct_runner import DirectAgentRunner
from .runners.http_runner import HTTPAgentRunner
from .judge import LLMJudge
from .scoring import calculate_test_score, determine_verdict, calculate_suite_score
from .ui import BenchmarkUI


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark execution"""
    concurrency: int = 5
    tests: Optional[List[int]] = None  # Specific test IDs (None = all)
    model_filter: str = "both"  # "basic", "power", "both"
    output_formats: List[str] = None  # ["json", "markdown"]
    judge_model: str = "kortix/power"
    benchmark_account_id: Optional[str] = None  # Account ID for tests (UUID)
    
    def __post_init__(self):
        if self.output_formats is None:
            self.output_formats = ["json", "markdown"]


class BenchmarkOrchestrator:
    """Orchestrates benchmark test execution"""
    
    def __init__(self, config: BenchmarkConfig):
        """
        Initialize orchestrator.
        
        Args:
            config: Benchmark configuration
        """
        self.config = config
        self.direct_runner = DirectAgentRunner(
            benchmark_account_id=config.benchmark_account_id
        )
        self.http_runner = HTTPAgentRunner()
        self.judge = LLMJudge(model=config.judge_model)
        
        # Track results
        self.results: List[TestResult] = []
        self.ui: Optional[BenchmarkUI] = None
    
    async def run_suite(self, tests: Optional[List[TestCase]] = None) -> BenchmarkReport:
        """
        Run the full benchmark suite.
        
        Args:
            tests: List of test cases (defaults to TEST_CASES)
        
        Returns:
            BenchmarkReport with all results
        """
        if tests is None:
            tests = TEST_CASES
        
        # Filter tests based on config
        tests = self._filter_tests(tests)
        
        if not tests:
            raise ValueError("No tests to run after filtering")
        
        logger.info(f"Running {len(tests)} tests with concurrency {self.config.concurrency}")
        
        # Initialize runners
        await self.direct_runner.initialize()
        
        # Calculate model split for UI
        model_split = self._calculate_model_split(tests)
        
        # Initialize UI
        self.ui = BenchmarkUI(
            total_tests=len(tests),
            concurrency=self.config.concurrency,
            model_split=model_split
        )
        
        start_time = datetime.now()
        
        # Run tests
        try:
            # Execute tests in parallel
            await self._execute_tests_parallel(tests)
        
        except KeyboardInterrupt:
            logger.warning("Benchmark interrupted by user")
        
        finally:
            # Cleanup
            await self.direct_runner.cleanup()
            await self.http_runner.cleanup()
        
        end_time = datetime.now()
        
        # Calculate aggregate metrics
        total_time = (end_time - start_time).total_seconds()
        total_cost = sum(r.metrics.total_cost for r in self.results)
        avg_time = total_time / len(tests) if tests else 0
        
        # Count verdicts
        passed = sum(1 for r in self.results if r.verdict == "PASS")
        failed = sum(1 for r in self.results if r.verdict == "FAIL")
        errors = sum(1 for r in self.results if r.verdict == "ERROR")
        
        # Calculate suite score
        test_scores = [r.test_score for r in self.results if r.test_score > 0]
        suite_score = calculate_suite_score(test_scores)
        
        # Build report
        report = BenchmarkReport(
            suite_score=suite_score,
            total_tests=len(tests),
            passed=passed,
            failed=failed,
            errors=errors,
            timestamp=end_time,
            config={
                'concurrency': self.config.concurrency,
                'model_filter': self.config.model_filter,
                'judge_model': self.config.judge_model,
                'total_tests': len(tests),
            },
            results=self.results,
            total_time=total_time,
            total_cost=total_cost,
            avg_test_time=avg_time
        )
        
        return report
    
    def _filter_tests(self, tests: List[TestCase]) -> List[TestCase]:
        """Filter tests based on configuration"""
        filtered = tests
        
        # Filter by test IDs
        if self.config.tests:
            filtered = [t for t in filtered if t.id in self.config.tests]
        
        # Filter by model
        if self.config.model_filter == "basic":
            filtered = [t for t in filtered if t.get_model() == "kortix/basic"]
        elif self.config.model_filter == "power":
            filtered = [t for t in filtered if t.get_model() == "kortix/power"]
        # "both" or any other value = no filter
        
        return filtered
    
    def _calculate_model_split(self, tests: List[TestCase]) -> Dict[str, int]:
        """Calculate how many tests per model"""
        split = {}
        for test in tests:
            model = test.get_model() if test.runner == "direct" else "http"
            split[model] = split.get(model, 0) + 1
        return split
    
    async def _execute_tests_parallel(self, tests: List[TestCase]):
        """Execute tests with controlled parallelism"""
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(self.config.concurrency)
        
        # Create tasks for all tests
        tasks = []
        for test in tests:
            task = asyncio.create_task(
                self._execute_test_with_semaphore(test, semaphore)
            )
            tasks.append(task)
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _execute_test_with_semaphore(
        self,
        test: TestCase,
        semaphore: asyncio.Semaphore
    ):
        """Execute a single test with semaphore control"""
        async with semaphore:
            try:
                await self._execute_and_judge_test(test)
            except Exception as e:
                logger.error(f"Test {test.id} failed: {e}", exc_info=True)
                
                # Create error result
                from .metrics import TestMetrics
                
                error_result = TestResult(
                    test_id=test.id,
                    test_name=test.name,
                    model=test.get_model(),
                    category=test.category,
                    metrics=TestMetrics(
                        model=test.get_model(),
                        test_id=test.id,
                        test_name=test.name,
                        finish_reason="error",
                        error_message=str(e)
                    ),
                    verdict="ERROR",
                    final_answer=f"Test execution error: {str(e)}"
                )
                
                self.results.append(error_result)
                self.ui.complete_test(error_result)
                self._update_ui()
    
    async def _execute_and_judge_test(self, test: TestCase):
        """Execute a test and judge its quality"""
        # Determine model
        model = test.get_model() if test.runner == "direct" else "http"
        
        # Update UI
        self.ui.start_test(test.id, test.name, model)
        self._update_ui()
        
        # Execute test
        logger.info(f"Executing test #{test.id}: {test.name}")
        
        if test.runner == "http":
            result = await self.http_runner.run_test(test)
        else:
            result = await self.direct_runner.run_test(test, model)
        
        # Update UI for judging phase
        self.ui.mark_judging(test.id)
        self._update_ui()
        
        # Judge quality (skip for http tests with errors)
        if result.verdict != "ERROR" or result.metrics.finish_reason == "completed":
            try:
                logger.info(f"Judging test #{test.id}")
                
                quality_scores, verdict, highlights, issues, fix = await self.judge.evaluate(
                    test_prompt=test.prompt,
                    agent_output=result.final_answer,
                    tool_trace=result.metrics.tool_trace,
                    expected_artifacts=test.expected_artifacts
                )
                
                # Calculate test score (pure quality)
                test_score = calculate_test_score(quality_scores, result.metrics)
                
                # Update result
                result.quality_scores = quality_scores
                result.verdict = determine_verdict(quality_scores, test_score)
                result.test_score = test_score
                result.highlights = highlights
                result.critical_issues = issues
                result.suggested_fix = fix
                
            except Exception as e:
                logger.error(f"Judging failed for test {test.id}: {e}", exc_info=True)
                result.verdict = "ERROR"
                result.critical_issues = [f"Judge error: {str(e)}"]
        
        # Store result
        self.results.append(result)
        
        # Update UI
        self.ui.complete_test(result)
        self._update_ui()
        
        logger.info(f"Test #{test.id} complete: {result.verdict} (Score: {result.test_score:.1f})")
    
    def _update_ui(self):
        """Update the UI display (no-op for simple UI)"""
        pass

