-- Stable, disabled identity used to retain institutional and audit records
-- without keeping a deleted member's personal information.
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    app_role,
    email_verified,
    enabled
)
VALUES (
    'deleted-user@myskoolclub.invalid',
    'ACCOUNT_DISABLED',
    'Deleted',
    'User',
    'APP_USER',
    TRUE,
    FALSE
)
ON CONFLICT (email) DO NOTHING;
