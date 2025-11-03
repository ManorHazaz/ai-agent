import { convertToModelMessages, streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('process.env.AI_GATEWAY_API_KEY', process.env.AI_GATEWAY_API_KEY);

    if (!process.env.AI_GATEWAY_API_KEY) {
      return new Response(
        'AI_GATEWAY_API_KEY environment variable is not set',
        { status: 500 }
      );
    }

    const modelId = process.env.MODEL_ID || 'openai/gpt-4o';

    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: modelId,
      messages: modelMessages,
      // temperature: 0.1,
      // topP: 0.3,
      // presencePenalty: 0.6,
      // frequencyPenalty: 0.8,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return new Response(
      `Error: ${error.message || 'Unknown error'}`,
      { status: 500 }
    );
  }
}
