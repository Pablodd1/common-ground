ALTER TABLE `assistantMessages` ADD `answered` boolean;--> statement-breakpoint
ALTER TABLE `assistantMessages` ADD `feedback` enum('helpful','unhelpful');--> statement-breakpoint
CREATE INDEX `assistant_created_idx` ON `assistantMessages` (`createdAt`);