# Calendar refresh policy

Calendar reads no longer run unconditionally every 30 seconds while the document is visible.

- Postgres Changes remains the main update source. Event bursts are debounced by 180ms.
- A healthy subscription and successful calendar load use a 15-minute safety refresh, rather than 30-second polling: four scheduled reads per visible hour instead of 120, excluding changes, manual opens, writes and resume events.
- A failed/disconnected subscription or failed read falls back to a two-minute retry interval.
- Subscription recovery and document resume fetch current data. Account changes invalidate older responses and request fresh data.
- One refresh runs at a time. A change/write that arrives during an active read queues one follow-up read.
- Hidden documents do not make scheduled calendar reads; missed changes are fetched on resume.
- The existing 30-second local reminder update remains. Notification times can advance without querying Supabase.
- Startup avoids a second read when there were no legacy events to migrate. Existing versioned saves/deletes and migration rules remain in place.

Validation: 105 Node tests passed. Controlled-clock browser tests at 1440px and 390px verify no 30-second network polling while healthy, the 15-minute safety fetch, two-minute fallback, event burst coalescing, one active query with a follow-up, reconnect and hidden/resumed behaviour. Read-only production SQL confirmed `public.event_calendar` remains in `supabase_realtime`. No database configuration, calendar records or permissions were modified.

This reduces scheduled client requests. It does not promise a particular total request count for all users over the next 24 hours; actual activity, connections and manual actions also contribute.

Reference: [Supabase subscription status callback](https://supabase.com/docs/reference/javascript/subscribe).
