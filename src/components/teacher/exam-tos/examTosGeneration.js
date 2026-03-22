import { callGeminiWithLimitCheck } from '../../../services/aiService';
import { getExamComponentPrompt } from './examTosPrompts';

// --- ATOMIC GENERATION HELPERS ---

export const sanitizeJsonComponent = (aiResponse) => {
    try {
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }
        const jsonString = aiResponse.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, "Preview:", aiResponse.substring(0, 300));
        throw new Error(`The AI component response was not valid JSON.`);
    }
};

// --- BATCHING HELPER: Generates a small chunk of questions to avoid 504 Timeouts ---
export const generateSingleBatch = async (guideData, generatedTos, batchTestType, previousQuestionsSummary, isGenerationRunningRef, maxRetries) => {
    const prompt = getExamComponentPrompt(guideData, generatedTos, batchTestType, previousQuestionsSummary);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        try {
            // FORCE LOGIC TIER FOR EXAM QUESTIONS
            const aiResponse = await callGeminiWithLimitCheck(prompt, { forceTier: 'logic' });

            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            const jsonData = sanitizeJsonComponent(aiResponse);

            // Artificial delay to prevent hitting rate limits too hard between retries
            await new Promise(res => setTimeout(res, 1000));

            return jsonData;

        } catch (error) {
            if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for batch ${batchTestType.range}:`,
                error.message
            );
            if (attempt === maxRetries - 1) {
                throw error; // Re-throw to be caught by the parent
            }
            // Increase delay on failure
            await new Promise(res => setTimeout(res, 3000 * (attempt + 1)));
        }
    }
};

export const generateExamComponent = async (guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries = 3) => {
    // 1. Analyze the Request
    const { type, range } = testType;
    const normalizedType = type.toLowerCase();

    // Check if this is a "Single Item" type (Essay/Solving) where range implies points, not count.
    // We do NOT batch these because they are single prompts.
    const isSingleQuestionType = normalizedType.includes('essay') || normalizedType.includes('solving');

    if (isSingleQuestionType) {
        return await generateSingleBatch(guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries);
    }

    // 2. Parse Range for splitting (e.g., "1-20")
    // Handles simple ranges "1-20" or single numbers "1"
    const rangeParts = range.split('-').map(s => parseInt(s.trim()));
    const startItem = rangeParts[0];
    const endItem = rangeParts.length > 1 ? rangeParts[1] : startItem;
    const totalItems = endItem - startItem + 1;

    // 3. Define Batch Size (Safe limit for Serverless Functions is usually ~5 items)
    const BATCH_SIZE = 5;

    // If request is small enough, just do it in one go.
    if (totalItems <= BATCH_SIZE) {
        return await generateSingleBatch(guideData, generatedTos, testType, previousQuestionsSummary, isGenerationRunningRef, maxRetries);
    }

    // 4. Batching Logic
    console.log(`Splitting ${type} (${range}) into batches of ${BATCH_SIZE}...`);
    let allQuestions = [];

    // Loop through the range in steps of BATCH_SIZE
    for (let i = startItem; i <= endItem; i += BATCH_SIZE) {
        if (!isGenerationRunningRef.current) throw new Error("Generation aborted by user.");

        const batchStart = i;
        const batchEnd = Math.min(i + BATCH_SIZE - 1, endItem);
        const batchRange = `${batchStart}-${batchEnd}`;
        const batchNumItems = batchEnd - batchStart + 1;

        // Create a temporary testType config for this specific batch
        const batchTestType = {
            ...testType,
            range: batchRange,
            numItems: batchNumItems
        };

        try {
            // Pass accumulated summary to avoid duplicates across batches
            // Note: We append the questions we've ALREADY generated in this loop to the summary
            const currentSummary = previousQuestionsSummary +
                (allQuestions.length > 0 ? "\n[Recently Generated]:\n" + allQuestions.map(q => q.question).join('\n') : "");

            const batchResult = await generateSingleBatch(
                guideData,
                generatedTos,
                batchTestType,
                currentSummary,
                isGenerationRunningRef,
                maxRetries
            );

            if (batchResult && batchResult.questions) {
                allQuestions = [...allQuestions, ...batchResult.questions];
            }
        } catch (err) {
            console.error(`Batch ${batchRange} failed:`, err);
            // Optional: We could choose to continue with partial results, but throwing ensures integrity.
            throw new Error(`Failed to generate items ${batchRange}: ${err.message}`);
        }
    }

    return { questions: allQuestions };
};
