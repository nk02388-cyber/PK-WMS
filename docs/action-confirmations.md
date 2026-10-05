# Delete/cancel confirmation

`action-confirmation.js` captures buttons whose visible text or accessible label contains ลบ or ยกเลิก, including dynamically rendered buttons and submit buttons. The confirmation dialog's own Back/Escape dismisses the request without requiring another confirmation. Ordinary Save controls are unaffected.

The dialog shows the currently logged-in username as read-only. Password/PIN verification uses the existing `pk-user-access` login handler and compares the verified Supabase user ID with the current session's user ID before and after verification. It never sets the verification session as the current session. A temporary authentication session is signed out locally after the check. Credentials are cleared from the form and are not stored in the audit record.

A nonblank reason is required. The authenticated `record_action_confirmation` RPC records user ID/name, action label, target description, reason and confirmation time in `action_confirmations`. The RPC rejects inactive/anonymous accounts and invalid inputs. Table reads are restricted to active Admins or the record owner; clients cannot directly insert/update/delete audit rows.

If verification, identity comparison or audit recording fails, the original action is not replayed. Successful confirmation replays the connected, enabled button once. Existing transaction permissions, optimistic version checks and business validation remain in force. These records describe the user's confirmation/intent, not proof that the later business transaction succeeded; transaction history remains the source of actual outcomes.

The warehouse-operations iframe uses the parent PK WMS dialog and session. This module supplements the existing backend permissions; it is not a substitute for server authorization or an API-level authorization token for every destructive RPC.

Schema: `supabase-action-confirmations.sql`. Installed in the production PK WMS Supabase project on 2026-10-05. UI regression: `node tests/action-confirmation-browser.cjs` (isolated fixtures, no production deletion). Covers wrong credentials, another account, missing reason, audit failure, cancellation, one replay, ordinary controls, iframe requests and mobile bounds.
