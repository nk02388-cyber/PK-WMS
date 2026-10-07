# Admin accounts and credentials

Settings supports creating user or admin accounts with a six-digit PIN or an 8–128 character password. Active Admin accounts appear in the user list with full-menu access. User menu permissions remain editable. Existing Admin accounts are not deletable from this screen.

The pk-user-access function verifies the bearer user and live app_users role before all management commands. set_credential resolves the target login type from its stored email identifier, validates the new credential and updates Supabase Auth without changing role, username or menus. PIN hashing retains the existing HMAC scheme. Credential values are never returned or logged by this code.

Apply supabase-multiple-admin.sql after supabase-user-login.sql on fresh installations. The production migration allow_multiple_admin_accounts removes only the historical one-admin unique index. No existing credentials are changed by deployment.

Verification: node tests/admin-credentials.test.mjs and node tests/settings-browser.cjs (WebKit desktop/mobile). PK_SETTINGS_BROWSER=edge tests desktop in Edge. Browser requests and Auth updates in tests are mocked; no real staff password was reset during QA.
