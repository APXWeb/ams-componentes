CREATE TABLE `announcement_reads` (
	`announcement_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`read_at` text NOT NULL,
	PRIMARY KEY(`announcement_id`, `user_id`),
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`audience` text DEFAULT 'TODOS' NOT NULL,
	`audience_department_id` integer,
	`published_at` text NOT NULL,
	`expires_at` text,
	`author_user_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`audience_department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `application_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`type` text NOT NULL,
	`from_stage` text,
	`to_stage` text,
	`note` text,
	`actor_user_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `application_events_app` ON `application_events` (`application_id`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` integer NOT NULL,
	`vacancy_id` integer NOT NULL,
	`stage` text DEFAULT 'CANDIDATO' NOT NULL,
	`outcome` text DEFAULT 'EM_ANDAMENTO' NOT NULL,
	`message` text,
	`notes` text,
	`rating` integer,
	`interview_at` text,
	`hired_employee_id` integer,
	`last_activity_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hired_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_candidate_vacancy` ON `applications` (`candidate_id`,`vacancy_id`);--> statement-breakpoint
CREATE INDEX `applications_vacancy_stage` ON `applications` (`vacancy_id`,`stage`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`actor_label` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`summary` text NOT NULL,
	`ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`consent_at` text NOT NULL,
	`consent_version` text NOT NULL,
	`retain_until` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidates_email_unique` ON `candidates` (`email`);--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`city` text,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'NOVA' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `departments_slug_unique` ON `departments` (`slug`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer,
	`application_id` integer,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`storage_key` text,
	`original_name` text,
	`mime_type` text,
	`size_bytes` integer,
	`status` text NOT NULL,
	`due_date` text,
	`note` text,
	`requested_by_id` integer,
	`uploaded_by_id` integer,
	`uploaded_at` text,
	`reviewed_by_id` integer,
	`reviewed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_employee` ON `documents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `documents_status` ON `documents` (`status`);--> statement-breakpoint
CREATE TABLE `employee_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`actor_user_id` integer,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `employee_history_emp` ON `employee_history` (`employee_id`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`photo_document_id` integer,
	`position_id` integer NOT NULL,
	`department_id` integer NOT NULL,
	`manager_id` integer,
	`corporate_email` text NOT NULL,
	`personal_email` text,
	`phone` text,
	`city` text,
	`hired_at` text NOT NULL,
	`employment_type` text DEFAULT 'CLT' NOT NULL,
	`status` text DEFAULT 'ATIVO' NOT NULL,
	`terminated_at` text,
	`termination_reason` text,
	`vacation_balance` integer DEFAULT 30 NOT NULL,
	`source_application_id` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_corporate_email_unique` ON `employees` (`corporate_email`);--> statement-breakpoint
CREATE INDEX `employees_dept` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `employees_manager` ON `employees` (`manager_id`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`department_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `positions_title_dept` ON `positions` (`title`,`department_id`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_user_id` integer NOT NULL,
	`employee_id` integer,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`priority` text DEFAULT 'MEDIA' NOT NULL,
	`status` text DEFAULT 'PENDENTE' NOT NULL,
	`response` text,
	`responder_user_id` integer,
	`responded_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responder_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `requests_status` ON `requests` (`status`);--> statement-breakpoint
CREATE INDEX `requests_employee` ON `requests` (`employee_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'FUNCIONARIO' NOT NULL,
	`employee_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`last_login_at` text,
	`password_changed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_employee_id_unique` ON `users` (`employee_id`);--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`department_id` integer NOT NULL,
	`position_id` integer,
	`location` text NOT NULL,
	`employment_type` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`requirements` text NOT NULL,
	`additional_info` text,
	`openings` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'RASCUNHO' NOT NULL,
	`published_at` text,
	`closed_at` text,
	`created_by_id` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vacancies_slug_unique` ON `vacancies` (`slug`);--> statement-breakpoint
CREATE INDEX `vacancies_status` ON `vacancies` (`status`);--> statement-breakpoint
CREATE TABLE `vacations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` integer NOT NULL,
	`status` text DEFAULT 'PENDENTE' NOT NULL,
	`note` text,
	`review_note` text,
	`reviewed_by_id` integer,
	`reviewed_at` text,
	`requested_by_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vacations_employee` ON `vacations` (`employee_id`);--> statement-breakpoint
CREATE INDEX `vacations_dates` ON `vacations` (`start_date`);