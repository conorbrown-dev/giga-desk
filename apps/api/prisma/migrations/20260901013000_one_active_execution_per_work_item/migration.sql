CREATE UNIQUE INDEX "ExecutionJob_one_active_per_work_item"
ON "ExecutionJob" ("workItemId")
WHERE "status" NOT IN ('Completed', 'Failed', 'Cancelled');
