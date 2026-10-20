-- One-off Spread beta tester bootstrap. The password is NOT committed; this is a
-- salted scrypt hash (Better Auth defaults: N=16384, r=16, p=1, dkLen=64).
-- The auth user and the direct-access row are created in the same transaction
-- by scripts/migrate.mjs. Revoke without editing code:
-- UPDATE beta_direct_access SET status = 'revoked'
-- WHERE email = 'spread.beta.01@thespreadapp.com';
--
-- Only the connected application database owner should run this migration.
-- Keep this historical migration immutable once applied.

CREATE TABLE IF NOT EXISTS beta_direct_access (
  email text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('approved', 'paused', 'revoked')),
  access_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- The server uses its owner connection to read this table. No public policies.
ALTER TABLE beta_direct_access ENABLE ROW LEVEL SECURITY;

INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
VALUES ('4d46bad5-06da-41e9-bb4f-57b58a826665', 'Spread Beta Tester',
        'spread.beta.01@thespreadapp.com', false, now(), now());

INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
VALUES ('1d52cfd1-8d82-452b-98bc-cdc4a41c7d21',
        '4d46bad5-06da-41e9-bb4f-57b58a826665', 'credential',
        '4d46bad5-06da-41e9-bb4f-57b58a826665',
        '74fcf5cd9de58e5ae0690e8a4a62ca5d:f0266647ef2d7ded3fbc58cbefa8524fb64e3efe611c29abb01a715bbed9dba09b1a6ce34108f4cb4400fcd10079deba2acbd73453dd958bf48a7b4994b6d50b',
        now(), now());

INSERT INTO beta_direct_access (email, status)
VALUES ('spread.beta.01@thespreadapp.com', 'approved');
