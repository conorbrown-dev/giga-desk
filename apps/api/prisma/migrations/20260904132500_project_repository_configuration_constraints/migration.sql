-- Existing legacy Projects must be remediated before these constraints can be validated.
-- PostgreSQL still enforces NOT VALID check constraints for every new or updated row.
ALTER TABLE "Project"
ADD CONSTRAINT "Project_repository_url_required_check"
CHECK ("repositoryUrl" IS NOT NULL AND BTRIM("repositoryUrl") <> '' AND "repositoryUrl" ~ '^https?://') NOT VALID;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_default_branch_required_check"
CHECK ("defaultBranch" IS NOT NULL AND BTRIM("defaultBranch") <> '') NOT VALID;
