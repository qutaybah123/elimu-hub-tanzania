-- Run this if you already have the database deployed and want to add admin
-- admin@elimuhub.tz / admin123 (CHANGE PASSWORD AFTER LOGIN)
INSERT INTO users (email, password, full_name, role, is_active) VALUES
    ('admin@elimuhub.tz', '$2a$10$AIWHGrgGy5pv5z1WrpCkKOOqWL23ch57krVKdHYdtOiti19zuTyga', 'System Admin', 'admin', true)
ON CONFLICT (email) DO NOTHING;
