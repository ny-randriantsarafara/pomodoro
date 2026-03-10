ALTER TABLE "user_settings"
    ADD COLUMN IF NOT EXISTS "daily_goal_minutes" integer DEFAULT 100 NOT NULL;

ALTER TABLE "user_settings"
    ADD COLUMN IF NOT EXISTS "analytics_opt_in" boolean DEFAULT false NOT NULL;
