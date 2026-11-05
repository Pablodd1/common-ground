-- Las migraciones 0000-0002 se generaron sobre una base que ya tenía las tablas
-- de la comunidad, así que nunca las crearon. En una base MySQL nueva (por ejemplo,
-- al desplegar en Vercel) solo existían assistantMessages y companyResources.
-- IF NOT EXISTS hace que esta migración no cambie nada en bases que ya las tienen.
CREATE TABLE IF NOT EXISTS `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`unionId` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`avatar` text,
	`avatarKey` text,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`jobTitle` varchar(120),
	`department` varchar(120),
	`location` varchar(120),
	`bio` text,
	`interests` text,
	`birthday` varchar(10),
	`startDate` varchar(10),
	`shareBirthday` boolean NOT NULL DEFAULT true,
	`shareLocation` boolean NOT NULL DEFAULT true,
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignInAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_unionId_unique` UNIQUE(`unionId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `files` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(512) NOT NULL,
	`ownerId` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`),
	CONSTRAINT `files_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `posts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`authorId` bigint unsigned NOT NULL,
	`body` text NOT NULL,
	`topic` enum('Motivation','Outside work','Wins','Questions','Celebration') NOT NULL DEFAULT 'Motivation',
	`mediaKey` varchar(512),
	`mediaType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	INDEX `posts_created_idx` (`createdAt`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `likes` (
	`postId` bigint unsigned NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_postId_userId_pk` PRIMARY KEY(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `comments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`postId` bigint unsigned NOT NULL,
	`authorId` bigint unsigned NOT NULL,
	`body` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userOneId` bigint unsigned NOT NULL,
	`userTwoId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_pair_idx` UNIQUE(`userOneId`,`userTwoId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`conversationId` bigint unsigned NOT NULL,
	`senderId` bigint unsigned NOT NULL,
	`body` text NOT NULL,
	`mediaKey` varchar(512),
	`mediaType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	INDEX `messages_conversation_idx` (`conversationId`,`createdAt`)
);
