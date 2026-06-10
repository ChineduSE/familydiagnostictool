-- Family Connection Diagnosis — update the WhatsApp pre-written message
-- Run AFTER 003.
--
-- Ibironke's preferred multi-line format with guidance bullet points.
-- [First name] and [SCORE] are filled in per parent at send time; the newlines
-- render as line breaks in WhatsApp. Dollar-quoting ($$) preserves the line
-- breaks and apostrophes literally.

update public.settings
set whatsapp_message_template = $$Hi Ibironke.
This is [First name].

I've just taken the Family Connection Assessment and scored [SCORE]/60.

I'm concerned about my results and would love your guidance on:

- what this score means for my family
- and the next practical steps to take.$$
where id = 1;
