"""
Terminal UI

Simple terminal UI for displaying benchmark progress, active tests, 
and completed results in real-time.
"""

import time
from typing import Dict, List, Optional
from datetime import datetime
from .metrics import TestResult


class BenchmarkUI:
    """Simple terminal UI for benchmark execution"""
    
    def __init__(self, total_tests: int, concurrency: int, model_split: Dict[str, int]):
        """
        Initialize benchmark UI.
        
        Args:
            total_tests: Total number of tests
            concurrency: Concurrent test count
            model_split: Model distribution (e.g., {'basic': 10, 'power': 10})
        """
        self.total_tests = total_tests
        self.concurrency = concurrency
        self.model_split = model_split
        self.started_at = datetime.now()
        
        # Test state tracking
        self.completed: List[TestResult] = []
        self.active: Dict[int, Dict] = {}  # test_id -> {name, model, start_time, status}
        self.judging: List[int] = []  # test_ids being judged
        
        # Print header
        print("\n" + "="*70)
        print("  SUNA AGENT BENCHMARK SUITE")
        print("="*70)
        model_str = " | ".join([f"{k}: {v}" for k, v in self.model_split.items()])
        print(f"  {model_str} | Concurrency: {self.concurrency}")
        print(f"  Started: {self.started_at.strftime('%H:%M:%S')}")
        print("="*70 + "\n")
    
    def start_test(self, test_id: int, test_name: str, model: str):
        """Mark a test as started"""
        self.active[test_id] = {
            'name': test_name,
            'model': model,
            'start_time': time.time(),
            'status': 'running'
        }
        print(f"▶  Starting #{test_id}: {test_name} ({model})")
    
    def mark_judging(self, test_id: int):
        """Mark a test as being judged"""
        if test_id in self.active:
            self.active[test_id]['status'] = 'judging'
            self.judging.append(test_id)
    
    def complete_test(self, result: TestResult):
        """Mark a test as completed"""
        if result.test_id in self.active:
            del self.active[result.test_id]
        
        if result.test_id in self.judging:
            self.judging.remove(result.test_id)
        
        self.completed.append(result)
        
        # Print completion
        icon = "✓" if result.verdict == "PASS" else ("✗" if result.verdict == "FAIL" else "⚠")
        print(f"{icon} Test #{result.test_id}: {result.test_name} - {result.verdict} (Score: {result.test_score:.1f})")
        print(f"   Progress: {len(self.completed)}/{self.total_tests} ({len(self.completed) / self.total_tests * 100:.0f}%)")
    
    def generate_display(self):
        """Generate display (no-op for simple UI)"""
        pass
    
    def get_summary_stats(self) -> Dict:
        """Get summary statistics"""
        passed = sum(1 for r in self.completed if r.verdict == "PASS")
        failed = sum(1 for r in self.completed if r.verdict == "FAIL")
        errors = sum(1 for r in self.completed if r.verdict == "ERROR")
        
        avg_score = sum(r.test_score for r in self.completed) / len(self.completed) if self.completed else 0
        
        elapsed = (datetime.now() - self.started_at).total_seconds()
        remaining_tests = self.total_tests - len(self.completed)
        avg_time_per_test = elapsed / len(self.completed) if self.completed else 0
        estimated_remaining = remaining_tests * avg_time_per_test / max(1, self.concurrency)
        
        return {
            'completed': len(self.completed),
            'passed': passed,
            'failed': failed,
            'errors': errors,
            'avg_score': avg_score,
            'elapsed': elapsed,
            'estimated_remaining': estimated_remaining
        }

