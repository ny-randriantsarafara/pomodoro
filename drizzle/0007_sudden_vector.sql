ALTER TABLE "focus_sessions"
    ADD COLUMN IF NOT EXISTS "task_id" uuid;

DO $$
BEGIN
    ALTER TABLE "focus_sessions"
        ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk"
        FOREIGN KEY ("task_id")
        REFERENCES "public"."tasks"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
