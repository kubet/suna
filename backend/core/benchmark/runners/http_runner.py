"""
HTTP Agent Runner

Makes HTTP API calls for end-to-end testing including the full API stack.
Used for health checks and selected integration tests.
"""

import aiohttp
import time
from typing import Dict, Any
from datetime import datetime
from core.utils.logger import logger
from ..metrics import TestMetrics, TestResult, ToolCallRecord
from ..test_cases import TestCase


class HTTPAgentRunner:
    """Executes tests via HTTP API calls"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        """
        Initialize HTTP runner.
        
        Args:
            base_url: Base URL for API (default: http://localhost:8000)
        """
        self.base_url = base_url
        self.session = None
    
    async def run_test(self, test: TestCase) -> TestResult:
        """
        Execute a test via HTTP API.
        
        Args:
            test: Test case to execute
        
        Returns:
            TestResult with metrics and output
        """
        logger.info(f"Running HTTP test #{test.id}: {test.name}")
        
        metrics = TestMetrics(
            model="http",
            test_id=test.id,
            test_name=test.name,
            started_at=datetime.now()
        )
        
        final_answer = ""
        
        try:
            if test.id == 1:  # Health check
                final_answer, metrics = await self._run_health_check(test, metrics)
            else:
                # For other HTTP tests, could add more handlers
                final_answer = "HTTP test handler not implemented for this test"
                metrics.finish_reason = "completed"
            
            metrics.completed_at = datetime.now()
            
        except Exception as e:
            logger.error(f"HTTP test {test.id} failed: {e}", exc_info=True)
            metrics.finish_reason = "error"
            metrics.error_message = str(e)
            final_answer = f"Test failed with error: {str(e)}"
            metrics.completed_at = datetime.now()
        
        # Create result
        result = TestResult(
            test_id=test.id,
            test_name=test.name,
            model="http",
            category=test.category,
            metrics=metrics,
            final_answer=final_answer,
            verdict="PENDING"  # Will be set by judge
        )
        
        return result
    
    async def _run_health_check(
        self,
        test: TestCase,
        metrics: TestMetrics
    ) -> tuple[str, TestMetrics]:
        """
        Run health check test.
        
        Calls /v1/health endpoint and measures response time.
        """
        start_time = time.time()
        
        try:
            # Make health check request
            url = f"{self.base_url}/v1/health"
            
            logger.debug(f"Calling {url}")
            
            if not self.session:
                self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30.0))
            
            request_start = time.time()
            async with self.session.get(url) as response:
                request_end = time.time()
                status = response.status
                
                # Record tool call (API call)
                tool_record = ToolCallRecord(
                    tool_name="http_get",
                    args={"url": url},
                    start_time=request_start,
                    end_time=request_end,
                    duration=request_end - request_start,
                    success=status == 200,
                    error=None if status == 200 else f"Status {status}",
                    result=await response.json() if status == 200 else None
                )
                metrics.add_tool_call(tool_record)
                
                if status == 200:
                    data = await response.json()
                    
                    # Format output
                    final_answer = f"""Health Check Results:
```json
{{
  "status": "{data.get('status', 'unknown')}",
  "latency_ms": {(request_end - request_start) * 1000:.2f},
  "timestamp": "{data.get('timestamp', 'unknown')}",
  "instance_id": "{data.get('instance_id', 'unknown')}"
}}
```

The health endpoint is responding successfully."""
                    
                    metrics.finish_reason = "completed"
                    metrics.time_to_first_token = request_end - request_start
                    
                else:
                    final_answer = f"Health check failed with status {status}"
                    metrics.finish_reason = "error"
                    metrics.error_message = f"HTTP {status}"
        
        except Exception as e:
            logger.error(f"Health check error: {e}")
            final_answer = f"Health check failed: {str(e)}"
            metrics.finish_reason = "error"
            metrics.error_message = str(e)
        
        end_time = time.time()
        metrics.total_time_seconds = end_time - start_time
        
        return final_answer, metrics
    
    async def cleanup(self):
        """Close HTTP client"""
        if self.session:
            await self.session.close()

