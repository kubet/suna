"""
Score Calculator

Pure quality-based scoring from LLM judge. No penalties, no budgets.
Just comparing quality to best historical run.
"""

from typing import Dict
from .metrics import TestMetrics, QualityScores


def calculate_quality_score(quality_scores: QualityScores) -> float:
    """
    Calculate quality score (0-100) from LLM judge scores.
    
    Takes the average of all 10 category scores (0-10 each)
    and scales to 0-100.
    
    Args:
        quality_scores: Scores from LLM judge
    
    Returns:
        Quality score (0-100)
    """
    avg_score = quality_scores.average()  # 0-10 scale
    return avg_score * 10.0  # Convert to 0-100 scale


def calculate_test_score(
    quality_scores: QualityScores,
    metrics: TestMetrics
) -> float:
    """
    Calculate test score - just pure quality from judge.
    
    Args:
        quality_scores: Quality evaluation from LLM judge
        metrics: Performance metrics (for reference only)
    
    Returns:
        Test score (0-100) - pure quality
    """
    return calculate_quality_score(quality_scores)


def determine_verdict(
    quality_scores: QualityScores,
    test_score: float
) -> str:
    """
    Determine PASS/FAIL verdict based on scores.
    
    Failure conditions:
    - Task success score <= 4 (didn't complete the task)
    - Trace alignment score <= 4 (lied about what it did)
    - Test score < 50 (overall poor quality)
    
    Args:
        quality_scores: Quality evaluation from LLM judge
        test_score: Combined test score
    
    Returns:
        "PASS" or "FAIL"
    """
    # Critical failures
    if quality_scores.task_success <= 4:
        return "FAIL"
    
    if quality_scores.trace_alignment <= 4:
        return "FAIL"
    
    # Overall threshold
    if test_score < 50:
        return "FAIL"
    
    return "PASS"


def calculate_suite_score(test_scores: list[float]) -> float:
    """
    Calculate overall suite score as average of all test scores.
    
    Args:
        test_scores: List of scores from all tests
    
    Returns:
        Average suite score (0-100)
    """
    if not test_scores:
        return 0.0
    
    return sum(test_scores) / len(test_scores)

