import { neon } from '@neondatabase/serverless';

const sql = neon(`${process.env.DATABASE_URL}`);

let tablesInitialized = false;

// Initialize tables
export async function initializeTables() {
  if (tablesInitialized) return;
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Canvas pixels table
    await sql`
      CREATE TABLE IF NOT EXISTS canvas_pixels (
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color TEXT NOT NULL,
        user_id TEXT NOT NULL,
        canvas_size INTEGER NOT NULL DEFAULT 64,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (x, y, canvas_size)
      )
    `;

    // Pixel history/changes table for recent changes
    await sql`
      CREATE TABLE IF NOT EXISTS pixel_changes (
        id SERIAL PRIMARY KEY,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color TEXT NOT NULL,
        user_id TEXT NOT NULL,
        canvas_size INTEGER NOT NULL DEFAULT 64,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // User cooldown table for rate limiting
    await sql`
      CREATE TABLE IF NOT EXISTS user_cooldowns (
        user_id TEXT PRIMARY KEY,
        last_placement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        cooldown_end TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_pixel_changes_timestamp ON pixel_changes(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pixel_changes_user ON pixel_changes(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_canvas_pixels_timestamp ON canvas_pixels(timestamp DESC)`;
    
    tablesInitialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

// User operations
export interface User {
  id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export async function createOrUpdateUser(id: string, username: string): Promise<User> {
  try {
    // Try to update existing user
    const updateResult = await sql`
      UPDATE users SET username = ${username}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}
      RETURNING *
    `;
    
    // If no rows updated, create new user
    if (updateResult.length === 0) {
      const insertResult = await sql`
        INSERT INTO users (id, username) VALUES (${id}, ${username})
        RETURNING *
      `;
      return insertResult[0] as User;
    }
    
    return updateResult[0] as User;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

export async function getUser(id: string): Promise<User | null> {
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result.length > 0 ? result[0] as User : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Canvas operations
export interface PixelData {
  x: number;
  y: number;
  color: string;
  user_id: string;
  username?: string;
  timestamp: number;
}

export async function setPixel(x: number, y: number, color: string, userId: string, canvasSize: number = 64): Promise<boolean> {
  try {
    // Initialize tables if needed
    await initializeTables();
    
    // Update or insert pixel in canvas
    await sql`
      INSERT INTO canvas_pixels (x, y, color, user_id, canvas_size, timestamp) 
      VALUES (${x}, ${y}, ${color}, ${userId}, ${canvasSize}, CURRENT_TIMESTAMP)
      ON CONFLICT (x, y, canvas_size) DO UPDATE SET 
        color = EXCLUDED.color,
        user_id = EXCLUDED.user_id,
        timestamp = EXCLUDED.timestamp
    `;
    
    // Add to pixel changes history
    await sql`
      INSERT INTO pixel_changes (x, y, color, user_id, canvas_size, timestamp) 
      VALUES (${x}, ${y}, ${color}, ${userId}, ${canvasSize}, CURRENT_TIMESTAMP)
    `;
    
    return true;
  } catch (error) {
    console.error('Error setting pixel:', error);
    return false;
  }
}

export async function getCanvas(canvasSize: number = 64): Promise<string[][]> {
  try {
    await initializeTables();
    
    const pixels = await sql`SELECT x, y, color FROM canvas_pixels WHERE canvas_size = ${canvasSize}` as { x: number; y: number; color: string }[];
    
    // Initialize canvas with white
    const canvas: string[][] = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill('#FFFFFF'));
    
    // Fill with actual pixel data
    pixels.forEach((pixel) => {
      if (pixel.x >= 0 && pixel.x < canvasSize && pixel.y >= 0 && pixel.y < canvasSize) {
        canvas[pixel.y][pixel.x] = pixel.color;
      }
    });
    
    return canvas;
  } catch (error) {
    console.error('Error getting canvas:', error);
    return Array(canvasSize).fill(null).map(() => Array(canvasSize).fill('#FFFFFF'));
  }
}

export async function getRecentChanges(limit: number = 20, canvasSize: number = 64): Promise<PixelData[]> {
  try {
    await initializeTables();
    
    const changes = await sql`
      SELECT 
        pc.x, pc.y, pc.color, pc.user_id, u.username,
        EXTRACT(EPOCH FROM pc.timestamp) * 1000 as timestamp
      FROM pixel_changes pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.canvas_size = ${canvasSize}
      ORDER BY pc.timestamp DESC
      LIMIT ${limit}
    ` as { 
      x: number; 
      y: number; 
      color: string; 
      user_id: string; 
      username?: string; 
      timestamp: string | number;
    }[];
    
    return changes.map((change) => ({
      ...change,
      timestamp: Number(change.timestamp),
      username: change.username || `User${change.user_id.slice(-4)}`
    }));
  } catch (error) {
    console.error('Error getting recent changes:', error);
    return [];
  }
}

export async function getStats(canvasSize: number = 64) {
  try {
    await initializeTables();
    
    const totalEditsResult = await sql`SELECT COUNT(*) as count FROM pixel_changes WHERE canvas_size = ${canvasSize}`;
    const uniqueUsersResult = await sql`SELECT COUNT(DISTINCT user_id) as count FROM pixel_changes WHERE canvas_size = ${canvasSize}`;
    
    const totalEdits = Number(totalEditsResult[0].count);
    const uniqueUsers = Number(uniqueUsersResult[0].count);
    
    return {
      totalEdits,
      uniqueUsers
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      totalEdits: 0,
      uniqueUsers: 0
    };
  }
}

// Update all changes when username changes
export async function updateUsernameInChanges(userId: string, newUsername: string): Promise<void> {
  await createOrUpdateUser(userId, newUsername);
}

// Optimized batch pixel updates for better performance
export interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  userId: string;
  canvasSize: number;
}

export async function batchSetPixels(pixels: PixelUpdate[]): Promise<boolean> {
  if (pixels.length === 0) return true;
  
  try {
    await initializeTables();
    
    // Batch update canvas pixels
    for (const pixel of pixels) {
      await sql`
        INSERT INTO canvas_pixels (x, y, color, user_id, canvas_size, timestamp) 
        VALUES (${pixel.x}, ${pixel.y}, ${pixel.color}, ${pixel.userId}, ${pixel.canvasSize}, CURRENT_TIMESTAMP)
        ON CONFLICT (x, y, canvas_size) DO UPDATE SET 
          color = EXCLUDED.color,
          user_id = EXCLUDED.user_id,
          timestamp = EXCLUDED.timestamp
      `;
    }
    
    // Batch insert into pixel changes history
    for (const pixel of pixels) {
      await sql`
        INSERT INTO pixel_changes (x, y, color, user_id, canvas_size, timestamp) 
        VALUES (${pixel.x}, ${pixel.y}, ${pixel.color}, ${pixel.userId}, ${pixel.canvasSize}, CURRENT_TIMESTAMP)
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Error batch setting pixels:', error);
    return false;
  }
}

// Cooldown management
const COOLDOWN_DURATION = 5 * 1000;

export async function checkUserCooldown(userId: string): Promise<{ canPlace: boolean; cooldownEnd: number | null }> {
  try {
    await initializeTables();
    
    const result = await sql`
      SELECT cooldown_end FROM user_cooldowns 
      WHERE user_id = ${userId}
    `;
    
    if (result.length === 0) {
      return { canPlace: true, cooldownEnd: null };
    }
    
    const cooldownEnd = new Date(result[0].cooldown_end).getTime();
    const now = Date.now();
    
    return {
      canPlace: now >= cooldownEnd,
      cooldownEnd: now >= cooldownEnd ? null : cooldownEnd
    };
  } catch (error) {
    console.error('Error checking user cooldown:', error);
    return { canPlace: false, cooldownEnd: null };
  }
}

export async function setCooldown(userId: string): Promise<void> {
  try {
    await initializeTables();
    
    const now = new Date();
    const cooldownEnd = new Date(now.getTime() + COOLDOWN_DURATION);
    
    await sql`
      INSERT INTO user_cooldowns (user_id, last_placement, cooldown_end)
      VALUES (${userId}, ${now.toISOString()}, ${cooldownEnd.toISOString()})
      ON CONFLICT (user_id) DO UPDATE SET
        last_placement = EXCLUDED.last_placement,
        cooldown_end = EXCLUDED.cooldown_end
    `;
  } catch (error) {
    console.error('Error setting user cooldown:', error);
  }
}