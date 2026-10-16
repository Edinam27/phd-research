/**
 * Seeds a demo account so the studio can be explored immediately after setup.
 *
 *   npm run db:push && npm run db:seed
 *
 * Safe to re-run: it only creates what is missing.
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });
config();

import { getDb } from "./index";
import { manuscriptSections, manuscripts, notebooks, reviews, users } from "./schema";
import { getSections } from "../lib/guideline";

const DEMO_EMAIL = "demo@phdstudio.local";
const DEMO_PASSWORD = "research1234";

async function main() {
  const db = getDb();

  const existingUser = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  let userId = existingUser[0]?.id;

  if (!userId) {
    const inserted = await db
      .insert(users)
      .values({
        email: DEMO_EMAIL,
        name: "Demo Researcher",
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        institution: "University of Ghana",
        discipline: "Tourism marketing",
        academicRole: "PhD Candidate",
      })
      .returning({ id: users.id });
    userId = inserted[0].id;
    console.log(`Created demo account ${DEMO_EMAIL}`);
  } else {
    console.log(`Demo account ${DEMO_EMAIL} already exists — leaving it untouched.`);
  }

  const existingNotebook = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(eq(notebooks.ownerId, userId))
    .limit(1);

  let notebookId = existingNotebook[0]?.id;

  if (!notebookId) {
    const inserted = await db
      .insert(notebooks)
      .values({
        ownerId: userId,
        title: "Visitor heterogeneity and experience processing",
        description:
          "Doctoral study examining how heterogeneous visitor segments process the heritage experience, and what that means for destination loyalty.",
        researchArea: "Tourism marketing",
        studyType: "quantitative",
        status: "reviewing",
        targetJournal: "Tourism Management",
        keyVariables: ["Visitor heterogeneity", "Experience processing", "Destination loyalty"],
        researchProblem:
          "Heritage destinations design a single experience for visitors who process that experience in materially different ways, so satisfaction and loyalty models built on homogeneous samples misestimate the drivers of repeat visitation.",
        researchObjectives: [
          "Examine the effect of visitor heterogeneity on experience processing",
          "Determine how experience processing influences destination loyalty",
          "Assess the moderating role of heritage interpretation quality",
        ],
        theory: "Stimulus-Organism-Response",
        context: "Ghanaian heritage tourism",
      })
      .returning({ id: notebooks.id });
    notebookId = inserted[0].id;
    console.log("Created the demo notebook.");
  } else {
    console.log("Demo notebook already exists — skipping sample content.");
  }

  const existingReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.notebookId, notebookId))
    .limit(1);

  if (existingReviews.length === 0) {
    await db.insert(reviews).values([
      {
        notebookId,
        createdById: userId,
        author: "Mehmetoglu, M. and Engen, M.",
        year: 2011,
        title: "Pine and Gilmore's concept of experience economy and its dimensions: An empirical examination in tourism",
        journal: "Journal of Quality Assurance in Hospitality & Tourism, 12(4), 237-255",
        problemsGaps:
          "Establishes that the four experience-economy realms are distinct but empirically uneven. The stated gap is the absence of a validated dimensional structure; the unstated gap is that the realms are treated as universal rather than segment-dependent.",
        objectives:
          "To test whether the four experience realms (entertainment, education, escapism, aesthetics) form a measurable dimensional structure, and to establish each realm's relative contribution to tourist satisfaction.",
        theory:
          "Pine and Gilmore's experience economy, operationalised through the 4Es framework. The authors adopt it wholesale without interrogating how visitors with different prior knowledge might weight the realms differently.",
        empiricalFindings:
          "Prior work had established entertainment and aesthetics as the dominant realms and had largely dismissed education as a driver in leisure settings, while escapism showed inconsistent effects across studies.",
        methodology:
          "Quantitative survey of 318 tourists at a Norwegian nature-based attraction. Convenience sampling, self-administered questionnaire, 4E items on a 7-point Likert scale, exploratory then confirmatory factor analysis, structural equation modelling in AMOS.",
        keyFindings:
          "Aesthetics and escapism loaded as expected and predicted satisfaction; education loaded weakly, and entertainment did not reach significance in the structural model. Reported a four-factor solution with acceptable fit indices.",
        limitations:
          "Single Norwegian site with a convenience sample limits generalisability. The authors concede the realm measures are imported rather than revalidated. No segmentation is attempted, so heterogeneity in how realms are weighted is assumed away.",
        citation:
          "Mehmetoglu, M., & Engen, M. (2011). Pine and Gilmore's concept of experience economy and its dimensions. Journal of Quality Assurance in Hospitality & Tourism, 12(4), 237-255.",
        methodType: "Quantitative",
        sampleSize: "318 tourists",
        country: "Norway",
        context: "Nature-based attraction",
        dataAnalysis: "EFA, CFA, SEM",
        keyVariables: ["Experience realms", "Tourist satisfaction"],
        hypotheses: ["H1: Aesthetics positively affect satisfaction", "H2: Education positively affects satisfaction"],
        gapTags: ["contextual", "segmentation"],
        useInManuscript: "Baseline source for the experience-processing construct and for the 4E measures.",
        scoreRigour: 7,
        scoreRelevance: 8,
        scoreNovelty: 6,
        scoreClarity: 8,
        overallScore: 7.3,
        verdict: "include",
        strengths:
          "Transparent reporting of the factor structure and the structural model. Clear operationalisation of an otherwise abstract framework.",
        weaknesses:
          "Assumes a universal weighting of the experience realms and reports no moderation by visitor characteristics, which is exactly where my contribution sits.",
        reviewerNotes: "Use to justify the construct, then argue the segmentation gap that this paper leaves open.",
        status: "reviewed",
        sourceKind: "manual",
      },
      {
        notebookId,
        createdById: userId,
        author: "Cohen, E.",
        year: 1979,
        title: "A phenomenology of tourist experiences",
        journal: "Sociology, 13(2), 179-201",
        problemsGaps:
          "The paper sets out to correct the assumption that all tourists seek authentic experiences. Its gap is theoretical: tourism research had treated experience as uniform, and Cohen argues the mode of experience varies by the traveller's orientation.",
        objectives:
          "To construct a typology of tourist experience modes and to show how each mode implies a different relationship between the visitor and the destination's cultural centre.",
        theory:
          "A phenomenological reading of the sacred and the centre out of Durkheim, combined with a critique of authenticity as singular.",
        empiricalFindings:
          "Conceptual rather than empirical, but it draws on earlier field studies of touristic forms to argue that recreational, diversionary, experiential, experimental and existential modes coexist.",
        methodology:
          "Conceptual and interpretive. Typology construction grounded in existing ethnographic material rather than fresh data collection.",
        keyFindings:
          "Five experience modes are proposed, ordered by the traveller's distance from the destination's cultural centre. Different modes imply different authenticity demands.",
        limitations:
          "The typology is not empirically tested, and the categories are not operationalised for measurement. There is no discussion of how to classify a single visitor across modes.",
        citation: "Cohen, E. (1979). A phenomenology of tourist experiences. Sociology, 13(2), 179-201.",
        methodType: "Conceptual",
        country: "Israel",
        context: "Global tourism typology",
        dataAnalysis: "Conceptual analysis",
        keyVariables: ["Tourist experience modes", "Authenticity"],
        hypotheses: [],
        gapTags: ["theoretical", "measurement"],
        useInManuscript: "Theory anchor for heterogeneity: the claim that visitors process the same site differently.",
        scoreRigour: 5,
        scoreRelevance: 9,
        scoreNovelty: 9,
        scoreClarity: 7,
        overallScore: 7.5,
        verdict: "include",
        strengths:
          "Provides the theoretical warrant for segmentation that the empirical literature treats as an assumption rather than a finding.",
        weaknesses:
          "No operational measures, so it must be paired with a quantitative source before it can inform hypotheses.",
        reviewerNotes: "Cite for heterogeneity; pair with an empirical measurement paper before building H1.",
        status: "reviewed",
        sourceKind: "manual",
      },
    ]);
    console.log("Created two sample article reviews (the synthesis needs at least two).");
  } else {
    console.log("Sample reviews already exist — skipping.");
  }

  const existingManuscript = await db
    .select({ id: manuscripts.id })
    .from(manuscripts)
    .where(eq(manuscripts.notebookId, notebookId))
    .limit(1);

  if (existingManuscript.length === 0) {
    const inserted = await db
      .insert(manuscripts)
      .values({
        notebookId,
        createdById: userId,
        kind: "article",
        title: "Heterogeneous visitor processing of the heritage experience and its consequences for loyalty",
        targetJournal: "Tourism Management",
        studyType: "quantitative",
        status: "draft",
        abstract:
          "Heritage destinations typically design a single experience for visitors who process it very differently. Drawing on stimulus-organism-response reasoning, this study segments visitors by how they process the heritage encounter and tests whether segmentation explains variance in destination loyalty beyond the standard experience-economy measures.",
        keywords: ["heritage tourism", "experience processing", "segmentation", "destination loyalty"],
      })
      .returning({ id: manuscripts.id });

    const template = getSections("article", "quantitative");
    await db.insert(manuscriptSections).values(
      template.map((section, index) => ({
        manuscriptId: inserted[0].id,
        sectionKey: section.key,
        heading: section.heading,
        content: "",
        wordMin: section.wordMin,
        wordMax: section.wordMax,
        position: index,
        status: "empty" as const,
        checklistState: {},
      })),
    );
    console.log(`Created the demo manuscript with ${template.length} guideline sections.`);
  } else {
    console.log("Demo manuscript already exists — skipping.");
  }

  console.log("\nDone. Sign in with:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
