ALTER TABLE "ExecutionNode"
ADD CONSTRAINT "ExecutionNode_capacity_check"
CHECK ("maximumConcurrentJobs" > 0 AND "currentJobCount" >= 0 AND "currentJobCount" <= "maximumConcurrentJobs");

ALTER TABLE "AiModel"
ADD CONSTRAINT "AiModel_context_window_check"
CHECK ("contextWindow" IS NULL OR "contextWindow" > 0);

ALTER TABLE "ExecutionJob"
ADD CONSTRAINT "ExecutionJob_retry_count_check"
CHECK ("retryCount" >= 0);
