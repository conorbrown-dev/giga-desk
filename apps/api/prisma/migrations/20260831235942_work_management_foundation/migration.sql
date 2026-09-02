-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Idea', 'Planning', 'Active', 'OnHold', 'Completed', 'Archived');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('Idea', 'Epic', 'Feature', 'UserStory', 'Task', 'Bug', 'Issue', 'TechnicalDebt', 'Research');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('Backlog', 'Ready', 'InProgress', 'Blocked', 'InReview', 'Testing', 'ReadyForDeployment', 'Deploying', 'E2ETesting', 'Completed', 'Cancelled');

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "key" VARCHAR(12) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "businessGoal" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'Idea',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "repositoryUrl" TEXT,
    "defaultBranch" VARCHAR(255),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "parentId" UUID,
    "type" "WorkItemType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'Backlog',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "technicalNotes" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcceptanceCriterion" (
    "id" UUID NOT NULL,
    "workItemId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcceptanceCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItemDependency" (
    "workItemId" UUID NOT NULL,
    "prerequisiteId" UUID NOT NULL,

    CONSTRAINT "WorkItemDependency_pkey" PRIMARY KEY ("workItemId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workItemId" UUID,
    "eventType" VARCHAR(80) NOT NULL,
    "actorId" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "WorkItem_projectId_status_idx" ON "WorkItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "WorkItem_parentId_idx" ON "WorkItem"("parentId");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_workItemId_idx" ON "AcceptanceCriterion"("workItemId");

-- CreateIndex
CREATE INDEX "Activity_projectId_createdAt_idx" ON "Activity"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_workItemId_createdAt_idx" ON "Activity"("workItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptanceCriterion" ADD CONSTRAINT "AcceptanceCriterion_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemDependency" ADD CONSTRAINT "WorkItemDependency_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemDependency" ADD CONSTRAINT "WorkItemDependency_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "WorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
