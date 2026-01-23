UPDATE admins SET password_hash = '$2b$10$9s4tBTDmsDZuZOV91xQs5OLHdB5Focg4xysxZsnHpjKx/o1UTnqRS' WHERE username = 'admin';
SELECT id, username, password_hash FROM admins;
