CREATE TABLE "session_projects" (
    "session_id" uuid NOT NULL REFERENCES "focus_sessions"("id") ON DELETE CASCADE,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "session_projects_session_id_project_id_pk" PRIMARY KEY("session_id","project_id")
);

INSERT INTO "session_projects" ("session_id", "project_id")
SELECT "id", "project_id" FROM "focus_sessions" WHERE "project_id" IS NOT NULL;

ALTER TABLE "focus_sessions" DROP COLUMN IF EXISTS "project_id";
