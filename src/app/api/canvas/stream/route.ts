import { NextRequest } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();

function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  console.log('Broadcasting to', clients.size, 'clients:', data);
  
  clients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      clients.delete(controller);
    }
  });
}

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  console.log('Client connected. Total clients:', clients.size);
  
  // Broadcast updated user count
  broadcastUpdate({ type: 'user-count', data: { count: clients.size } });
  
  return () => {
    clients.delete(controller);
    console.log('Client disconnected. Total clients:', clients.size);
    
    // Broadcast updated user count
    broadcastUpdate({ type: 'user-count', data: { count: clients.size } });
  };
}

export function broadcastPixelUpdate(pixel: any) {
  console.log('Broadcasting pixel update:', pixel);
  broadcastUpdate({ type: 'pixel-update', data: pixel });
}

export function broadcastStatsUpdate(stats: any) {
  broadcastUpdate({ type: 'stats-update', data: stats });
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