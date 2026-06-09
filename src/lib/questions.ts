import type { ScoreRange } from '@/types'

export const QUESTIONS = [
  {
    id: 'Q1',
    section: 'Communication patterns',
    text: "When your child comes to you upset or frustrated, do you stop what you're doing to listen — without immediately offering advice or solutions?",
  },
  {
    id: 'Q2',
    section: 'Communication patterns',
    text: "In a typical week, how often do you and your child have a real conversation — not about schedules, homework, or chores, but about how they're actually feeling?",
  },
  {
    id: 'Q3',
    section: 'Emotional availability',
    text: "When your child is having a hard day, can they show you they're struggling — without worrying about your reaction or being told to \"toughen up\"?",
  },
  {
    id: 'Q4',
    section: 'Emotional availability',
    text: 'After a difficult moment between you and your child — an argument, a punishment, a misunderstanding — do you find a way to reconnect before the day ends?',
  },
  {
    id: 'Q5',
    section: 'Device habits',
    text: "During family meals or dedicated family time, are screens — yours and your child's — put away without negotiation?",
  },
  {
    id: 'Q6',
    section: 'Device habits',
    text: "When your child reaches for a screen, do they usually do so because they're genuinely bored or seeking entertainment — rather than avoiding you or an uncomfortable feeling?",
  },
  {
    id: 'Q7',
    section: 'Family routines',
    text: 'Does your family have at least one shared routine each day — a meal, a bedtime ritual, a morning check-in — that feels like genuine togetherness rather than just logistics?',
  },
  {
    id: 'Q8',
    section: 'Family routines',
    text: 'When life gets busy or stressful, does your family maintain the habits and rituals that keep you close — or do they quietly disappear?',
  },
  {
    id: 'Q9',
    section: 'Parent-child bonding',
    text: 'Does your child seek you out — not because they need something, but simply because they want to be near you or share something with you?',
  },
  {
    id: 'Q10',
    section: 'Parent-child bonding',
    text: 'Do you and your child share at least one activity — a hobby, a show, a walk, a joke — that belongs just to the two of you?',
  },
  {
    id: 'Q11',
    section: 'Behavior triggers',
    text: 'When your child acts out, pushes back, or shuts down, do you find yourself able to pause and ask "what\'s behind this?" before reacting?',
  },
  {
    id: 'Q12',
    section: 'Behavior triggers',
    text: 'After setting a boundary or consequence, does your child understand why — and do they still feel loved by you?',
  },
] as const

export const SCALE_LABELS = {
  1: 'Never',
  2: 'Rarely',
  3: 'Sometimes',
  4: 'Often',
  5: 'Always',
} as const

export const SCORE_LABELS: Record<ScoreRange, string> = {
  at_risk: 'Connection at risk',
  under_strain: 'Connection under strain',
  strong: 'Connection is strong',
}

export function getScoreRange(score: number): ScoreRange {
  if (score <= 29) return 'at_risk'
  if (score <= 46) return 'under_strain'
  return 'strong'
}

// Label for the call-to-action button shown on the results page and in emails.
// The link target is Ibironke's personal WhatsApp (set in admin settings).
// NOTE: wording is an open detail for Ibironke to confirm.
export const CTA_LABEL = 'Chat with Ibironke on WhatsApp'

// Instant results email copy — verbatim from Ibironke's toolkit (Part 4).
// [First name] and [SCORE] are substituted at send time; [CTA BUTTON] marks
// where the WhatsApp call-to-action button is injected.
export const EMAIL_COPY: Record<ScoreRange, { subject: string; body: string }> = {
  at_risk: {
    subject: 'Your Family Connection results, [First name]',
    body: `Hi [First name],

Thank you for taking the Family Connection Diagnosis™. I know it takes honesty to sit with those questions — and I want you to know that I don't take that lightly.

Your score of [SCORE]/60 places you in the Connection at Risk range.

I want to be straightforward with you: this score isn't about blame. It's about timing. The patterns that create distance between parents and children rarely happen because of one big moment — they build slowly, in the small decisions we make every day without realising their weight.

The encouraging truth is this: connection can be rebuilt. I've seen it happen in families where the gap felt enormous. It starts with understanding exactly where and why the distance formed — and then making a small number of deliberate changes.

Based on your responses, the areas I'd focus on first are:
→ Communication — creating the conditions where your child feels safe to come to you
→ Behavior — learning to read what difficult behavior is actually communicating
→ Emotional availability — making your presence felt, not just your presence known

I'd love to help you map this out personally.

A 1-on-1 Family Connection Session gives us the space to go deeper into your specific results, understand your family's unique dynamic, and build a reconnection plan that fits your real life — not a generic checklist.

[CTA BUTTON]

I'm glad you're here, [First name]. This is the right direction.

Warmly,
Ibironke`,
  },
  under_strain: {
    subject: 'Your Family Connection results, [First name]',
    body: `Hi [First name],

Your Family Connection Score is in — and I want to give you the full picture.

Your score of [SCORE]/60 places you in the Connection Under Strain range.

This is actually one of the most important scores to pay attention to — not because it signals crisis, but because it signals a window. You have real strengths in your home. And you also have areas where, without some intentional attention, the distance will quietly widen.

Based on your responses, here's what I'm noticing:

The areas where you're doing well are holding your family together. The areas under strain tend to be the ones that get deprioritised when life gets full — the routines, the repair moments after conflict, the device-free time that feels hard to protect.

These are fixable. Not with a complete overhaul, but with two or three consistent shifts.

If you'd like to know exactly what those shifts are for your family specifically, a Family Connection Session with me is the clearest next step.

[CTA BUTTON]

You're not far from where you want to be. Let's close the gap together.

Warmly,
Ibironke`,
  },
  strong: {
    subject: 'Your Family Connection results, [First name]',
    body: `Hi [First name],

Your results are in — and they're worth celebrating.

Your Family Connection Score of [SCORE]/60 places you in the Connection is Strong range.

This tells me that you've been doing something right, consistently. The warmth, the routines, the willingness to show up even when it's hard — your child is experiencing that, even on the days it doesn't feel like enough.

I also want to be honest with you: a strong score today doesn't mean the work is done. Family connection is a living, moving thing. As children grow, their needs shift — and the habits that worked beautifully at one stage can quietly stop working at the next.

The parents I worry least about are the ones who are curious and proactive. The fact that you took this diagnosis tells me you're one of them.

If you'd like to understand your score in more depth — including the subtle areas to keep an eye on as your child moves through their next developmental stage — a Family Connection Session is a great investment in staying ahead.

[CTA BUTTON]

Thank you for taking this seriously, [First name]. Your family is fortunate to have you.

Warmly,
Ibironke`,
  },
}

export const RESULTS_COPY: Record<ScoreRange, string> = {
  at_risk: `[First name], this score needs your attention now. And the fact that you're here, reading this, tells me you already sense that something important is slipping.

What your score tells us is that the distance between you and your child has been growing for a while — quietly, in the everyday moments. You may have noticed your child pulling away, conversations staying surface-level, or discipline that doesn't seem to stick no matter what you try.

That's not a parenting failure. That's a connection gap — and connection gaps can be closed.

But children don't wait for us to be ready. They grow, they pull away, and the window quietly narrows. The time to act is today, not someday.

Your three biggest areas to focus on right now:
→ Creating one consistent daily ritual that belongs just to the two of you
→ Responding to behavior with curiosity before consequence
→ Making space for your child's emotions without rushing to fix them

The next step is a 1-on-1 Family Connection Session with Ibironke, where we look closely at your specific score, identify the two or three changes that will make the biggest difference in your home, and build a practical reconnection plan together — starting now.

[CTA BUTTON]

You showed up for this diagnosis. That already tells me something important about the kind of parent you are. Don't let that courage go to waste.`,
  under_strain: `Your Family Connection Score: [SCORE]/60
Connection under strain

[First name], you have real strengths here — and this score shows them.

But this is not the moment to exhale.

You're showing up in some important ways. What your score also tells us is that in certain areas, the connection is quietly under pressure. The strongest connections don't break all at once — they erode slowly, in the small moments that keep getting pushed aside. If those areas aren't addressed, they tend to compound over time.

The good news: you're not starting from zero. You have something worth protecting here, and right now you're close enough to turn this around with the right support. You're making targeted adjustments to something that already has a foundation — and that matters.

Your three areas to strengthen:
→ Protecting your shared routines when life gets busy — these are your connection anchors
→ Reducing screen displacement during the moments that matter most
→ Rebuilding the habit of reconnecting after difficult moments

Many parents in this score range find that two or three small, consistent changes shift the entire dynamic at home within weeks — before the distance becomes the new normal.

If you'd like a personalised look at exactly where to focus, a Family Connection Session with Ibironke will pinpoint exactly where the distance is growing and map out your next steps clearly.

[CTA BUTTON]

You're closer than you think — close enough that the right moves now make all the difference.`,
  strong: `[First name], this is genuinely worth acknowledging.

A score in this range tells us that you've built something real at home — warmth, trust, and routines that hold. Your child knows you're there. That doesn't happen by accident.

What your score also shows us is that even the strongest connections need a community around them to stay that way. Consistency is easy when life is calm — it's the busy seasons, the hard days, and the unexpected transitions that test what you've built.

As your child grows and their needs shift, staying intentional becomes the work.

Your focus areas going forward:
→ Staying curious as your child enters new developmental stages
→ Protecting the rituals that have been holding your connection together
→ Staying ahead of screen habits before they become the default

Parents with strong scores often find the most value in surrounding themselves with others who are equally committed. Because staying consistent alone is harder than it looks — and accountability is what separates families who thrive long-term from those who wonder what quietly changed.

[CTA BUTTON]

Well done for doing this. Your family feels the difference — even when they don't say it.`,
}
