CREATE TABLE "check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"monitorId" uuid NOT NULL,
	"isUp" boolean NOT NULL,
	"statusCode" integer,
	"responseTimeMs" numeric(8) NOT NULL,
	"errorCode" varchar,
	"checkedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"webPage" text NOT NULL,
	"ownedBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "check_monitor_id_checked_at_idx" ON "check" ("monitorId","checkedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "unique_name_and_owner" ON "monitor" ("ownedBy","name");--> statement-breakpoint
ALTER TABLE "check" ADD CONSTRAINT "check_monitorId_monitor_id_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "monitor" ADD CONSTRAINT "monitor_ownedBy_user_id_fkey" FOREIGN KEY ("ownedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;