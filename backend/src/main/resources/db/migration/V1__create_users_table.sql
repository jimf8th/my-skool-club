CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    graduation_year INT,
    app_role        VARCHAR(50)  NOT NULL DEFAULT 'APP_USER',
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP
);

-- To promote the first app admin after their initial registration, run:
-- UPDATE users SET app_role = 'APP_ADMIN' WHERE email = 'your-admin@example.com';
