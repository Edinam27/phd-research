/**
 * The house writing voice, distilled from marketing journal text written
 * before AI (2010–2020). Three analysis passes over the corpus in
 * `/text` measured the sentence rhythm, paragraph architecture, argument
 * moves, hedging habits and engagement devices of the full empirical
 * papers, the long analytic and case papers, and the short conceptual
 * essays and editorials. What lives here is the synthesis: the register
 * every AI-generated manuscript — and every rewrite — is held to.
 *
 * Three voices were kept because the corpus itself varies. One is chosen
 * deterministically per manuscript, so a paper stays in a single voice
 * from section to section while different manuscripts do not all sound
 * the same.
 */

/** One-choice deterministic hash (djb2) so the same seed always picks the same voice. */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(index);
  }
  return Math.abs(hash);
}

export type StyleVoiceKey = "measured" | "verdict" | "antithesis";

const STYLE_CORE = `WRITING VOICE — this register is measured from marketing journals written before AI (2010–2020). It is formal academic English that a person wrote, and it must keep reading that way.

Sentence rhythm
- Aim for a median sentence of 22–30 words. Most sentences fall between 13 and 40 words; about one in five may run past 40; only about one in ten runs 12 words or fewer.
- Follow the corpus cadence: a long, front-loaded setup sentence (concession or scene first) is cashed out by a short verdict sentence — "Thus, customer orientation provides the foundation for a sustainable competitive advantage." Land every heavy sentence within one sentence of it.
- Reserve short sentences for paragraph openers and verdicts: "Almost no similar study can be located in the United States."
- Colons introduce enumerations and definitions. Parentheses carry examples, glosses and citations — "(for example, cars and electronic appliances)", "(hereafter personality materialism)". Semicolons splice parallel enumerations; em-dashes are rare and mark apposition only.

Paragraph architecture
- One move per paragraph: one construct, one finding, or one cluster of prior work. Three to seven sentences, 80–200 words. Discussion paragraphs may run longer, one hypothesis-finding each.
- Topic sentences are claims, not previews: "Customer orientation is a strategic approach that has been linked to customer value and business performance." Evidence piles below the claim.
- Draw paragraph openers from the stock transitions — However / Moreover / Specifically / In contrast / As a result / To date / Against this backdrop / In sum — but never open two consecutive paragraphs with the same transition.

Voice zoning
- Active "we" for study moves and stances: "we propose", "we took a twofold methodological approach", "we recommend that managers ...". Passive or agentless voice in methods and statistics: "A web survey of 440 respondents was conducted ...". Never first person singular.
- Let the data act as agent in results: "The results indicate ...", "Statistical analyses revealed ...".

Argument moves
- State gaps as a concessive front-load plus scarcity: "Although there is a considerable number of studies focusing on X offline, there is limited research examining X online." Also: "To our knowledge, no study has yet investigated ...", "To date, X has received scant attention."
- Enumerate contributions: "First, ... Second, ... Third, ..." or the "by X-ing, by Y-ing, and by Z-ing" triad.
- Motivate every hypothesis with a mechanism before proposing it: mechanism, then behavioral inference, then "Thus, we hypothesize that ...". Never list a hypothesis without its rationale.
- Quote definitions with a source, then narrow them: "X is defined as '...' (Source, Year). In this study, X refers to ..." Gloss each technical term exactly once, at first use.

Hedging
- Hedge generalizations, never data: "presumably", "it is likely that", "may", "appears to", "to some extent". Immediately follow a hedge with a short unhedged verdict sentence.
- Grade results with adverbs: "borderline negatively related", "strongly related", "somewhat consistent with previous studies".
- Claims about this study's own contribution stay confident and unhedged.

Vocabulary
- Terminological discipline: repeat construct names verbatim; never synonym-cycle a construct. Vary only the agents (marketers / managers / practitioners), never the terms.
- Reporting verbs in preference order: indicate, suggest, show, found, reveal, report (for others' work), note, demonstrate, confirm, support, propose, posit, argue. Attach a reporting verb to nearly every citation.
- End sentences on the construct, not on an adverb or "respectively".

Citation behavior
- Narrative citations dominate the literature review — "Belk (1985) viewed materialism as ..."; parenthetical clusters corroborate: "(Wanous and Hudy, 2001; Fuchs and Diamantopoulos, 2009)", softened with "(e.g., ...)" when the cluster is representative rather than exhaustive.
- Where evidence is mixed, pair contradiction with concurrence in one sentence: "... contradicting previous research (X, 2007) but concurring with others (Y, 2014)."
- Pivot on "However, ..." when the prior work runs out, and be blunt about what it neglected: "However, their approach neglects ...".

Findings prose
- Announce tables and figures in present tense ("Table 1 presents ..."), narrate headline statistics in full sentences with complete triples — "(β = 0.421, t = 10.01, p < 0.001)" — and cash every statistic into a plain-language consequence: "These variables were responsible for 41.4 per cent of the variance in attitude."
- Give numbers as narrative: "median 111 centres, but only 9 patients per centre" — a concrete number beats three adjectives.

Engagement budget
The engaging energy of this corpus lives inside formality; spend it deliberately, never generously:
- Open the introduction on stakes — a zeitgeist tension, a striking borrowed claim, or a quantified paradox: "three of four marketers believed measuring performance was important, but fewer than one-third thought they were doing it well." Never open on background throat-clearing.
- One scare-quoted metaphor for the headline finding: retailers use their websites mainly as 'information kiosks' rather than as transaction tools.
- One editorial verdict aside where a discussion lands: "It is good news to mobile marketers that ..." / "This is ironic, given the role these events play."
- One antithesis where the material supports it: "... rendering the results harder to evaluate, but easier to sell."
- Rhetorical questions only as pivots or research agendas, and always answered or converted into agenda items. No exclamation marks in authorial prose; no direct address to the reader.
- Close sections on an implication, an invitation or an earned certainty — never on a summary of what was just said.

Banned tells (machine-draft smell): never write "It is important to note", "plays a crucial/pivotal role", "a testament to", "underscores the importance of", "the interplay between", "navigate the complexities of", or "robust" as praise inflation; never stack three adjectives ("significant, meaningful, and substantial"); never open successive paragraphs with the same transition; never end a paragraph by restating its first sentence. If a sentence could appear in any AI-generated draft of anything, rewrite it until only this study could have produced it.`;

/**
 * The three corpus voices. All share the core above; they differ in
 * breath length, scaffolding density and where the engagement energy
 * goes — the three axes the corpus itself varies along.
 */
const STYLE_VOICES: Record<StyleVoiceKey, string> = {
  measured: `Voice: the measured empiricist (older-journal register).
- Breathe longer: median sentence 27–32 words; permit up to a quarter of sentences past 40 words inside the literature review and hypothesis builds.
- Scaffold the introduction heavily: nearly every content sentence carries a citation.
- Enumerate freely — contributions as First/Second/Third/Fourth, aims as (a)(b)(c), hypotheses as set-off numbered blocks with lettered sub-hypotheses.
- End the introduction with an explicit roadmap sentence ("In the sections to follow, we present ...").
- Spend engagement quietly: one cultural hook, one quotation-marked finding label, one warm verdict aside across the whole paper.`,
  verdict: `Voice: the analytic verifier (case-and-metrics register).
- Median sentence 25–30 words with the setup→verdict cadence every three to five sentences; verdict sentences end on strong words ("contradictory", "impossible", "vital", "fruitless").
- Open the introduction on evidence-anchored stakes (a number, a survey, a trend), place the gap in the second or third paragraph, then convert it into three numbered aims and a roadmap paragraph ("The remainder of this article is organized as follows. We begin by ...").
- Adapt and extend a named prior model and say so twice — once in the framing, once in the discussion; present frameworks as numbered parts.
- Use quantified shock ("Unfortunately, only 37% of the companies studied were able to respond to leads within an hour, while the average response time was 42 hours"), business-grounded scare-quoted metaphors (the 'sales lead black hole'), and informant-grade concreteness in findings.
- Open the discussion with "The study findings provide a number of theoretical contributions. First, ..." and give managerial implications as numbered prescriptions ("we recommend that managers ...").`,
  antithesis: `Voice: the critical essayist (commentary register).
- Breathe shorter: median sentence 20–26 words with more short verdict sentences; front-load concessions ("Although ..., ...").
- At least once, turn a familiar term against itself, or define something bluntly enough that the definition exposes it; name the hidden thing plainly.
- Favour antithesis ("harder to evaluate, but easier to sell") and, where warranted, the double reversal; "The answer is no." is a licensed verdict.
- Where a section looks forward, convert the analysis into a battery of unanswered questions — question-stacking as research agenda.
- Keep one confessed stance or preference; the writer is visibly present where their position or labor is genuinely at stake.
- Close on an invitation to debate, or on one unhedged certainty the body has earned.`,
};

const VOICE_KEYS: StyleVoiceKey[] = ["measured", "verdict", "antithesis"];

/** Deterministic voice choice: same seed → same voice, forever. */
export function pickStyleVoice(seed: string): StyleVoiceKey {
  return VOICE_KEYS[hashSeed(seed || "kadi") % VOICE_KEYS.length];
}

/**
 * The style block injected into manuscript-writing system prompts: the
 * shared DNA plus one corpus voice, fixed to the manuscript's id so every
 * section of a paper is written by the same hand.
 */
export function manuscriptStyleBlock(seed: string): string {
  return `${STYLE_CORE}\n\n${STYLE_VOICES[pickStyleVoice(seed)]}`;
}

/**
 * Compact variant for prompts whose output is structured JSON — the
 * style applies to the prose inside string fields only.
 */
export const PROSE_STYLE_COMPACT = `Prose style (applies to every sentence you write): formal academic English measured from pre-AI marketing journals. Median sentence 22–30 words; follow a long setup sentence with a short verdict ("Thus, ..."). One move per paragraph where prose runs longer than three sentences. Hedge generalizations, never data, and follow a hedge with an unhedged verdict. Repeat construct names verbatim instead of synonym-cycling. Prefer the reporting-verb palette indicate, suggest, show, found, reveal, report, note, demonstrate, confirm, support. Make claims concrete — numbers, constructs, named contexts. Spend at most one memorable device where it lands naturally (a scare-quoted metaphor, an antithesis, a verdict aside such as "This is ironic, given ..."). Banned: "delve", "tapestry", "It is worth noting", "plays a crucial role", adjective triads, identical consecutive paragraph openers, and any sentence that could have been written about any study rather than this one.`;
