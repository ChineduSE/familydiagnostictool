-- Family Connection Diagnosis — WhatsApp CTA settings
-- Run AFTER 001 and 002.
--
-- Adds the WhatsApp number + pre-written message template to settings, and
-- seeds them. The results page and instant email build a personalised wa.me
-- link from these (with each parent's first name and score filled in). In
-- Phase 4 the Settings page lets Ibironke edit these without code.

alter table public.settings
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_message_template text;

update public.settings
set
  whatsapp_number = '2348087687732',
  whatsapp_message_template =
    'Hi Ibironke, this is [First name]. My Family Connection score was [SCORE]/60 and I''d really love your guidance on what to do next.'
where id = 1;
