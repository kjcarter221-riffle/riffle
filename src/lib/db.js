import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// Initialize database tables
export async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS hatch_reports (
        id SERIAL PRIMARY KEY,
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
        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS saved_rivers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        river_name TEXT NOT NULL,
        usgs_site_id TEXT,
        latitude REAL,
        longitude REAL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(trip_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hatch_river ON hatch_reports(river_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token)`;

    console.log('Database initialized');
  } catch (error) {
    console.error('Database init error:', error);
  }
}

// ============ USER FUNCTIONS ============

export async function createUser(email, password, name) {
  await initDb();
  const hash = bcrypt.hashSync(password, 10);
  const result = await sql`
    INSERT INTO users (email, password, name)
    VALUES (${email}, ${hash}, ${name})
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function getUserByEmail(email) {
  await initDb();
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result.rows[0] || null;
}

export async function getUserById(id) {
  await initDb();
  const result = await sql`
    SELECT id, email, name, avatar_url, subscription_status, home_river, home_lat, home_lon, created_at
    FROM users WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

export async function verifyPassword(email, password) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  if (bcrypt.compareSync(password, user.password)) {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

export async function updateUser(userId, updates) {
  await initDb();
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;
  values.push(userId);

  // For simple updates, just update one field at a time
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id') {
      await sql.query(`UPDATE users SET ${key} = $1 WHERE id = $2`, [value, userId]);
    }
  }
  return true;
}

export async function updateSubscription(userId, status, stripeCustomerId, stripeSubscriptionId) {
  await initDb();
  await sql`
    UPDATE users
    SET subscription_status = ${status},
        stripe_customer_id = ${stripeCustomerId},
        stripe_subscription_id = ${stripeSubscriptionId}
    WHERE id = ${userId}
  `;
}

// ============ JOURNAL FUNCTIONS ============

export async function createJournalEntry(userId, entry) {
  await initDb();
  const result = await sql`
    INSERT INTO journal_entries (
      user_id, title, content, location_name, latitude, longitude, river_name,
      water_conditions, weather, temperature, wind, flies_used, fish_caught,
      species, is_public, photos, trip_date
    ) VALUES (
      ${userId}, ${entry.title}, ${entry.content}, ${entry.location_name},
      ${entry.latitude}, ${entry.longitude}, ${entry.river_name},
      ${entry.water_conditions}, ${entry.weather}, ${entry.temperature},
      ${entry.wind}, ${entry.flies_used}, ${entry.fish_caught || 0},
      ${entry.species}, ${entry.is_public ? 1 : 0},
      ${entry.photos ? JSON.stringify(entry.photos) : null},
      ${entry.trip_date || new Date().toISOString().split('T')[0]}
    )
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function getJournalEntries(userId, limit = 50, offset = 0) {
  await initDb();
  const result = await sql`
    SELECT * FROM journal_entries
    WHERE user_id = ${userId}
    ORDER BY trip_date DESC, created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows;
}

export async function getJournalEntry(userId, entryId) {
  await initDb();
  const result = await sql`
    SELECT * FROM journal_entries WHERE id = ${entryId} AND user_id = ${userId}
  `;
  return result.rows[0] || null;
}

export async function updateJournalEntry(userId, entryId, updates) {
  await initDb();
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id') {
      const val = key === 'photos' && Array.isArray(value) ? JSON.stringify(value) : value;
      await sql.query(
        `UPDATE journal_entries SET ${key} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
        [val, entryId, userId]
      );
    }
  }
  return true;
}

export async function deleteJournalEntry(userId, entryId) {
  await initDb();
  await sql`DELETE FROM journal_entries WHERE id = ${entryId} AND user_id = ${userId}`;
}

export async function getPublicJournalEntries(limit = 20, offset = 0) {
  await initDb();
  const result = await sql`
    SELECT j.*, u.name as author_name, u.avatar_url as author_avatar
    FROM journal_entries j
    JOIN users u ON j.user_id = u.id
    WHERE j.is_public = 1
    ORDER BY j.trip_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows;
}

// ============ HATCH REPORT FUNCTIONS ============

export async function createHatchReport(userId, report) {
  await initDb();
  const result = await sql`
    INSERT INTO hatch_reports (
      user_id, river_name, location_name, latitude, longitude, hatch_type,
      hatch_intensity, flies_working, water_temp, water_clarity, flow_rate, notes
    ) VALUES (
      ${userId}, ${report.river_name}, ${report.location_name}, ${report.latitude},
      ${report.longitude}, ${report.hatch_type}, ${report.hatch_intensity},
      ${report.flies_working}, ${report.water_temp}, ${report.water_clarity},
      ${report.flow_rate}, ${report.notes}
    )
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function getHatchReports(options = {}) {
  await initDb();
  let result;

  if (options.river_name) {
    result = await sql`
      SELECT h.*, u.name as reporter_name
      FROM hatch_reports h
      JOIN users u ON h.user_id = u.id
      WHERE h.river_name ILIKE ${'%' + options.river_name + '%'}
        AND h.reported_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY h.reported_at DESC
      LIMIT ${options.limit || 50} OFFSET ${options.offset || 0}
    `;
  } else {
    result = await sql`
      SELECT h.*, u.name as reporter_name
      FROM hatch_reports h
      JOIN users u ON h.user_id = u.id
      WHERE h.reported_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY h.reported_at DESC
      LIMIT ${options.limit || 50} OFFSET ${options.offset || 0}
    `;
  }
  return result.rows;
}

export async function getRecentHatchReports(limit = 20) {
  await initDb();
  const result = await sql`
    SELECT h.*, u.name as reporter_name
    FROM hatch_reports h
    JOIN users u ON h.user_id = u.id
    WHERE h.reported_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    ORDER BY h.reported_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}

// ============ CHAT FUNCTIONS ============

export async function saveChatMessage(userId, role, content) {
  await initDb();
  await sql`
    INSERT INTO chat_history (user_id, role, content)
    VALUES (${userId}, ${role}, ${content})
  `;
}

export async function getChatHistory(userId, limit = 20) {
  await initDb();
  const result = await sql`
    SELECT role, content, created_at FROM chat_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows.reverse();
}

export async function clearChatHistory(userId) {
  await initDb();
  await sql`DELETE FROM chat_history WHERE user_id = ${userId}`;
}

// ============ SAVED RIVERS FUNCTIONS ============

export async function saveRiver(userId, river) {
  await initDb();
  await sql`
    INSERT INTO saved_rivers (user_id, river_name, usgs_site_id, latitude, longitude, notes)
    VALUES (${userId}, ${river.river_name}, ${river.usgs_site_id}, ${river.latitude}, ${river.longitude}, ${river.notes})
  `;
}

export async function getSavedRivers(userId) {
  await initDb();
  const result = await sql`
    SELECT * FROM saved_rivers WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function deleteSavedRiver(userId, riverId) {
  await initDb();
  await sql`DELETE FROM saved_rivers WHERE id = ${riverId} AND user_id = ${userId}`;
}

// ============ STATS FUNCTIONS ============

export async function getUserStats(userId) {
  await initDb();

  const totalTrips = await sql`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ${userId}`;
  const totalFish = await sql`SELECT COALESCE(SUM(fish_caught), 0) as total FROM journal_entries WHERE user_id = ${userId}`;
  const speciesCount = await sql`
    SELECT COUNT(DISTINCT species) as count FROM journal_entries WHERE user_id = ${userId} AND species IS NOT NULL
  `;
  const topFlies = await sql`
    SELECT flies_used, SUM(fish_caught) as fish FROM journal_entries
    WHERE user_id = ${userId} AND flies_used IS NOT NULL
    GROUP BY flies_used ORDER BY fish DESC LIMIT 5
  `;
  const topRivers = await sql`
    SELECT river_name, COUNT(*) as trips, SUM(fish_caught) as fish FROM journal_entries
    WHERE user_id = ${userId} AND river_name IS NOT NULL
    GROUP BY river_name ORDER BY trips DESC LIMIT 5
  `;

  return {
    totalTrips: parseInt(totalTrips.rows[0]?.count || 0),
    totalFish: parseInt(totalFish.rows[0]?.total || 0),
    speciesCount: parseInt(speciesCount.rows[0]?.count || 0),
    topFlies: topFlies.rows,
    topRivers: topRivers.rows
  };
}

// ============ PASSWORD RESET FUNCTIONS ============

export async function createPasswordResetToken(userId) {
  await initDb();
  // Generate a random token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `;

  return token;
}

export async function verifyPasswordResetToken(token) {
  await initDb();
  const result = await sql`
    SELECT prt.*, u.email
    FROM password_reset_tokens prt
    JOIN users u ON prt.user_id = u.id
    WHERE prt.token = ${token}
      AND prt.used = 0
      AND prt.expires_at > CURRENT_TIMESTAMP
  `;

  return result.rows[0] || null;
}

export async function usePasswordResetToken(token, newPassword) {
  await initDb();
  const tokenData = await verifyPasswordResetToken(token);
  if (!tokenData) return false;

  const hash = bcrypt.hashSync(newPassword, 10);

  // Update password
  await sql`UPDATE users SET password = ${hash} WHERE id = ${tokenData.user_id}`;

  // Mark token as used
  await sql`UPDATE password_reset_tokens SET used = 1 WHERE token = ${token}`;

  return true;
}

export async function cleanupExpiredTokens() {
  await initDb();
  await sql`DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = 1`;
}
