CREATE TABLE `resume_create_request` (
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`resume_id` text NOT NULL,
	`version` integer NOT NULL,
	PRIMARY KEY(`user_id`, `request_key`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
