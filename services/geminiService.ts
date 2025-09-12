
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available from environment variables.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    // In a real app, this might be handled more gracefully, but for this context, throwing an error is clear.
    throw new Error("API_KEY environment variable is not set. Please provide a valid Google AI API key.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Sends an image of a math limit problem to the Gemini API and returns a step-by-step solution.
 * @param base64Image The base64-encoded image string.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns A promise that resolves to the solution text from the API.
 */
export const solveLimitFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        };

        const textPart = {
            text: `វិភាគលំហាត់លីមីតគណិតវិទ្យានៅក្នុងរូបភាពនេះ។ នៅលើបន្ទាត់ទីមួយ សូមសរសេរតែលំហាត់ដើមជាទម្រង់ LaTeX នៅក្នុង Markdown heading level 2 (ឧទាហរណ៍៖ ## $\\lim_{x \\to 1} \\frac{x^2-1}{x-1}$)។ បន្ទាប់មក ចាប់ផ្តើមបន្ទាត់ថ្មីមួយទៀត រួចផ្តល់ដំណោះស្រាយលម្អិតមួយជំហានម្តងៗ ដោយពន្យល់ពីជំហាននីមួយៗឱ្យបានច្បាស់លាស់។ បញ្ចប់ដោយចម្លើយចុងក្រោយ។ សូមសរសេរចម្លើយទាំងមូលជាភាសាខ្មែរ។ ប្រើប្រាស់ Markdown សម្រាប់ធ្វើការរចនា និងប្រើវាក្យសម្ព័ន្ធ LaTeX សម្រាប់កន្សោមគណិតវិទ្យា។

**CRITICAL RENDERING RULES (MUST FOLLOW):**
1.  **NEVER use raw Unicode characters for math symbols.** For example, NEVER type '≠', '→', or '∞' directly in the text.
2.  **ALWAYS use LaTeX commands inside dollar signs for all math symbols.** Use \`$\\ne$\` for the 'not equal' symbol. Use \`$\\to$\` for arrows. Use \`$\\infty$\` for infinity.
3.  **EVERYTHING mathematical must be inside dollar signs.** This includes single variables (like \`$x$\`), numbers (like \`$1$\`), and full expressions.
4.  Correct example: \`...ដូច្នេះ $x \\ne 1$...\`
5.  Incorrect example: \`...ដូច្នេះ x ≠ 1...\`
Following these rules is mandatory for correct display.`,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        
        return response.text;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Provide a user-friendly error message in Khmer
        if (error instanceof Error) {
            return `មានបញ្ហាក្នុងការទាក់ទងទៅកាន់សេវាកម្ម AI: ${error.message}`;
        }
        return "មានបញ្ហាដែលមិនអាចកំណត់បានកើតឡើងនៅពេលព្យាយាមដោះស្រាយលំហាត់។";
    }
};