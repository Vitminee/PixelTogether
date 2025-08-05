package api

import (
	"net/http"

	"pixeltogether/backend/internal/database"
	"pixeltogether/backend/internal/websocket"
)

func NewRouter(db *database.DB, hub *websocket.Hub) *http.ServeMux {
	mux := http.NewServeMux()

	// CORS middleware
	corsHandler := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			
			next(w, r)
		}
	}

	// WebSocket endpoint
	mux.HandleFunc("/ws", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWS(hub, db, w, r)
	}))

	// Health check endpoint
	mux.HandleFunc("/health", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"pixeltogether-backend"}`))
	}))

	return mux
}