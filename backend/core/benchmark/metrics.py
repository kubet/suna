"""
Metrics Collection

Data structures for collecting and storing benchmark metrics including
timing, tool usage, tokens, and quality scores.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class ToolCallRecord:
    """Record of a single tool call execution"""
    tool_name: str
    args: Dict[str, Any]
    start_time: float
    end_time: float
    duration: float
    success: bool
    error: Optional[str] = None
    result: Optional[Any] = None
    retry_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TestMetrics:
    """Comprehensive performance metrics for a test run"""
    
    # Timing metrics
    total_time_seconds: float = 0.0
    time_to_first_token: Optional[float] = None
    stream_stall_count: int = 0
    stream_stall_total_duration: float = 0.0
    
    # Tool execution metrics
    tool_calls: List[ToolCallRecord] = field(default_factory=list)
    tool_failures: int = 0
    tool_retries: int = 0
    
    # Token usage & cost
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    
    # Completion status
    finish_reason: str = "unknown"  # completed, timeout, error, stopped
    error_message: Optional[str] = None
    
    # Agent output
    final_answer: str = ""
    tool_trace: List[Dict[str, Any]] = field(default_factory=list)
    
    # Metadata
    model: str = ""
    test_id: int = 0
    test_name: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def add_tool_call(self, record: ToolCallRecord):
        """Add a tool call record and update counters"""
        self.tool_calls.append(record)
        if not record.success:
            self.tool_failures += 1
        if record.retry_count > 0:
            self.tool_retries += record.retry_count
        
        # Add to trace
        self.tool_trace.append({
            'tool': record.tool_name,
            'start': record.start_time,
            'end': record.end_time,
            'duration': record.duration,
            'success': record.success,
            'error': record.error,
            'retries': record.retry_count
        })
    
    def set_token_usage(self, usage: Dict[str, Any]):
        """Update token usage from LLM response"""
        self.prompt_tokens = usage.get('prompt_tokens', 0) or 0
        self.completion_tokens = usage.get('completion_tokens', 0) or 0
        self.cache_read_tokens = usage.get('cache_read_input_tokens', 0) or 0
        self.cache_creation_tokens = usage.get('cache_creation_input_tokens', 0) or 0
        self.total_tokens = self.prompt_tokens + self.completion_tokens
    
    def calculate_cost(self, pricing: Optional[Dict[str, float]] = None):
        """Calculate cost based on token usage and model pricing"""
        if not pricing:
            # Default Bedrock pricing (rough estimates per million tokens)
            if 'haiku' in self.model.lower() or 'basic' in self.model.lower():
                input_cost_per_m = 0.25
                output_cost_per_m = 1.25
                cache_read_per_m = 0.03
                cache_write_per_m = 0.30
            else:  # sonnet/power
                input_cost_per_m = 3.0
                output_cost_per_m = 15.0
                cache_read_per_m = 0.30
                cache_write_per_m = 3.75
        else:
            input_cost_per_m = pricing.get('input', 0.0)
            output_cost_per_m = pricing.get('output', 0.0)
            cache_read_per_m = pricing.get('cache_read', 0.0)
            cache_write_per_m = pricing.get('cache_write', 0.0)
        
        # Calculate component costs
        input_cost = (self.prompt_tokens / 1_000_000) * input_cost_per_m
        output_cost = (self.completion_tokens / 1_000_000) * output_cost_per_m
        cache_read_cost = (self.cache_read_tokens / 1_000_000) * cache_read_per_m
        cache_write_cost = (self.cache_creation_tokens / 1_000_000) * cache_write_per_m
        
        self.total_cost = input_cost + output_cost + cache_read_cost + cache_write_cost
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'total_time_seconds': self.total_time_seconds,
            'time_to_first_token': self.time_to_first_token,
            'stream_stall_count': self.stream_stall_count,
            'stream_stall_total_duration': self.stream_stall_total_duration,
            'tool_call_count': len(self.tool_calls),
            'tool_failures': self.tool_failures,
            'tool_retries': self.tool_retries,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'cache_read_tokens': self.cache_read_tokens,
            'cache_creation_tokens': self.cache_creation_tokens,
            'total_tokens': self.total_tokens,
            'total_cost': round(self.total_cost, 6),
            'finish_reason': self.finish_reason,
            'error_message': self.error_message,
            'model': self.model,
            'test_id': self.test_id,
            'test_name': self.test_name,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


@dataclass
class QualityScores:
    """Quality scores from LLM judge (0-10 scale)"""
    task_success: float = 0.0
    correctness: float = 0.0
    completeness: float = 0.0
    format_compliance: float = 0.0
    tool_choice: float = 0.0
    tool_execution_quality: float = 0.0
    efficiency: float = 0.0
    clarity: float = 0.0
    safety: float = 0.0
    trace_alignment: float = 0.0
    
    def average(self) -> float:
        """Calculate average score across all categories"""
        scores = [
            self.task_success, self.correctness, self.completeness,
            self.format_compliance, self.tool_choice, self.tool_execution_quality,
            self.efficiency, self.clarity, self.safety, self.trace_alignment
        ]
        return sum(scores) / len(scores)
    
    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class TestResult:
    """Complete result of a benchmark test including metrics and scores"""
    test_id: int
    test_name: str
    model: str
    category: str
    
    # Performance metrics
    metrics: TestMetrics
    
    # Quality evaluation
    quality_scores: Optional[QualityScores] = None
    verdict: str = "PENDING"  # PASS, FAIL, ERROR, PENDING
    
    # Test score (0-100) - pure quality from judge
    test_score: float = 0.0
    
    # Judge feedback
    highlights: List[str] = field(default_factory=list)
    critical_issues: List[str] = field(default_factory=list)
    suggested_fix: str = ""
    
    # Final answer from agent
    final_answer: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'test_id': self.test_id,
            'test_name': self.test_name,
            'model': self.model,
            'category': self.category,
            'verdict': self.verdict,
            'test_score': round(self.test_score, 2),
            'metrics': self.metrics.to_dict(),
            'quality_scores': self.quality_scores.to_dict() if self.quality_scores else None,
            'highlights': self.highlights,
            'critical_issues': self.critical_issues,
            'suggested_fix': self.suggested_fix,
            'final_answer': self.final_answer[:500] if len(self.final_answer) > 500 else self.final_answer,
        }


@dataclass
class BenchmarkReport:
    """Complete benchmark suite report"""
    suite_score: float  # Average Weissman score
    total_tests: int
    passed: int
    failed: int
    errors: int
    
    timestamp: datetime
    config: Dict[str, Any]
    
    results: List[TestResult]
    
    # Aggregate metrics
    total_time: float = 0.0
    total_cost: float = 0.0
    avg_test_time: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'suite_score': round(self.suite_score, 2),
            'timestamp': self.timestamp.isoformat(),
            'summary': {
                'total_tests': self.total_tests,
                'passed': self.passed,
                'failed': self.failed,
                'errors': self.errors,
                'pass_rate': round((self.passed / self.total_tests * 100) if self.total_tests > 0 else 0, 1),
                'total_time': round(self.total_time, 2),
                'total_cost': round(self.total_cost, 4),
                'avg_test_time': round(self.avg_test_time, 2),
            },
            'config': self.config,
            'results': [r.to_dict() for r in self.results],
        }

