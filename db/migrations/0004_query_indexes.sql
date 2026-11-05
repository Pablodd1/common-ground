CREATE INDEX `comments_post_idx` ON `comments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_media_idx` ON `messages` (`mediaKey`);--> statement-breakpoint
CREATE INDEX `posts_media_idx` ON `posts` (`mediaKey`);