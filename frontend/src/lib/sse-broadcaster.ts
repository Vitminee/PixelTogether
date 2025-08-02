import { PixelData } from '@/types/canvas';

const clients = new Set<ReadableStreamDefaultController>();

interface BroadcastData {
  type: string;
  data: unknown;
}

function broadcastUpdate(data: BroadcastData) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  console.log('Broadcasting to', clients.size, 'clients:', data);
  
  // Create a copy of clients to avoid issues during iteration
  const clientsArray = Array.from(clients);
  
  clientsArray.forEach(controller => {
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

export function broadcastPixelUpdate(pixel: PixelData) {
  console.log('Broadcasting pixel update:', pixel);
  broadcastUpdate({ type: 'pixel-update', data: pixel });
}

export function broadcastStatsUpdate(stats: { totalEdits: number; uniqueUsers: number }) {
  broadcastUpdate({ type: 'stats-update', data: stats });
}

export function broadcastRecentChanges(recentChanges: PixelData[]) {
  broadcastUpdate({ type: 'recent-changes', data: recentChanges });
}