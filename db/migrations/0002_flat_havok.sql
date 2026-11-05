ALTER TABLE `companyResources` MODIFY COLUMN `kind` enum('document','contact','course','file') NOT NULL;--> statement-breakpoint
ALTER TABLE `companyResources` ADD `url` varchar(2048);