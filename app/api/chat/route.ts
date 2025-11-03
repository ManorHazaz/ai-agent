export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;
    const apiUrl = process.env.API_URL || 'https://api.openai.com/v1/chat/completions';
    
    if (!apiKey) {
      return new Response(
        'API_KEY or OPENAI_API_KEY environment variable is not set',
        { status: 500 }
      );
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.MODEL_ID || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 8192,
        temperature: 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Create a streaming transformer that converts OpenAI SSE format to AI SDK data stream format
    // The frontend expects lines in the format: "0:{"type":"text-delta","textDelta":"..."}\n"
    const transformer = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                // Format as AI SDK data stream: "0:{"type":"text-delta","textDelta":"..."}\n"
                const dataStreamChunk = `0:${JSON.stringify({ type: 'text-delta', textDelta: delta })}\n`;
                controller.enqueue(new TextEncoder().encode(dataStreamChunk));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      },
      flush(controller) {
        controller.terminate();
      },
    });

    const stream = response.body.pipeThrough(transformer);

    // Return response in the format expected by the frontend (AI SDK data stream format)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return new Response(
      `Error: ${error.message || 'Unknown error'}`,
      { status: 500 }
    );
  }
}
