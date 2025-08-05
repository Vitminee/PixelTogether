package websocket

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"pixeltogether/backend/internal/types"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin in development
	},
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	log.Printf("Hub started and waiting for events...")
	for {
		select {
		case client := <-h.register:
			log.Printf("=== HUB: Processing client registration ===")
			h.clients[client] = true
			log.Printf("Client connected. Total clients: %d", len(h.clients))
			
			// Send welcome message (non-blocking)
			welcome := types.WSMessage{
				Type: "connected",
				Data: map[string]string{"message": "Connected to PixelTogether"},
			}
			if data, err := json.Marshal(welcome); err == nil {
				log.Printf("Sending welcome message to new client")
				select {
				case client.send <- data:
					log.Printf("Welcome message sent successfully")
				default:
					log.Printf("WARNING: Could not send welcome message - client channel full")
				}
			}
			
			// Broadcast updated online count to all clients
			go h.broadcastOnlineCount() // Use goroutine to prevent blocking

		case client := <-h.unregister:
			log.Printf("=== HUB: Processing client unregistration ===")
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client disconnected. Total clients: %d", len(h.clients))
				
				// Broadcast updated online count to remaining clients
				go h.broadcastOnlineCount() // Use goroutine to prevent blocking
			}

		case message := <-h.broadcast:
			log.Printf("=== HUB: Processing broadcast to %d clients ===", len(h.clients))
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) BroadcastPixelUpdate(pixel types.Pixel) {
	log.Printf("=== BROADCASTING PIXEL UPDATE ===")
	log.Printf("Pixel: x=%d, y=%d, color=%s, user=%s", pixel.X, pixel.Y, pixel.Color, pixel.Username)
	log.Printf("Broadcasting to %d clients", len(h.clients))
	
	message := types.WSMessage{
		Type: "pixel_update",
		Data: pixel,
	}
	
	if data, err := json.Marshal(message); err == nil {
		h.broadcast <- data
	} else {
		log.Printf("Error marshaling pixel update: %v", err)
	}
}

func (h *Hub) BroadcastStatsUpdate(stats types.Stats) {
	message := types.WSMessage{
		Type: "stats_update",
		Data: stats,
	}
	
	if data, err := json.Marshal(message); err == nil {
		h.broadcast <- data
	}
}

func (h *Hub) BroadcastRecentChanges(changes []types.Pixel) {
	log.Printf("=== BROADCASTING RECENT CHANGES ===")
	log.Printf("Broadcasting %d recent changes to %d clients", len(changes), len(h.clients))
	
	message := types.WSMessage{
		Type: "recent_changes",
		Data: changes,
	}
	
	if data, err := json.Marshal(message); err == nil {
		h.broadcast <- data
	} else {
		log.Printf("Error marshaling recent changes: %v", err)
	}
}

func (h *Hub) BroadcastCanvasUpdate(canvas types.Canvas) {
	message := types.WSMessage{
		Type: "canvas_update",
		Data: canvas,
	}
	
	if data, err := json.Marshal(message); err == nil {
		h.broadcast <- data
	}
}

func (h *Hub) broadcastOnlineCount() {
	onlineCount := len(h.clients)
	message := types.WSMessage{
		Type: "online_count",
		Data: map[string]int{"count": onlineCount},
	}
	
	if data, err := json.Marshal(message); err == nil {
		h.broadcast <- data
	}
}