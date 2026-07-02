/**
 * Malyte — Routine validator
 * ---------------------------
 * Deterministic enforcement layer that runs AFTER generation and BEFORE the
 * customer sees anything. The prompt reduces violation frequency; this
 * guarantees violations don't reach the customer.
 *
 * Design principles (deliberate, learned from production AI systems):
 *
 *  1. PRECISION OVER AGGRESSION. A validator that produces false positives
 *     gets disabled by the team and then protects nothing. Every check here
 *     fails ONLY on a real, specific violation — never on an ambiguous case.
 *     We would rather let a rare ambiguous case through (caught by logging /
 *     review) than block a valid routine.
 *
 *  2. NO BLIND NUMERAL MATCHING. We do NOT fail because the text contains a
 *     "%" or the word "score". We fail only when the output contains a NUMBER
 *     THAT WAS NOT AUTHORIZED — i.e. a number the backend never passed in.
 *     That is deterministic and has no false positives on legitimate phrasing.
 *
 *  3. INDEPENDENT BOOLEAN CHECKS, NOT A COMPOSITE SCORE. Each check passes or
 *     fails with a readable name. When a routine fails we know WHICH check and
 *     WHY — auditable and unit-testable. We deliberately avoid a 0-100
 *     "quality score" with an arbitrary threshold: it hides the reason and
 *     usually smuggles a second LLM back into the deterministic layer.
 *
 *  4. CAPABILITY-AWARE. A product mention is a violation for a PDF Seller and
 *     fine for a Brand. The validator must be told the seller's capabilities.
 */

import type { SellerCapabilities, DataState } from "./routine-prompts";

export interface ValidationInput {
  /** The routine text the model produced. */
  output: string;
  capabilities: SellerCapabilities;
  dataState: DataState;
  /**
   * Whether the backend cadence policy allowed a product suggestion for THIS
   * generation. When false, purchase-intent phrasing is a violation even for
   * a Brand — an off-week Brand is treated like a non-product seller.
   */
  productSuggestionAllowed: boolean;
  /**
   * The exact metric strings the backend authorized, e.g.
   * ["Consistency: 5 of 7 days completed", "Dryness: Moderate -> Mild"].
   * Any number in `output` not traceable to these is unauthorized.
   */
  authorizedMetrics: string[];
}

export interface ValidationFailure {
  check: string;
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  failures: ValidationFailure[];
}

// ---------------------------------------------------------------------------
// Check 1 — Clinical claims (high-damage, specific phrases).
// Specific multi-word phrases only, to keep false positives near zero.
// ---------------------------------------------------------------------------

const CLINICAL_PATTERNS: RegExp[] = [
  /\bbarrier (?:has|is|was) (?:improv|repair|restor|strengthen)/i,
  /\binflammation (?:has|is|was|decreas|reduc|lower)/i,
  /\bmicrobiome (?:has|is|improv|healthier|balanced)/i,
  /\bclinically (?:proven|shown|tested)/i,
  /\bmedically (?:proven|shown)/i,
  /\b(?:cures?|treats?|heals?) (?:your )?(?:acne|eczema|rosacea|condition)/i,
  /\b(?:reduces?|reverses?) (?:signs of )?aging\b/i,
  /\bskin age (?:reduc|decreas|lower|younger)/i,
];

function checkClinicalClaims(output: string): ValidationFailure[] {
  const hits: ValidationFailure[] = [];
  for (const pattern of CLINICAL_PATTERNS) {
    const m = output.match(pattern);
    if (m) {
      hits.push({
        check: "hasClinicalClaim",
        detail: `Unsupported clinical claim: "${m[0]}"`,
      });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Check 2 — Unauthorized numbers.
// Extract every number-bearing token from the output, then from the authorized
// metrics. Any output number not present in the authorized set is a violation.
// Years/step-counts that are plainly structural ("Week 2 of 12", "3 steps")
// are allowed via an explicit structural whitelist so we don't false-positive.
// ---------------------------------------------------------------------------

function extractNumbers(text: string): string[] {
  // Matches integers, decimals, and percentages.
  return (text.match(/\d+(?:\.\d+)?%?/g) ?? []).map((s) => s.trim());
}

interface NumberOccurrence {
  token: string;
  index: number;
}

/** Every occurrence of every number, with its own position in the text. */
function extractNumberOccurrences(text: string): NumberOccurrence[] {
  const out: NumberOccurrence[] = [];
  const re = /\d+(?:\.\d+)?%?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ token: m[0], index: m.index });
  }
  return out;
}

// Structural numbers are part of journey framing, not metrics.
// IMPORTANT: evaluated PER OCCURRENCE, at its own position. The same numeral
// can be structural in one place ("Week 2 of 12") and a fabricated metric in
// another ("improved by 12") within the same routine — a first-occurrence
// lookup would whitelist both.
function isStructuralAt(occ: NumberOccurrence, output: string): boolean {
  const window = output.slice(
    Math.max(0, occ.index - 12),
    occ.index + occ.token.length + 12,
  );
  // "Week 2 of 12", "Day 3", "3 steps", "6 days", "twice a day"
  return /\b(?:week|day|days|of|step|steps|phase|month|times?|time)\b/i.test(window) &&
    !occ.token.includes("%");
}

function checkUnauthorizedNumbers(
  output: string,
  authorizedMetrics: string[],
): ValidationFailure[] {
  const authorized = new Set(
    authorizedMetrics.flatMap((m) => extractNumbers(m)),
  );
  const failures: ValidationFailure[] = [];
  for (const occ of extractNumberOccurrences(output)) {
    if (authorized.has(occ.token)) continue;
    if (isStructuralAt(occ, output)) continue;
    failures.push({
      check: "hasUnauthorizedNumber",
      detail: `Number "${occ.token}" (position ${occ.index}) not in authorized metrics and not structural.`,
    });
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Check 3 — Product mention when the seller may not recommend products.
// Only fires when capabilities.canRecommendProducts === false.
// Uses purchase-intent phrasing, not the bare word "product", to stay precise.
// ---------------------------------------------------------------------------

const PURCHASE_INTENT: RegExp[] = [
  /\bbuy\b/i,
  /\bpurchase\b/i,
  /\border\b/i,
  /\bshop now\b/i,
  /\badd to cart\b/i,
  /\bbundle\b/i,
  /\bcheckout\b/i,
  /\b(?:our|the) (?:starter|premium|pro) (?:kit|pack|set)\b/i,
];

function checkDisallowedProductMention(
  output: string,
  capabilities: SellerCapabilities,
  productSuggestionAllowed: boolean,
): ValidationFailure[] {
  // Purchase intent is allowed only when the seller CAN recommend products
  // AND the backend cadence allowed it for this generation.
  if (capabilities.canRecommendProducts && productSuggestionAllowed) return [];
  const failures: ValidationFailure[] = [];
  for (const pattern of PURCHASE_INTENT) {
    const m = output.match(pattern);
    if (m) {
      failures.push({
        check: "disallowedProductMention",
        detail: capabilities.canRecommendProducts
          ? `Product cadence is off this week, but output contains "${m[0]}".`
          : `Seller cannot recommend products, but output contains "${m[0]}".`,
      });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Check 4 — Missing historical reference in VALIDATE / ADAPT.
// If we claim to be listening/adapting, the routine must reference prior data.
// We satisfy this if the output contains an explicit backward reference. This
// is a presence check on specific connective phrasing, so it does not false-
// positive on forward-looking language.
// ---------------------------------------------------------------------------

const BACKREF_PATTERNS: RegExp[] = [
  /\blast week\b/i,
  /\bpreviously\b/i,
  /\byou reported\b/i,
  /\byou (?:told|mentioned|said|noted)\b/i,
  /\bover the (?:last|past) (?:few |couple )?weeks?\b/i,
  /\bsince (?:last week|you started)\b/i,
  /\bcompared (?:to|with) (?:last|your previous)\b/i,
];

function checkHistoricalReference(
  output: string,
  dataState: DataState,
): ValidationFailure[] {
  if (dataState === "DISCOVER") return [];
  const hasBackref = BACKREF_PATTERNS.some((p) => p.test(output));
  if (hasBackref) return [];
  return [
    {
      check: "missingHistoricalReference",
      detail: `${dataState} routine must reference prior check-in data, but no backward reference was found. The learning loop is invisible.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Check 5 — Progress claim in DISCOVER (no baseline exists yet).
// ---------------------------------------------------------------------------

const PROGRESS_PATTERNS: RegExp[] = [
  /\b(?:you(?:'re| are)) (?:improving|progressing|responding well)\b/i,
  /\bgreat progress\b/i,
  /\b(?:less|more|better|reduced) \w+ than (?:last week|before|week 1)\b/i,
  /\byour \w+ (?:has|is) (?:improving|improved|better)\b/i,
];

function checkProgressInDiscover(
  output: string,
  dataState: DataState,
): ValidationFailure[] {
  if (dataState !== "DISCOVER") return [];
  const failures: ValidationFailure[] = [];
  for (const pattern of PROGRESS_PATTERNS) {
    const m = output.match(pattern);
    if (m) {
      failures.push({
        check: "progressClaimWithoutBaseline",
        detail: `DISCOVER routine claims progress ("${m[0]}") but no baseline exists.`,
      });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Top-level validator.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Check 6 — Structure completeness + per-section sentence cap.
//
// The routine must be emitted as labeled sections:
//   [CONTEXT] where they are + what we know + why (1-3 sentences)
//   [PLAN]    this week's steps (2-4 bullets, max 5 lines)
//   [FOCUS]   the single action of the week (1-2 sentences)
// Completeness is checked deterministically; bloat is prevented by capping
// sentences PER SECTION, not per total — a total word/reading-time limit is
// arbitrary and language-dependent, while a per-section cap keeps each part
// tight and lets total length self-regulate.
// ---------------------------------------------------------------------------

const REQUIRED_SECTIONS: Record<DataState, string[]> = {
  DISCOVER: ["CONTEXT", "PLAN", "FOCUS"],
  VALIDATE: ["CONTEXT", "PLAN", "FOCUS"],
  ADAPT: ["CONTEXT", "PLAN", "FOCUS"],
};

const SECTION_SENTENCE_CAP: Record<string, number> = {
  CONTEXT: 5,
  PLAN: 8,
  FOCUS: 3,
};

function extractRoutineSections(output: string): Map<string, string> {
  const sections = new Map<string, string>();
  const re = /\[([A-Z]+)\]\s*([\s\S]*?)(?=\n?\[[A-Z]+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output)) !== null) {
    sections.set(m[1].toUpperCase(), m[2].trim());
  }
  return sections;
}

function countSentences(text: string): number {
  const bullets = (text.match(/^\s*[-*•]/gm) ?? []).length;
  if (bullets > 0) return bullets;
  const terminators = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  return Math.max(terminators, text.trim().length > 0 ? 1 : 0);
}

function checkStructure(
  output: string,
  dataState: DataState,
): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const sections = extractRoutineSections(output);

  for (const required of REQUIRED_SECTIONS[dataState]) {
    if (!sections.has(required) || sections.get(required)!.length === 0) {
      failures.push({
        check: "missingSection",
        detail: `${dataState} routine is missing required section [${required}].`,
      });
    }
  }

  for (const [label, body] of sections) {
    const cap = SECTION_SENTENCE_CAP[label];
    if (cap !== undefined && countSentences(body) > cap) {
      failures.push({
        check: "sectionTooLong",
        detail: `Section [${label}] exceeds its ${cap}-sentence cap (bloat risk).`,
      });
    }
  }

  return failures;
}

export function validateRoutine(input: ValidationInput): ValidationResult {
  const failures: ValidationFailure[] = [
    ...checkClinicalClaims(input.output),
    ...checkUnauthorizedNumbers(input.output, input.authorizedMetrics),
    ...checkDisallowedProductMention(
      input.output,
      input.capabilities,
      input.productSuggestionAllowed,
    ),
    ...checkHistoricalReference(input.output, input.dataState),
    ...checkProgressInDiscover(input.output, input.dataState),
    ...checkStructure(input.output, input.dataState),
  ];
  return { ok: failures.length === 0, failures };
}

/**
 * Suggested call site (generate-followup-plan / checkin):
 *
 *   let result = validateRoutine({ output, capabilities, dataState, authorizedMetrics });
 *   if (!result.ok) {
 *     logger.warn("routine.validation.failed", { failures: result.failures });
 *     // Feed the failure reasons INTO the retry — a blind regenerate has the
 *     // same odds of failing again; a corrective retry converges much faster:
 *     output = await regenerate({
 *       correction: result.failures.map(f => f.detail).join("\n"),
 *     });
 *     result = validateRoutine({ output, capabilities, dataState, authorizedMetrics });
 *     if (!result.ok) {
 *       // Do NOT ship a failing routine. A safe template beats a wrong one.
 *       return safeFallbackRoutine();
 *     }
 *   }
 *   return output;
 *
 * KNOWN LIMITATION: all pattern lists (clinical claims, purchase intent,
 * backward references) are ENGLISH-ONLY. If routines are ever generated in
 * another language, checks 1/3/4 silently pass everything (fail-open). Add a
 * language guard or localized pattern sets before multi-language rollout.
 */
