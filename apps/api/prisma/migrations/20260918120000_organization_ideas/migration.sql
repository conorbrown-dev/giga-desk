CREATE TYPE "OrganizationMemberRole" AS ENUM ('Owner', 'Coworker');
CREATE TYPE "IdeaStatus" AS ENUM ('Open', 'Archived');

CREATE TABLE "Organization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrganizationMember" (
  "organizationId" UUID NOT NULL, "subject" VARCHAR(255) NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'Coworker', "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("organizationId", "subject")
);
CREATE TABLE "Idea" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL, "status" "IdeaStatus" NOT NULL DEFAULT 'Open', "createdBy" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IdeaComment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ideaId" UUID NOT NULL, "body" TEXT NOT NULL,
  "authorId" VARCHAR(255) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaComment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IdeaInvitation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "tokenHash" VARCHAR(128) NOT NULL,
  "createdBy" VARCHAR(255) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3), "acceptedBy" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "IdeaInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdeaInvitation_tokenHash_key" ON "IdeaInvitation"("tokenHash");
CREATE INDEX "OrganizationMember_subject_idx" ON "OrganizationMember"("subject");
CREATE INDEX "Idea_organizationId_status_updatedAt_idx" ON "Idea"("organizationId", "status", "updatedAt");
CREATE INDEX "IdeaInvitation_organizationId_expiresAt_idx" ON "IdeaInvitation"("organizationId", "expiresAt");
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE;
ALTER TABLE "IdeaInvitation" ADD CONSTRAINT "IdeaInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
