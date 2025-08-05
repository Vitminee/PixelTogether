package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"pixeltogether/backend/internal/database"
	"pixeltogether/backend/internal/debug"
	"pixeltogether/backend/internal/types"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 54 * time.Second // Send ping every 54 seconds
	maxMessageSize = 1024 * 1024 // 1MB limit for canvas data
)

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	db   *database.DB
}

func (c *Client) readPump() {
	defer func() {
		log.Printf("ReadPump ending for client")
		c.hub.unregister <- c
		c.conn.Close()
	}()

	log.Printf("ReadPump started for client - ready to receive messages")
	c.conn.SetReadLimit(maxMessageSize)
	// Disable read deadline for debugging
	// c.conn.SetReadDeadline(time.Now().Add(pongWait))
	// c.conn.SetPongHandler(func(string) error {
	// 	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	// 	return nil
	// })

	for {
		log.Printf("ReadPump waiting for message...")
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			log.Printf("ReadMessage error: %v", err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Unexpected WebSocket close error: %v", err)
			}
			break
		}

		debug.Printf("=== MESSAGE RECEIVED ===")
		debug.Printf("Raw message length: %d bytes", len(messageBytes))
		
		var message types.WSMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		debug.Printf("Parsed message type: %s", message.Type)
		c.handleMessage(message)
	}
}

func (c *Client) writePump() {
	// Disable ping timer for debugging
	// ticker := time.NewTicker(pingPeriod)
	// defer func() {
	// 	ticker.Stop()
	// 	c.conn.Close()
	// }()

	defer func() {
		log.Printf("WritePump ending for client")
		c.conn.Close()
	}()

	log.Printf("WritePump started for client")

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				log.Printf("Send channel closed, sending close message")
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			log.Printf("Sending message: %s", string(message))
			
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WriteMessage error: %v", err)
				return
			}

		// Disable ping messages for debugging
		// case <-ticker.C:
		// 	c.conn.SetWriteDeadline(time.Now().Add(writeWait))
		// 	if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
		// 		return
		// 	}
		}
	}
}

func (c *Client) handleMessage(message types.WSMessage) {
	switch message.Type {
	case "place_pixel":
		c.handlePlacePixel(message.Data)
	case "get_canvas":
		c.handleGetCanvas(message.Data)
	case "check_cooldown":
		c.handleCheckCooldown(message.Data)
	case "update_username":
		c.handleUpdateUsername(message.Data)
	}
}

func (c *Client) handlePlacePixel(data interface{}) {
	debug.Printf("=== PIXEL PLACEMENT REQUEST RECEIVED ===")
	
	dataBytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling pixel data: %v", err)
		return
	}

	var req types.PlacePixelRequest
	if err := json.Unmarshal(dataBytes, &req); err != nil {
		log.Printf("Error unmarshaling pixel request: %v", err)
		c.sendError("Invalid place pixel request")
		return
	}
	
	debug.Printf("Pixel request received for canvas size: %d", req.Size)

	// Validate coordinates
	if req.X < 0 || req.X >= req.Size || req.Y < 0 || req.Y >= req.Size {
		c.sendError("Invalid pixel coordinates")
		return
	}

	// Check user cooldown
	cooldownCheck, err := c.db.CheckUserCooldown(req.UserID)
	if err != nil {
		c.sendError("Failed to check cooldown")
		return
	}

	if !cooldownCheck.CanPlace {
		response := types.WSMessage{
			Type: "cooldown_active",
			Data: map[string]interface{}{
				"cooldownEnd": cooldownCheck.CooldownEnd,
				"message":     "You must wait before placing another pixel",
			},
		}
		if data, err := json.Marshal(response); err == nil {
			c.send <- data
		}
		return
	}

	// Create or update user
	user, err := c.db.CreateOrUpdateUser(req.UserID, req.Username)
	if err != nil {
		c.sendError("Failed to create user")
		return
	}

	// Set pixel in database
	debug.Printf("=== ATTEMPTING PIXEL SAVE ===")
	debug.Printf("Saving pixel at coordinates: x=%d, y=%d, size=%d", 
		req.X, req.Y, req.Size)
	if err := c.db.SetPixel(req.X, req.Y, req.Color, req.UserID, req.Size); err != nil {
		log.Printf("ERROR: Failed to save pixel to database: %v", err)
		c.sendError("Failed to set pixel")
		return
	}
	debug.Printf("SUCCESS: Pixel saved to database successfully")

	// Set cooldown for user
	if err := c.db.SetCooldown(req.UserID); err != nil {
		log.Printf("Failed to set cooldown: %v", err)
	}

	// Create pixel object
	pixel := types.Pixel{
		X:         req.X,
		Y:         req.Y,
		Color:     req.Color,
		UserID:    req.UserID,
		Username:  user.Username,
		Timestamp: time.Now().UTC().UnixMilli(), // Convert to UTC milliseconds
	}

	// Broadcast pixel update to all clients
	c.hub.BroadcastPixelUpdate(pixel)

	// Get and broadcast updated stats
	if stats, err := c.db.GetStats(req.Size); err == nil {
		c.hub.BroadcastStatsUpdate(*stats)
	}

	// Get and broadcast recent changes
	if changes, err := c.db.GetRecentChanges(20, req.Size); err == nil {
		c.hub.BroadcastRecentChanges(changes)
	}

	// Send success response to the client who placed the pixel
	response := types.WSMessage{
		Type: "pixel_placed",
		Data: map[string]interface{}{
			"success": true,
			"pixel":   pixel,
		},
	}
	if data, err := json.Marshal(response); err == nil {
		c.send <- data
	}
}

func (c *Client) handleGetCanvas(data interface{}) {
	debug.Printf("Handling get_canvas request")
	
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("Invalid get canvas request: data is not a map")
		c.sendError("Invalid get canvas request")
		return
	}

	sizeFloat, ok := dataMap["size"].(float64)
	if !ok {
		log.Printf("Invalid canvas size in request")
		c.sendError("Invalid canvas size")
		return
	}
	size := int(sizeFloat)
	debug.Printf("Getting canvas data for size: %d", size)

	// Get canvas data using sparse format for efficiency
	sparsePixels, err := c.db.GetCanvasSparse(size)
	if err != nil {
		log.Printf("Error getting canvas: %v", err)
		c.sendError("Failed to get canvas")
		return
	}
	log.Printf("Successfully got sparse canvas data: %d non-white pixels", len(sparsePixels))

	stats, err := c.db.GetStats(size)
	if err != nil {
		log.Printf("Error getting stats: %v", err)
		stats = &types.Stats{}
	}
	log.Printf("Stats: %+v", stats)

	recentChanges, err := c.db.GetRecentChanges(20, size)
	if err != nil {
		log.Printf("Error getting recent changes: %v", err)
		recentChanges = []types.Pixel{}
	}
	log.Printf("Recent changes count: %d", len(recentChanges))

	// Remove pixel limiting - send all pixels
	limitedPixels := sparsePixels

	// Send canvas data as single message with limited pixels
	canvas := types.Canvas{
		SparsePixels:  limitedPixels,
		Size:          size,
		LastUpdate:    time.Now().UTC(),
		Stats:         *stats,
		RecentChanges: recentChanges, // Send all recent changes (up to 20)
	}

	response := types.WSMessage{
		Type: "canvas_data",
		Data: canvas,
	}

	if responseData, err := json.Marshal(response); err == nil {
		log.Printf("Sending canvas data response with %d pixels", len(limitedPixels))
		c.send <- responseData
	} else {
		log.Printf("Error marshaling canvas response: %v", err)
		c.sendError("Failed to serialize canvas data")
	}
}

func (c *Client) handleCheckCooldown(data interface{}) {
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		c.sendError("Invalid cooldown check request")
		return
	}

	userID, ok := dataMap["userId"].(string)
	if !ok {
		c.sendError("Invalid user ID")
		return
	}

	cooldownInfo, err := c.db.CheckUserCooldown(userID)
	if err != nil {
		c.sendError("Failed to check cooldown")
		return
	}

	response := types.WSMessage{
		Type: "cooldown_status",
		Data: cooldownInfo,
	}

	if responseData, err := json.Marshal(response); err == nil {
		c.send <- responseData
	}
}

func (c *Client) handleUpdateUsername(data interface{}) {
	dataMap, ok := data.(map[string]interface{})
	if !ok {
		c.sendError("Invalid username update request")
		return
	}

	userID, ok := dataMap["userId"].(string)
	if !ok {
		c.sendError("Invalid user ID")
		return
	}

	username, ok := dataMap["username"].(string)
	if !ok {
		c.sendError("Invalid username")
		return
	}

	if err := c.db.UpdateUsernameInChanges(userID, username); err != nil {
		c.sendError("Failed to update username")
		return
	}

	// Get updated user
	user, err := c.db.GetUser(userID)
	if err != nil {
		c.sendError("Failed to get updated user")
		return
	}

	response := types.WSMessage{
		Type: "username_updated",
		Data: map[string]interface{}{
			"success": true,
			"user":    user,
		},
	}

	if responseData, err := json.Marshal(response); err == nil {
		c.send <- responseData
	}

	// Broadcast updated recent changes
	if changes, err := c.db.GetRecentChanges(20, 64); err == nil {
		c.hub.BroadcastRecentChanges(changes)
	}
}

func (c *Client) sendError(message string) {
	response := types.WSMessage{
		Type: "error",
		Data: map[string]string{"message": message},
	}

	if data, err := json.Marshal(response); err == nil {
		c.send <- data
	}
}

func ServeWS(hub *Hub, db *database.DB, w http.ResponseWriter, r *http.Request) {
	log.Printf("WebSocket upgrade request from %s", r.RemoteAddr)
	debug.Printf("WebSocket upgrade request received")
	
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	log.Printf("WebSocket upgrade successful for %s", r.RemoteAddr)

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
		db:   db,
	}

	log.Printf("Attempting to register client with hub...")
	// Use goroutine to prevent blocking if hub is busy
	go func() {
		log.Printf("Sending client registration to hub...")
		select {
		case client.hub.register <- client:
			log.Printf("Client registration sent to hub successfully")
		case <-time.After(5 * time.Second):
			log.Printf("ERROR: Client registration timed out after 5 seconds")
		}
	}()

	log.Printf("Starting client goroutines...")
	go client.writePump()
	go client.readPump()
	log.Printf("Client goroutines started")
}