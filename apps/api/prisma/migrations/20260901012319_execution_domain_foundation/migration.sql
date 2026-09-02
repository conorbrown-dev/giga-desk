-- CreateEnum
CREATE TYPE "ExecutionNodeStatus" AS ENUM ('Online', 'Offline', 'Busy', 'Degraded', 'Disabled');

-- CreateEnum
CREATE TYPE "ModelLocation" AS ENUM ('Local', 'Remote');

-- CreateEnum
CREATE TYPE "ExecutionJobStatus" AS ENUM ('Queued', 'Assigned', 'Starting', 'Running', 'WaitingForInput', 'Blocked', 'Testing', 'Reviewing', 'Deploying', 'E2ETesting', 'Completed', 'Failed', 'Cancelled');

-- CreateTable
CREATE TABLE "ExecutionNode" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "hostname" VARCHAR(255) NOT NULL,
    "operatingSystem" VARCHAR(120) NOT NULL,
    "architecture" VARCHAR(80) NOT NULL,
    "status" "ExecutionNodeStatus" NOT NULL DEFAULT 'Offline',
    "lastHeartbeatAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" JSONB NOT NULL,
    "maximumConcurrentJobs" INTEGER NOT NULL DEFAULT 1,
    "currentJobCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "agentType" VARCHAR(120) NOT NULL,
    "version" VARCHAR(80) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "supportedCapabilities" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "supportedModelProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "provider" VARCHAR(120) NOT NULL,
    "modelIdentifier" VARCHAR(255) NOT NULL,
    "modelType" VARCHAR(80) NOT NULL,
    "contextWindow" INTEGER,
    "location" "ModelLocation" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionJob" (
    "id" UUID NOT NULL,
    "workItemId" UUID NOT NULL,
    "executionNodeId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "requestedBy" VARCHAR(255) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "ExecutionJobStatus" NOT NULL DEFAULT 'Queued',
    "result" JSONB,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "branchName" VARCHAR(255),
    "pullRequestUrl" TEXT,
    "commitHash" VARCHAR(128),

    CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionNode_name_key" ON "ExecutionNode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_version_key" ON "Agent"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_provider_modelIdentifier_key" ON "AiModel"("provider", "modelIdentifier");

-- CreateIndex
CREATE INDEX "ExecutionJob_status_requestedAt_idx" ON "ExecutionJob"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ExecutionJob_workItemId_requestedAt_idx" ON "ExecutionJob"("workItemId", "requestedAt");

-- CreateIndex
CREATE INDEX "ExecutionJob_executionNodeId_status_idx" ON "ExecutionJob"("executionNodeId", "status");

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_executionNodeId_fkey" FOREIGN KEY ("executionNodeId") REFERENCES "ExecutionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
