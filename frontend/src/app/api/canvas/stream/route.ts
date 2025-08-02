import { addClient } from '@/lib/sse-broadcaster';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
      
      const removeClient = addClient(controller);
      
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
          removeClient();
        }
      }, 30000);

      return () => {
        clearInterval(keepAlive);
        removeClient();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}