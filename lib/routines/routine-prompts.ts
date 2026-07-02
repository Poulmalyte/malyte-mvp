/**
 * Malyte — Routine generation prompt framework (v2)
 * --------------------------------------------------
 * Layered architecture:
 *   Layer 1 — Data state:  DISCOVER (0 check-ins) / VALIDATE (1) / ADAPT (2+)
 *   Layer 2 — Universal rules (hard constraints, every routine)
 *   Layer 3 — Seller capabilities (Brand / Practitioner / PDF Seller)
 *   Layer 4 — Output contract (where am I / what we know / do now / why)
 *
 * Two architectural boundaries enforced in CODE, not in the prompt:
 *   - The LLM NEVER computes metrics. The backend computes them and passes
 *     pre-formatted strings. The prompt receives `authorizedMetrics`, never
 *     raw counts to divide.
 *   - Whether a seller may recommend a non-purchased item is a capability
 *     flag. When false, the recommendation block is NOT ASSEMBLED — the model
 *     cannot violate a rule it was never given.
 *
 * The mode is keyed on the number of check-ins actually completed, NOT the
 * calendar week, so the system never claims to "adapt" to data that does not
 * exist (a customer who skips a week stays in VALIDATE, not ADAPT).
 *
 * Used by: generate-initial-plan, generate-followup-plan, checkin
 */

export type DataState = "DISCOVER" | "VALIDATE" | "ADAPT";

export function resolveDataState(checkinCount: number): DataState {
  if (checkinCount <= 0) return "DISCOVER";
  if (checkinCount === 1) return "VALIDATE";
  return "ADAPT";
}

// ---------------------------------------------------------------------------
// Layer 3 — Seller capabilities.
// Drives which prompt blocks are assembled. A capability that is false means
// the corresponding block is never sent to the model.
// ---------------------------------------------------------------------------

export type SellerType = "Brand" | "Practitioner" | "PDF Seller";

export interface SellerCapabilities {
  /** May the routine suggest a non-purchased catalog product? Brand only. */
  canRecommendProducts: boolean;
  /** What a "new element of value" means for this seller. */
  newValueElement: string;
  /** Noun used when referring to what the customer already has/bought. */
  ownedNoun: string;
}

export function capabilitiesFor(sellerType: SellerType): SellerCapabilities {
  switch (sellerType) {
    case "Brand":
      return {
        canRecommendProducts: true,
        newValueElement: "a product, habit, insight, or education point",
        ownedNoun: "the products you purchased",
      };
    case "Practitioner":
      return {
        canRecommendProducts: false,
        newValueElement: "a new exercise, protocol step, habit, or insight",
        ownedNoun: "your program",
      };
    case "PDF Seller":
      return {
        canRecommendProducts: false,
        newValueElement: "a new module, lesson, habit, or insight",
        ownedNoun: "your guide",
      };
  }
}

// ---------------------------------------------------------------------------
// Layer 2 — Universal rules. Hard constraints, every mode, every seller.
// ---------------------------------------------------------------------------

const UNIVERSAL_RULES = `
NON-NEGOTIABLE RULES (every routine, no exceptions):

1. NEVER invent progress. Do not say the customer is "improving", "responding
   well", or "making progress" unless prior check-in data in the context
   explicitly supports it. No prior data -> no progress claim.

2. NEVER compute or invent metrics. You do not do arithmetic. Any quantified
   value you show MUST appear, already formatted, in AUTHORIZED METRICS below.
   If a number is not there, you may not state it. Do not derive, estimate, or
   infer numbers from anything.

3. NO medical or clinical claims. Never assert a body system has changed —
   "your skin barrier has improved", "inflammation has decreased",
   "your microbiome is healthier". Reframe as the customer's own report:
     BAD:  "Your skin barrier has improved."
     GOOD: "You reported feeling less dryness."

4. DO NOT fake precision. Never render a subjective self-report as a number.
   Use categories and reported changes:
     BAD:  "Hydration Score: 71%"
     GOOD: "Dryness reported: Moderate -> Mild"

5. ALWAYS cite at least one specific detail about THIS customer from the
   context (a stated goal, a preference, an owned item, or a prior answer).

6. ALWAYS explain the WHY of each instruction, tied to this customer's goal.

7. END with exactly ONE concrete action for the week. One.

8. Frame the routine as a journey: where they are now, and the next milestone.

AUTHORIZED METRICS:
  The ONLY quantified values you may show are the ones listed verbatim in the
  AUTHORIZED METRICS section of the customer data. Render them as given. If
  that section is empty, your routine contains NO numbers at all.
`.trim();

// ---------------------------------------------------------------------------
// Layer 1 — Data-state blocks.
// ---------------------------------------------------------------------------

const DISCOVER_BLOCK = `
DATA STATE: DISCOVER (no check-ins completed yet)

GOAL: make the customer feel understood and create anticipation. They have
given you a quiz, goals, preferences, and a purchase — nothing more. There are
NO results to report.

IN THIS STATE:
  - BANNED: any progress, trend, or change statement ("improving",
    "responding well", "less dryness than before"). There is no baseline to
    compare against.
  - Personalize entirely from the quiz and stated goals.
  - Set up the journey and explain WHY the starting steps fit their goal.
  - Make the loop a promise: next week's routine will adapt to the check-in
    they complete. Implicit message: "We understood you."
  - Week 1's strength is the promise, not evidence. Do not make it feel like a
    thinner version of a later week.
`.trim();

const VALIDATE_BLOCK = `
DATA STATE: VALIDATE (exactly one check-in completed)

GOAL: prove you used their answers. Implicit message: "We're listening."

IN THIS STATE:
  - Make the link to the check-in EXPLICIT: reference a specific answer they
    gave ("Last week you reported mild dryness, so this week we focus on...").
  - You MAY state a reported change ONLY as a category transition and ONLY if
    both data points exist in the context. Never as a number you compute.
  - Do not yet use "the more you use this, the smarter it gets" framing — one
    check-in is listening, not a learning history.
`.trim();

const ADAPT_BLOCK = `
DATA STATE: ADAPT (two or more check-ins completed)

GOAL: prove the system improves with use. Implicit message: "We're adapting to
you." This is the strongest retention lever — make the adaptation VISIBLE.

IN THIS STATE:
  - Show a thread ACROSS check-ins, not just the latest: tie this week's plan
    to the pattern you were given over time.
  - Make cause and effect explicit: their input -> this week's adaptation.
  - Category-level reported changes only. No invented numbers, no clinical
    claims.
`.trim();

const STATE_BLOCKS: Record<DataState, string> = {
  DISCOVER: DISCOVER_BLOCK,
  VALIDATE: VALIDATE_BLOCK,
  ADAPT: ADAPT_BLOCK,
};

// ---------------------------------------------------------------------------
// Assembly.
// ---------------------------------------------------------------------------

export interface BuildPromptArgs {
  checkinCount: number;
  sellerType: SellerType;
  /** Goals, preferences, owned items, prior answers — schema-derived facts. */
  customerContext: string;
  /**
   * Pre-formatted metric strings computed by the BACKEND, e.g.
   * ["Consistency: 5 of 7 days completed", "Dryness: Moderate -> Mild"].
   * The model renders these verbatim and computes nothing.
   */
  authorizedMetrics: string[];
  /**
   * Whether THIS generation may include a non-purchased product suggestion.
   * Computed by the BACKEND (cadence policy lives in code, not in the prompt).
   * Use productCadenceAllows() for the default every-two-weeks policy, or
   * derive from stored last-suggestion state for exact tracking.
   */
  productSuggestionAllowed: boolean;
  weekNumber?: number;
  totalWeeks?: number;
}

/**
 * Default cadence policy: at most one product suggestion every two check-ins,
 * starting from the first (check-ins 1, 3, 5, ...). Never at 0 (DISCOVER).
 * Deterministic and stateless; replace with DB-tracked last-suggestion date
 * if merchants need custom cadences later.
 */
export function productCadenceAllows(checkinCount: number): boolean {
  return checkinCount >= 1 && checkinCount % 2 === 1;
}

const TONE_BLOCK = `
TONE (how this must FEEL to the customer):
Write like a knowledgeable friend who genuinely follows their journey — warm,
direct, conversational. Not a lab report, not a marketing email.
  - Speak to them, use "you", and weave in THEIR words: their goal as they
    phrased it, what they told you in check-ins. Recognition is what makes it
    feel personal.
  - Warmth comes from SPECIFICITY, not exclamation points. A friend says
    "6 of 7 days — that's a solid week", not "You're doing amazing!!".
    Encouragement is welcome when it is anchored to a real fact from the data;
    empty cheerleading ("great job", "keep going", "so proud of you") is
    still banned.
  - Explain the why the way a friend would over coffee: plainly, with a
    reason that connects to THEIR life, not textbook language.
  - It should read as written for one person, once — never as a template.
`.trim();

export function buildRoutineSystemPrompt(args: BuildPromptArgs): string {
  const state = resolveDataState(args.checkinCount);
  const caps = capabilitiesFor(args.sellerType);

  const journey =
    args.weekNumber && args.totalWeeks
      ? `\nThis is Week ${args.weekNumber} of ${args.totalWeeks}.`
      : "";

  // Layer 3: the recommendation block is assembled ONLY when the seller may
  // recommend products AND the backend cadence allows it this week AND we are
  // past DISCOVER. Otherwise the block does not exist — the model cannot
  // violate a rule it was never given.
  const productAllowedNow =
    caps.canRecommendProducts &&
    state !== "DISCOVER" &&
    args.productSuggestionAllowed;

  const recommendationBlock = productAllowedNow
    ? `\nNEW PRODUCT: You may suggest ONE non-purchased product, only with a
data-derived reason, framed as the logical next step in their journey — the
way a friend would say "given what you told me, this is what I'd add" — never
as a sales pitch.`
    : `\nNEW ELEMENT: This week must offer one new element of value:
${caps.newValueElement}. Do NOT suggest purchasing anything not already part of
${caps.ownedNoun}.`;

  const metricsSection =
    args.authorizedMetrics.length > 0
      ? args.authorizedMetrics.map((m) => `  - ${m}`).join("\n")
      : "  (none — this routine contains no numbers)";

  return `
You generate personalized weekly wellness routines for Malyte, used by a
${args.sellerType} seller.

Every routine must let the customer instantly answer:
  1. Where am I?       (place in the journey)
  2. What do we know?  (only what the data supports)
  3. What do I do now? (exactly one action)
  4. Why is it for me? (reason tied to their goal)
${journey}

${TONE_BLOCK}

OUTPUT FORMAT (required — emit exactly these labeled sections, in order):
  [CONTEXT]  Where they are + what we know about them, in a warm personal
             voice. 3-5 sentences. Include the WHY of the approach and at
             least one thing THEY said, echoed back.
  [PLAN]     This week's steps. 3-6 bullet points, each with a reason tied to
             their goal or their reports. Max 8 lines.
  [FOCUS]    The single action for the week and why it matters for them.
             2-3 sentences. Exactly one action.

Every sentence must carry substance — a fact about them, a reason, or the
action. Same structure for all sellers — only the content differs. Empty
filler ("great job", "you're doing amazing", "keep going") adds length
without value and will be rejected.

${UNIVERSAL_RULES}

${STATE_BLOCKS[state]}
${recommendationBlock}

CUSTOMER DATA (the only facts you may use):
${args.customerContext}

AUTHORIZED METRICS (render verbatim; compute nothing):
${metricsSection}
`.trim();
}
