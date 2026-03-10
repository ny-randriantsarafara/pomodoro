CREATE TYPE "public"."active_session_phase" AS ENUM('focus', 'shortBreak', 'longBreak');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "active_sessions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid,
	"phase" "active_session_phase" DEFAULT 'focus' NOT NULL,
	"phase_started_at" timestamp NOT NULL,
	"phase_duration_seconds" integer NOT NULL,
	"completed_focus_sessions" integer DEFAULT 0 NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"paused_at" timestamp,
	"total_paused_seconds" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" varchar(200) NOT NULL,
	"note" text,
	"status" "task_status" DEFAULT 'active' NOT NULL,
	"due_date" timestamp,
	"estimated_pomodoros" integer,
	"actual_pomodoros" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"work_minutes" integer DEFAULT 25 NOT NULL,
	"short_break_minutes" integer DEFAULT 5 NOT NULL,
	"long_break_minutes" integer DEFAULT 15 NOT NULL,
	"long_break_frequency" integer DEFAULT 4 NOT NULL,
	"auto_start_breaks" boolean DEFAULT false NOT NULL,
	"auto_start_focus_sessions" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
