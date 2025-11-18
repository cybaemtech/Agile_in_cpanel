-- Local XAMPP Database Setup Script
-- Run this in phpMyAdmin or MySQL command line

-- Create database
CREATE DATABASE IF NOT EXISTS `agile` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agile`;

-- Users table
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `user_role` enum('ADMIN','SCRUM_MASTER','USER') DEFAULT 'USER',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) DEFAULT 1,
  `verification_code` varchar(10) DEFAULT NULL,
  `verification_code_expires` timestamp NULL DEFAULT NULL,
  `verification_attempts` int(11) DEFAULT 0,
  `last_verification_request` timestamp NULL DEFAULT NULL,
  `reset_token` varchar(100) DEFAULT NULL,
  `reset_token_expiry` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teams table
CREATE TABLE `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Team members table
CREATE TABLE `team_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('ADMIN','MEMBER','VIEWER') DEFAULT 'MEMBER',
  `joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_user` (`team_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table  
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `key` varchar(20) NOT NULL,
  `description` text,
  `team_id` int(11) DEFAULT NULL,
  `status` enum('PLANNING','ACTIVE','ARCHIVED','COMPLETED') DEFAULT 'PLANNING',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `team_id` (`team_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Work items table
CREATE TABLE `work_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `external_id` varchar(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('EPIC','FEATURE','STORY','TASK','BUG') NOT NULL,
  `status` enum('TODO','IN_PROGRESS','DONE') DEFAULT 'TODO',
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `story_points` int(11) DEFAULT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `reporter_id` int(11) DEFAULT NULL,
  `project_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_id` (`external_id`),
  KEY `assignee_id` (`assignee_id`),
  KEY `reporter_id` (`reporter_id`),
  KEY `project_id` (`project_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `work_items_ibfk_1` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_items_ibfk_2` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_items_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_items_ibfk_4` FOREIGN KEY (`parent_id`) REFERENCES `work_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bug reports table
CREATE TABLE `bug_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `work_item_id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
  `resolution_status` enum('FIXED','WONT_FIX','DUPLICATE','NOT_A_BUG','PENDING') DEFAULT NULL,
  `reporter_name` varchar(100) NOT NULL,
  `reporter_email` varchar(100) NOT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `project_id` int(11) DEFAULT NULL,
  `screenshot` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `bug_reports_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
INSERT INTO `users` (`username`, `email`, `full_name`, `password`, `user_role`, `is_active`, `email_verified`) VALUES
('admin', 'admin@example.com', 'System Administrator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN', 1, 1),
('scrum', 'scrum@example.com', 'Scrum Master', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SCRUM_MASTER', 1, 1),
('user', 'user@example.com', 'Regular User', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER', 1, 1);

-- Insert sample team
INSERT INTO `teams` (`name`, `description`, `created_by`) VALUES
('Development Team', 'Main development team for the project', 1);

-- Insert sample project
INSERT INTO `projects` (`name`, `key`, `description`, `team_id`, `created_by`) VALUES
('Agile Management System', 'AMS', 'Project management system with agile methodology', 1, 1);

-- Add admin to team
INSERT INTO `team_members` (`team_id`, `user_id`, `role`) VALUES
(1, 1, 'ADMIN'),
(1, 2, 'MEMBER'),
(1, 3, 'MEMBER');