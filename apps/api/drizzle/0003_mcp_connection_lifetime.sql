CREATE TABLE "oauth_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"scopes" text[] NOT NULL,
	"authorized_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "oauth_connection_absolute_lifetime" CHECK ("oauth_connection"."expires_at" = "oauth_connection"."authorized_at" + interval '720 hours')
);
--> statement-breakpoint
ALTER TABLE "oauth_connection" ADD CONSTRAINT "oauth_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connection" ADD CONSTRAINT "oauth_connection_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_connection_user_id_idx" ON "oauth_connection" USING btree ("user_id");