-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('Unit', 'Integration', 'EndToEnd');

-- CreateEnum
CREATE TYPE "EvidenceResult" AS ENUM ('Passed', 'Failed');

-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('Development', 'Test', 'Staging', 'Production');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('Pending', 'Running', 'Succeeded', 'Failed', 'RolledBack');

-- CreateTable
CREATE TABLE "ExecutionProgress" (
    "id" UUID NOT NULL,
    "executionJobId" UUID NOT NULL,
    "phase" VARCHAR(80) NOT NULL,
    "message" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" UUID NOT NULL,
    "executionJobId" UUID NOT NULL,
    "type" "TestType" NOT NULL,
    "result" "EvidenceResult" NOT NULL,
    "testCount" INTEGER,
    "failedTests" JSONB,
    "durationMs" INTEGER,
    "artifactUrl" TEXT,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workItemId" UUID NOT NULL,
    "executionJobId" UUID NOT NULL,
    "environment" "DeploymentEnvironment" NOT NULL,
    "version" VARCHAR(255),
    "commitHash" VARCHAR(128),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "DeploymentStatus" NOT NULL,
    "url" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" VARCHAR(128) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutionProgress_executionJobId_createdAt_idx" ON "ExecutionProgress"("executionJobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionProgress_executionJobId_idempotencyKey_key" ON "ExecutionProgress"("executionJobId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TestResult_executionJobId_type_createdAt_idx" ON "TestResult"("executionJobId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_executionJobId_idempotencyKey_key" ON "TestResult"("executionJobId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Deployment_projectId_startedAt_idx" ON "Deployment"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "Deployment_workItemId_startedAt_idx" ON "Deployment"("workItemId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_executionJobId_idempotencyKey_key" ON "Deployment"("executionJobId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "ExecutionProgress" ADD CONSTRAINT "ExecutionProgress_executionJobId_fkey" FOREIGN KEY ("executionJobId") REFERENCES "ExecutionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_executionJobId_fkey" FOREIGN KEY ("executionJobId") REFERENCES "ExecutionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_executionJobId_fkey" FOREIGN KEY ("executionJobId") REFERENCES "ExecutionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
