package types

import "time"

type Pixel struct {
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Color     string `json:"color"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Timestamp int64  `json:"timestamp"` // Unix timestamp in milliseconds
}

type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Canvas struct {
	Pixels        [][]string    `json:"pixels,omitempty"`        // Full canvas (for backward compatibility)
	SparsePixels  []SparsePixel `json:"sparse_pixels,omitempty"` // Optimized format
	Size          int           `json:"size"`
	LastUpdate    time.Time     `json:"last_update"`
	Stats         Stats         `json:"stats"`
	RecentChanges []Pixel       `json:"recent_changes"`
}

type SparsePixel struct {
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Color string `json:"color"`
}

type Stats struct {
	TotalPixels     int `json:"total_pixels"`
	UniqueUsers     int `json:"unique_users"`
	PixelsPlacedNow int `json:"pixels_placed_now"`
}

type CooldownInfo struct {
	CanPlace    bool      `json:"can_place"`
	CooldownEnd time.Time `json:"cooldown_end"`
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type PlacePixelRequest struct {
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Color    string `json:"color"`
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Size     int    `json:"size"`
}