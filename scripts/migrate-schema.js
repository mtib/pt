const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database file
const dbPath = path.resolve(__dirname, '../cache/vocabulary.db');

// Open the database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Migration script
const migrationCommands = [
    // Create the new categories table
    `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );`,

    // Add the category_id column to the similarity table
    `ALTER TABLE similarity ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;`,

    // Create an index on the category_id column in the similarity table
    `CREATE INDEX IF NOT EXISTS idx_similarity_category ON similarity(category_id);`,

    // Drop the categories column from the phrases table
    'DROP INDEX IF EXISTS phrases.idx_phrases_category;',
    `CREATE TABLE IF NOT EXISTS phrases_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phrase TEXT NOT NULL,
        language TEXT NOT NULL,
        relative_frequency REAL
    );`,
    `INSERT INTO phrases_new (id, phrase, language, relative_frequency)
     SELECT id, phrase, language, relative_frequency FROM phrases;`,
    `DROP TABLE phrases;`,
    `ALTER TABLE phrases_new RENAME TO phrases;`
];

// Execute the migration commands
(async function migrate() {
    try {
        for (const command of migrationCommands) {
            await new Promise((resolve, reject) => {
                db.run(command, (err) => {
                    if (err) {
                        console.error('Error executing command:', command, '\n', err.message);
                        reject(err);
                    } else {
                        console.log('Successfully executed command:', command);
                        resolve();
                    }
                });
            });
        }
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
})();
