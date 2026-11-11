CREATE TABLE `resume_avatar` (
	`resume_id` text PRIMARY KEY NOT NULL,
	`jpeg` blob NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
