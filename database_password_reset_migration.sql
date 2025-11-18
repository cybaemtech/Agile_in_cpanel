-- Database schema updates for password reset functionality
-- Run this SQL script on your MySQL database to add the required columns

-- Add reset token columns to users table
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(64) NULL,
ADD COLUMN reset_token_expiry DATETIME NULL;

-- Create index for faster token lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- Note: These columns are optional and will only be used when users request password resets
-- reset_token: stores the secure token for password reset
-- reset_token_expiry: stores when the token expires (1 hour from creation)