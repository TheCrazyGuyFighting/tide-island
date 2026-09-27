CREATE TABLE `crew_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`room` text NOT NULL,
	`slot` integer NOT NULL,
	`public` integer NOT NULL,
	`name` text NOT NULL,
	`pose` text NOT NULL,
	`updated` integer NOT NULL,
	`joined` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crew_room_slot` ON `crew_sessions` (`room`,`slot`);--> statement-breakpoint
CREATE INDEX `crew_public_updated` ON `crew_sessions` (`public`,`updated`);--> statement-breakpoint
CREATE INDEX `crew_room_updated` ON `crew_sessions` (`room`,`updated`);