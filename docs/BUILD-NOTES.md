# Build Notes

## Product decisions

- Use Resend Broadcast Scheduling instead of Vercel Cron.
- Do not collect a child age range.
- Show a concise disclaimer: the result is a guided self-assessment, not a clinical diagnosis.
- Keep assessment history when the same parent submits more than once.
- Only add a contact to marketing broadcasts after explicit consent.

## Current implementation

- Public intro, quiz, gate, and results pages are implemented.
- The quiz resumes from `localStorage`.
- Results are passed to the results page through `sessionStorage`.
- `/api/submit` validates answers and calculates score and range server-side.
- Supabase persistence activates when server credentials are configured.
- The initial database migration introduces contacts, assessments, broadcasts, outbound email records,
  webhook event deduplication, and settings.

## Next slice

- Wire the contact upsert and instant results email.
- Add Resend contact and segment synchronization.
- Add admin authentication and respondent views.
- Build the broadcast composer using Resend Broadcast Scheduling.
