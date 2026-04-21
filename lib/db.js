const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'design-auto.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = [
  {
    name: '001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        preset_id TEXT,
        type TEXT NOT NULL,
        title TEXT,
        input_content TEXT,
        input_options TEXT,
        current_version_id TEXT,
        favorite INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_assets_project_type ON assets(project_id, type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS asset_versions (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        html TEXT,
        image_paths TEXT,
        prompt TEXT,
        note TEXT,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_versions_asset ON asset_versions(asset_id, created_at DESC);
    `
  }
];

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name));
for (const m of migrations) {
  if (applied.has(m.name)) continue;
  db.exec('BEGIN');
  try {
    db.exec(m.sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(m.name);
    db.exec('COMMIT');
    console.log(`[db] migration applied: ${m.name}`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const uuid = () => crypto.randomUUID();

function getOrCreateDefaultProject() {
  const row = db.prepare('SELECT * FROM projects ORDER BY created_at ASC LIMIT 1').get();
  if (row) return row;
  const id = uuid();
  db.prepare('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)').run(
    id, '기본 프로젝트', '자동 생성된 기본 프로젝트'
  );
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function createAssetWithVersion({ assetId, versionId, projectId, type, title, content, options, html, imagePaths, prompt, tokensIn = 0, tokensOut = 0, note = '초기 생성' }) {
  assetId = assetId || uuid();
  versionId = versionId || uuid();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO assets (id, project_id, type, title, input_content, input_options, current_version_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      assetId, projectId, type, title || null,
      JSON.stringify(content || {}), JSON.stringify(options || {}), versionId
    );
    db.prepare(`INSERT INTO asset_versions (id, asset_id, html, image_paths, prompt, note, tokens_input, tokens_output)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      versionId, assetId, html, JSON.stringify(imagePaths || []), prompt || null, note, tokensIn, tokensOut
    );
  });
  tx();
  return { assetId, versionId };
}

function addVersion({ versionId, assetId, html, imagePaths, prompt, note, tokensIn = 0, tokensOut = 0 }) {
  versionId = versionId || uuid();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO asset_versions (id, asset_id, html, image_paths, prompt, note, tokens_input, tokens_output)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      versionId, assetId, html, JSON.stringify(imagePaths || []), prompt || null, note || null, tokensIn, tokensOut
    );
    db.prepare(`UPDATE assets SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
      versionId, assetId
    );
  });
  tx();
  return versionId;
}

function listAssets({ projectId, type, limit = 100 } = {}) {
  const where = [];
  const params = [];
  if (projectId) { where.push('a.project_id = ?'); params.push(projectId); }
  if (type) { where.push('a.type = ?'); params.push(type); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit);
  return db.prepare(`
    SELECT a.*, v.image_paths, v.created_at AS version_created_at
    FROM assets a
    LEFT JOIN asset_versions v ON v.id = a.current_version_id
    ${whereSql}
    ORDER BY a.updated_at DESC
    LIMIT ?
  `).all(...params).map(row => ({
    ...row,
    input_content: safeJson(row.input_content, {}),
    input_options: safeJson(row.input_options, {}),
    image_paths: safeJson(row.image_paths, []),
    favorite: !!row.favorite
  }));
}

function getAsset(id) {
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!asset) return null;
  const versions = db.prepare('SELECT * FROM asset_versions WHERE asset_id = ? ORDER BY created_at DESC').all(id);
  return {
    ...asset,
    input_content: safeJson(asset.input_content, {}),
    input_options: safeJson(asset.input_options, {}),
    favorite: !!asset.favorite,
    versions: versions.map(v => ({ ...v, image_paths: safeJson(v.image_paths, []) }))
  };
}

function updateAssetTitle(id, title) {
  db.prepare('UPDATE assets SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, id);
}

function toggleFavorite(id) {
  db.prepare('UPDATE assets SET favorite = 1 - favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  return db.prepare('SELECT favorite FROM assets WHERE id = ?').get(id);
}

function deleteAsset(id) {
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
}

function setCurrentVersion(assetId, versionId) {
  db.prepare('UPDATE assets SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(versionId, assetId);
}

function safeJson(s, fallback) {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

function health() {
  try {
    const r = db.prepare('SELECT COUNT(*) AS c FROM assets').get();
    return { ok: true, asset_count: r.c, path: DB_PATH };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  db,
  uuid,
  getOrCreateDefaultProject,
  createAssetWithVersion,
  addVersion,
  listAssets,
  getAsset,
  updateAssetTitle,
  toggleFavorite,
  deleteAsset,
  setCurrentVersion,
  health
};
