-- Legacy projects without a configured repository must remain archivable.
-- Active projects continue to require an executable repository configuration.
ALTER TABLE "Project"
DROP CONSTRAINT "Project_repository_url_required_check",
DROP CONSTRAINT "Project_default_branch_required_check";

ALTER TABLE "Project"
ADD CONSTRAINT "Project_repository_url_required_check"
CHECK ("archived" OR ("repositoryUrl" IS NOT NULL AND BTRIM("repositoryUrl") <> '' AND "repositoryUrl" ~ '^https?://')) NOT VALID,
ADD CONSTRAINT "Project_default_branch_required_check"
CHECK ("archived" OR ("defaultBranch" IS NOT NULL AND BTRIM("defaultBranch") <> '')) NOT VALID;
