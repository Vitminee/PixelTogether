package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"pixeltogether/backend/internal/types"
)

type DB struct {
	conn *sql.DB
}

func Initialize() (*DB, error) {
	// Get PostgreSQL connection string from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	conn, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db := &DB{conn: conn}
	
	// Check if tables exist, if not create them
	if err := db.ensureTables(); err != nil {
		return nil, fmt.Errorf("failed to ensure tables: %w", err)
	}

	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) ensureTables() error {
	// Check which tables exist and create missing ones
	var userExists, canvas8Exists, canvas16Exists, canvas32Exists, canvas64Exists, canvas128Exists, canvas256Exists, canvas512Exists, cooldownExists bool
	
	err := db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')").Scan(&userExists)
	if err != nil {
		return fmt.Errorf("failed to check if users table exists: %w", err)
	}
	
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_8')").Scan(&canvas8Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_16')").Scan(&canvas16Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_32')").Scan(&canvas32Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_64')").Scan(&canvas64Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_128')").Scan(&canvas128Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_256')").Scan(&canvas256Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'canvas_512')").Scan(&canvas512Exists)
	db.conn.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cooldowns')").Scan(&cooldownExists)
	
	fmt.Printf("Existing tables: users=%t, canvas_8=%t, canvas_16=%t, canvas_32=%t, canvas_64=%t, canvas_128=%t, canvas_256=%t, canvas_512=%t, cooldowns=%t\n", 
		userExists, canvas8Exists, canvas16Exists, canvas32Exists, canvas64Exists, canvas128Exists, canvas256Exists, canvas512Exists, cooldownExists)
	
	fmt.Println("Creating missing database tables")
	
	// Clear any expired cooldowns to prevent timezone issues
	if cooldownExists {
		// Clear all cooldowns to fix any timezone issues completely
		_, err := db.conn.Exec("DELETE FROM cooldowns")
		if err != nil {
			fmt.Printf("Warning: Failed to clear all cooldowns: %v\n", err)
		} else {
			fmt.Println("Cleared all cooldowns to fix timezone issues")
		}
	}
	
	
	// Create tables with names that match your existing schema
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS cooldowns (
			user_id TEXT PRIMARY KEY,
			cooldown_end TIMESTAMP NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_8 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_16 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_32 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_64 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_128 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_256 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS canvas_512 (
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			color TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (x, y),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_8_timestamp ON canvas_8(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_16_timestamp ON canvas_16(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_32_timestamp ON canvas_32(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_64_timestamp ON canvas_64(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_128_timestamp ON canvas_128(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_256_timestamp ON canvas_256(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_512_timestamp ON canvas_512(timestamp DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_8_user_id ON canvas_8(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_16_user_id ON canvas_16(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_32_user_id ON canvas_32(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_64_user_id ON canvas_64(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_128_user_id ON canvas_128(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_256_user_id ON canvas_256(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canvas_512_user_id ON canvas_512(user_id)`,
	}

	for _, query := range queries {
		if _, err := db.conn.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query %q: %w", query, err)
		}
	}

	return nil
}


func (db *DB) getCanvasTable(size int) string {
	switch size {
	case 8:
		return "canvas_8"
	case 16:
		return "canvas_16"
	case 32:
		return "canvas_32"
	case 64:
		return "canvas_64"
	case 128:
		return "canvas_128"
	case 256:
		return "canvas_256"
	case 512:
		return "canvas_512"
	default:
		return "canvas_64" // Default to 64x64
	}
}

func (db *DB) CreateOrUpdateUser(userID, username string) (*types.User, error) {
	now := time.Now()
	
	_, err := db.conn.Exec(`
		INSERT INTO users (id, username, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT(id) DO UPDATE SET 
			username = EXCLUDED.username,
			updated_at = EXCLUDED.updated_at
	`, userID, username, now, now)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create or update user: %w", err)
	}

	user := &types.User{
		ID:        userID,
		Username:  username,
		CreatedAt: now,
		UpdatedAt: now,
	}

	return user, nil
}

func (db *DB) GetUser(userID string) (*types.User, error) {
	var user types.User
	err := db.conn.QueryRow(`
		SELECT id, username, created_at, updated_at 
		FROM users WHERE id = $1
	`, userID).Scan(&user.ID, &user.Username, &user.CreatedAt, &user.UpdatedAt)
	
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	
	return &user, nil
}

func (db *DB) SetPixel(x, y int, color, userID string, size int) error {
	tableName := db.getCanvasTable(size)
	
	log.Printf("=== DATABASE PIXEL SAVE ===")
	log.Printf("Table: %s, X: %d, Y: %d, Color: %s, UserID: %s", tableName, x, y, color, userID)
	
	query := fmt.Sprintf(`
		INSERT INTO %s (x, y, color, user_id, timestamp)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT(x, y) DO UPDATE SET 
			color = EXCLUDED.color,
			user_id = EXCLUDED.user_id,
			timestamp = EXCLUDED.timestamp
	`, tableName)
	
	result, err := db.conn.Exec(query, x, y, color, userID, time.Now().UTC())
	
	if err != nil {
		log.Printf("Database error saving pixel: %v", err)
		return fmt.Errorf("failed to set pixel: %w", err)
	}
	
	rowsAffected, _ := result.RowsAffected()
	log.Printf("Database save successful, rows affected: %d", rowsAffected)
	
	// Verify the pixel was actually saved by reading it back
	var savedColor string
	verifyQuery := fmt.Sprintf("SELECT color FROM %s WHERE x = $1 AND y = $2", tableName)
	err = db.conn.QueryRow(verifyQuery, x, y).Scan(&savedColor)
	if err != nil {
		log.Printf("WARNING: Could not verify pixel save: %v", err)
	} else {
		log.Printf("VERIFICATION: Pixel at (%d,%d) saved with color %s", x, y, savedColor)
	}
	
	return nil
}

func (db *DB) GetCanvasSparse(size int) ([]types.SparsePixel, error) {
	tableName := db.getCanvasTable(size)
	
	log.Printf("=== LOADING SPARSE CANVAS DATA ===")
	log.Printf("Loading from table: %s, size: %dx%d", tableName, size, size)
	
	query := fmt.Sprintf(`
		SELECT x, y, color FROM %s
		WHERE color != '#FFFFFF'
		ORDER BY timestamp DESC
	`, tableName)
	
	log.Printf("Executing sparse query: %s", query)
	
	rows, err := db.conn.Query(query)
	if err != nil {
		log.Printf("Query error: %v", err)
		return nil, fmt.Errorf("failed to query canvas: %w", err)
	}
	defer rows.Close()

	var sparsePixels []types.SparsePixel
	for rows.Next() {
		var x, y int
		var color string
		if err := rows.Scan(&x, &y, &color); err != nil {
			log.Printf("Scan error for pixel: %v", err)
			continue
		}
		if x >= 0 && x < size && y >= 0 && y < size {
			// Keep original coordinates - no swapping needed
			sparsePixels = append(sparsePixels, types.SparsePixel{
				X:     x,
				Y:     y,
				Color: color,
			})
			if len(sparsePixels) <= 5 { // Log first 5 pixels for debugging
				log.Printf("Loaded sparse pixel: db(%d,%d) = %s", x, y, color)
			}
		}
	}
	
	log.Printf("Total sparse pixels loaded: %d", len(sparsePixels))
	return sparsePixels, nil
}

// Keep the old function for backward compatibility
func (db *DB) GetCanvas(size int) ([][]string, error) {
	// Use sparse format internally but return full canvas
	sparsePixels, err := db.GetCanvasSparse(size)
	if err != nil {
		return nil, err
	}
	
	// Convert sparse to full canvas
	pixels := make([][]string, size)
	for i := range pixels {
		pixels[i] = make([]string, size)
		for j := range pixels[i] {
			pixels[i][j] = "#FFFFFF" // Default white
		}
	}
	
	// Apply sparse pixels
	for _, sp := range sparsePixels {
		if sp.X >= 0 && sp.X < size && sp.Y >= 0 && sp.Y < size {
			pixels[sp.X][sp.Y] = sp.Color
		}
	}
	
	return pixels, nil
}

func (db *DB) GetStats(size int) (*types.Stats, error) {
	tableName := db.getCanvasTable(size)
	
	var stats types.Stats
	
	query := fmt.Sprintf(`
		SELECT 
			COUNT(*) as total_pixels,
			COUNT(DISTINCT user_id) as unique_users
		FROM %s`, tableName)
	
	err := db.conn.QueryRow(query).Scan(&stats.TotalPixels, &stats.UniqueUsers)
	if err != nil {
		return &stats, fmt.Errorf("failed to get basic stats: %w", err)
	}

	// Get pixels placed in last hour
	query = fmt.Sprintf(`
		SELECT COUNT(*)
		FROM %s
		WHERE timestamp > NOW() - INTERVAL '1 hour'
	`, tableName)
	
	err = db.conn.QueryRow(query).Scan(&stats.PixelsPlacedNow)
	if err != nil {
		// Don't fail if we can't get recent pixels count
		stats.PixelsPlacedNow = 0
	}

	return &stats, nil
}

func (db *DB) GetRecentChanges(limit, size int) ([]types.Pixel, error) {
	tableName := db.getCanvasTable(size)
	
	query := fmt.Sprintf(`
		SELECT c.x, c.y, c.color, c.user_id, u.username, c.timestamp
		FROM %s c
		JOIN users u ON c.user_id = u.id
		ORDER BY c.timestamp DESC
		LIMIT $1
	`, tableName)
	
	rows, err := db.conn.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent changes: %w", err)
	}
	defer rows.Close()

	var changes []types.Pixel
	for rows.Next() {
		var change types.Pixel
		var timestamp time.Time
		err := rows.Scan(&change.X, &change.Y, &change.Color, 
			&change.UserID, &change.Username, &timestamp)
		if err != nil {
			continue
		}
		change.Timestamp = timestamp.UnixMilli() // Convert to milliseconds
		changes = append(changes, change)
	}

	return changes, nil
}

func (db *DB) CheckUserCooldown(userID string) (*types.CooldownInfo, error) {
	var cooldownEnd time.Time
	err := db.conn.QueryRow(`
		SELECT cooldown_end FROM cooldowns WHERE user_id = $1
	`, userID).Scan(&cooldownEnd)
	
	if err == sql.ErrNoRows {
		return &types.CooldownInfo{CanPlace: true}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to check cooldown: %w", err)
	}

	// Always work in UTC to avoid timezone issues
	now := time.Now().UTC()
	cooldownEndUTC := cooldownEnd.UTC()
	canPlace := now.After(cooldownEndUTC)
	
	return &types.CooldownInfo{
		CanPlace:    canPlace,
		CooldownEnd: cooldownEndUTC,
	}, nil
}

func (db *DB) SetCooldown(userID string) error {
	cooldownEnd := time.Now().UTC().Add(5 * time.Second) // 5 second cooldown
	
	_, err := db.conn.Exec(`
		INSERT INTO cooldowns (user_id, cooldown_end)
		VALUES ($1, $2)
		ON CONFLICT(user_id) DO UPDATE SET cooldown_end = EXCLUDED.cooldown_end
	`, userID, cooldownEnd)
	
	if err != nil {
		return fmt.Errorf("failed to set cooldown: %w", err)
	}
	
	return nil
}

func (db *DB) UpdateUsernameInChanges(userID, username string) error {
	// Update user record
	_, err := db.conn.Exec(`
		UPDATE users SET username = $1, updated_at = $2 WHERE id = $3
	`, username, time.Now().UTC(), userID)
	
	if err != nil {
		return fmt.Errorf("failed to update username: %w", err)
	}
	
	return nil
}