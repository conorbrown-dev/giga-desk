ALTER TABLE "ExecutionJob"
ADD COLUMN "processId" INTEGER,
ADD COLUMN "processStartedAt" TIMESTAMP(3),
ADD COLUMN "terminationRequestedAt" TIMESTAMP(3),
ADD COLUMN "terminationRequestedBy" VARCHAR(255),
ADD CONSTRAINT "ExecutionJob_process_id_check" CHECK ("processId" IS NULL OR "processId" > 0);
