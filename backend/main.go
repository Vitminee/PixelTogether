package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"pixeltogether/backend/internal/api"
	"pixeltogether/backend/internal/database"
	"pixeltogether/backend/internal/websocket"
)

func main() {
	// Load environment variables from .env file (optional)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize database
	db, err := database.Initialize()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Create WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Setup API routes
	router := api.NewRouter(db, hub)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}