-- Firebase Authentication cutover: local users are keyed to Firebase accounts.
-- The password column is retained (unused) until the migration window closes.
ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128);
ALTER TABLE users ADD CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid);

-- Firebase now owns email verification and password reset.
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS password_reset_codes;
