CREATE TABLE "VisualReference" (
  "id" UUID NOT NULL,
  "workItemId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "mediaType" VARCHAR(40) NOT NULL,
  "content" BYTEA NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "VisualReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisualReference_workItemId_sortOrder_idx"
ON "VisualReference"("workItemId", "sortOrder");

ALTER TABLE "VisualReference"
ADD CONSTRAINT "VisualReference_workItemId_fkey"
FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
