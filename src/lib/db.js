import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'riffle.db');

let db = null;

export function getDb() {
  if (!db) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      subscription_status TEXT DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      home_river TEXT,
      home_lat REAL,
      home_lon REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Journal entries
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      location_name TEXT,
      latitude REAL,
      longitude REAL,
      river_name TEXT,
      water_conditions TEXT,
      weather TEXT,
      temperature REAL,
      wind TEXT,
      flies_used TEXT,
      fish_caught INTEGER DEFAULT 0,
      species TEXT,
      is_public INTEGER DEFAULT 0,
      photos TEXT,
      trip_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Hatch reports (community)
    CREATE TABLE IF NOT EXISTS hatch_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      river_name TEXT NOT NULL,
      location_name TEXT,
      latitude REAL,
      longitude REAL,
      hatch_type TEXT NOT NULL,
      hatch_intensity TEXT,
      flies_working TEXT,
      water_temp REAL,
      water_clarity TEXT,
      flow_rate TEXT,
      notes TEXT,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Chat history
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Saved rivers
    CREATE TABLE IF NOT EXISTS saved_rivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      river_name TEXT NOT NULL,
      usgs_site_id TEXT,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(trip_date);
    CREATE INDEX IF NOT EXISTS idx_journal_public ON journal_entries(is_public);
    CREATE INDEX IF NOT EXISTS idx_hatch_river ON hatch_reports(river_name);
    CREATE INDEX IF NOT EXISTS idx_hatch_date ON hatch_reports(reported_at);
    CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id);
  `);
}

// ============ USER FUNCTIONS ============

export function createUser(email, password, name) {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
  const result = stmt.run(email, hash, name);
  return result.lastInsertRowid;
}

export function getUserByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT id, email, name, avatar_url, subscription_status, home_river, home_lat, home_lon, created_at
    FROM users WHERE id = ?
  `).get(id);
}

export function verifyPassword(email, password) {
  const user = getUserByEmail(email);
  if (!user) return null;
  if (bcrypt.compareSync(password, user.password)) {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

export function updateUser(userId, updates) {
  const db = getDb();
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;
  values.push(userId);

  return db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateSubscription(userId, status, stripeCustomerId, stripeSubscriptionId) {
  const db = getDb();
  return db.prepare(`
    UPDATE users SET subscription_status = ?, stripe_customer_id = ?, stripe_subscription_id = ?
    WHERE id = ?
  `).run(status, stripeCustomerId, stripeSubscriptionId, userId);
}

// ============ JOURNAL FUNCTIONS ============

export function createJournalEntry(userId, entry) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO journal_entries (
      user_id, title, content, location_name, latitude, longitude, river_name,
      water_conditions, weather, temperature, wind, flies_used, fish_caught,
      species, is_public, photos, trip_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId, entry.title, entry.content, entry.location_name, entry.latitude,
    entry.longitude, entry.river_name, entry.water_conditions, entry.weather,
    entry.temperature, entry.wind, entry.flies_used, entry.fish_caught || 0,
    entry.species, entry.is_public ? 1 : 0,
    entry.photos ? JSON.stringify(entry.photos) : null,
    entry.trip_date || new Date().toISOString().split('T')[0]
  );
  return result.lastInsertRowid;
}

export function getJournalEntries(userId, limit = 50, offset = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM journal_entries
    WHERE user_id = ?
    ORDER BY trip_date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);
}

export function getJournalEntry(userId, entryId) {
  const db = getDb();
  return db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(entryId, userId);
}

export function updateJournalEntry(userId, entryId, updates) {
  const db = getDb();
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id') {
      fields.push(`${key} = ?`);
      values.push(key === 'photos' && Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return null;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(entryId, userId);

  return db.prepare(`UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteJournalEntry(userId, entryId) {
  const db = getDb();
  return db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(entryId, userId);
}

export function getPublicJournalEntries(limit = 20, offset = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT j.*, u.name as author_name, u.avatar_url as author_avatar
    FROM journal_entries j
    JOIN users u ON j.user_id = u.id
    WHERE j.is_public = 1
    ORDER BY j.trip_date DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

// ============ HATCH REPORT FUNCTIONS ============

export function createHatchReport(userId, report) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO hatch_reports (
      user_id, river_name, location_name, latitude, longitude, hatch_type,
      hatch_intensity, flies_working, water_temp, water_clarity, flow_rate, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId, report.river_name, report.location_name, report.latitude,
    report.longitude, report.hatch_type, report.hatch_intensity,
    report.flies_working, report.water_temp, report.water_clarity,
    report.flow_rate, report.notes
  );
  return result.lastInsertRowid;
}

export function getHatchReports(options = {}) {
  const db = getDb();
  let query = `
    SELECT h.*, u.name as reporter_name
    FROM hatch_reports h
    JOIN users u ON h.user_id = u.id
  `;
  const params = [];
  const conditions = [];

  if (options.river_name) {
    conditions.push('h.river_name LIKE ?');
    params.push(`%${options.river_name}%`);
  }

  if (options.days) {
    conditions.push("h.reported_at >= datetime('now', ? || ' days')");
    params.push(-options.days);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY h.reported_at DESC LIMIT ? OFFSET ?';
  params.push(options.limit || 50, options.offset || 0);

  return db.prepare(query).all(...params);
}

export function getRecentHatchReports(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT h.*, u.name as reporter_name
    FROM hatch_reports h
    JOIN users u ON h.user_id = u.id
    WHERE h.reported_at >= datetime('now', '-7 days')
    ORDER BY h.reported_at DESC
    LIMIT ?
  `).all(limit);
}

// ============ CHAT FUNCTIONS ============

export function saveChatMessage(userId, role, content) {
  const db = getDb();
  return db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run(userId, role, content);
}

export function getChatHistory(userId, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT role, content, created_at FROM chat_history
    WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit).reverse();
}

export function clearChatHistory(userId) {
  const db = getDb();
  return db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
}

// ============ SAVED RIVERS FUNCTIONS ============

export function saveRiver(userId, river) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO saved_rivers (user_id, river_name, usgs_site_id, latitude, longitude, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, river.river_name, river.usgs_site_id, river.latitude, river.longitude, river.notes);
}

export function getSavedRivers(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM saved_rivers WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function deleteSavedRiver(userId, riverId) {
  const db = getDb();
  return db.prepare('DELETE FROM saved_rivers WHERE id = ? AND user_id = ?').run(riverId, userId);
}

// ============ STATS FUNCTIONS ============

export function getUserStats(userId) {
  const db = getDb();

  const totalTrips = db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?').get(userId);
  const totalFish = db.prepare('SELECT SUM(fish_caught) as total FROM journal_entries WHERE user_id = ?').get(userId);
  const speciesCount = db.prepare(`
    SELECT COUNT(DISTINCT species) as count FROM journal_entries WHERE user_id = ? AND species IS NOT NULL
  `).get(userId);
  const topFlies = db.prepare(`
    SELECT flies_used, SUM(fish_caught) as fish FROM journal_entries
    WHERE user_id = ? AND flies_used IS NOT NULL
    GROUP BY flies_used ORDER BY fish DESC LIMIT 5
  `).all(userId);
  const topRivers = db.prepare(`
    SELECT river_name, COUNT(*) as trips, SUM(fish_caught) as fish FROM journal_entries
    WHERE user_id = ? AND river_name IS NOT NULL
    GROUP BY river_name ORDER BY trips DESC LIMIT 5
  `).all(userId);

  return {
    totalTrips: totalTrips.count,
    totalFish: totalFish.total || 0,
    speciesCount: speciesCount.count,
    topFlies,
    topRivers
  };
}
