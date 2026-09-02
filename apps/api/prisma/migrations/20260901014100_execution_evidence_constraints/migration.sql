ALTER TABLE "TestResult"
ADD CONSTRAINT "TestResult_counts_check"
CHECK (("testCount" IS NULL OR "testCount" >= 0) AND ("durationMs" IS NULL OR "durationMs" >= 0));
