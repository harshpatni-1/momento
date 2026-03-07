import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";

// Edge runtime = faster cold starts + streaming keeps connection alive
export const runtime = "edge";

const SYSTEM_PROMPT = `You are Momento — an AI assistant that creates actionable task lists.

When given a screenshot/image, first analyze what it shows, then create tasks.
When given text, create a helpful response with actionable steps.

Rules:
- Return well-formatted markdown
- Start with a brief summary
- Create a numbered task list with clear, actionable steps
- If it's a RECIPE: include ingredients list + cooking steps
- If it's a TERMINAL ERROR: identify the error, explain cause, give fix commands
- If it's a COURSE: create a learning roadmap with modules
- If it's CODE: identify issues and suggest improvements
- Add time estimates where helpful
- Use emojis to make it scannable
- At the end, add a "💾 Save as Obsidian Note" section with suggested tags

Be concise but thorough.`;

export async function POST(req: Request) {
    const { messages, image } = await req.json();

    // Screenshot mode: single fast call with vision model
    if (image) {
        const base64Data = image.split(",")[1];
        const imageBuffer = Buffer.from(base64Data, "base64");
        const userMsg = messages?.[messages.length - 1]?.content || "Analyze this screenshot and create a task list.";

        // Use Groq's Llama 4 Scout for vision since Google free tier is exhausted
        const result = await streamText({
            model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "image", image: imageBuffer },
                        { type: "text", text: userMsg },
                    ],
                },
            ],
        });
        return result.toTextStreamResponse();
    }

    // Text-only mode: Groq is ultra-fast (~1-2s)
    const result = await streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: SYSTEM_PROMPT,
        messages,
    });

    return result.toTextStreamResponse();
}
