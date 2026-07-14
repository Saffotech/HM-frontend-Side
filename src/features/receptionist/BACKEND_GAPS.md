# Receptionist — future backend enhancements (documentation only)

This list records data the frontend cannot display cleanly because the **current** backend receptionist APIs do not provide it.

**Full fix guide:** see `HM-Backend/BACKEND_RECEPTIONIST_DUPLICATE_FIX.md`

## Gaps

1. **`scheduled_at` on queue / history items**  
   `QueueItemOut` has no `scheduled_at`. Frontend cannot show booked slot time (1:00 PM) until backend adds it.

2. **Inflated dashboard scheduled count**  
   `GET /receptionist/dashboard` → `todays_paid_appointments` over-counts when duplicate appointments exist. Backend should return canonical counts.

3. **Duplicate rows in today queue**  
   Same patient can appear twice when registration created walk-in + slot appointments.

4. **Department on queue / history items**  
   Partially available via doctor join; may show `—` when missing.

5. **Room number** — not on queue rows.

6. **Token / queue token number** — not on appointment/queue rows.

7. **Doctor master list** — filters use schedule endpoint, not a dedicated doctors API.
