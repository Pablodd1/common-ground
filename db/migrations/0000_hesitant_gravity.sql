CREATE TABLE `assistantMessages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`body` text NOT NULL,
	`sources` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistantMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `assistant_user_idx` ON `assistantMessages` (`userId`,`createdAt`);
