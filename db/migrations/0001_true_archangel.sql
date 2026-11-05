CREATE TABLE `companyResources` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`kind` enum('document','contact') NOT NULL,
	`title` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`phone` varchar(60),
	`email` varchar(320),
	`reportsTo` varchar(180),
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdBy` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companyResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `company_resources_idx` ON `companyResources` (`kind`,`isPublished`);