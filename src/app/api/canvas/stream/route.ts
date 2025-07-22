import { NextRequest } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();

function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      clients.delete(controller);
    }
  });
}

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  return () => clients.delete(controller);
}

export function broadcastPixelUpdate(pixel: any) {
  broadcastUpdate({ type: 'pixel-update', data: pixel });
}

export async function GET(request: NextRequest) {
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