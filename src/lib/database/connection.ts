/**
 * SQLite database connection and management utilities
 * 
 * This module provides a singleton database connection manager for the SQLite
 * vocabulary database, including connection pooling, error handling, and
 * database initialization.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { DB_CONFIG, SQL_QUERIES } from './config';

/**
 * SQLite database connection manager
 * Provides singleton access to the database with proper initialization
 */
class DatabaseManager {
    private static instance: DatabaseManager;
    private db: sqlite3.Database | null = null;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() { }

    /**
     * Get the singleton instance of the database manager
     */
    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    /**
     * Initialize the database connection and schema
     * This method is idempotent and can be called multiple times safely
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.doInitialization();
        return this.initializationPromise;
    }

    /**
     * Internal initialization logic
     */
    private async doInitialization(): Promise<void> {
        try {
            // Ensure cache directory exists
            await this.ensureCacheDirectory();

            // Create database connection
            await this.createConnection();

            console.log("Database connection established");

            // Initialize database schema
            await this.initializeSchema();

            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Ensure the cache directory exists
     */
    private async ensureCacheDirectory(): Promise<void> {
        const cacheDir = path.dirname(DB_CONFIG.DB_PATH);
        try {
            await fs.access(cacheDir);
        } catch {
            await fs.mkdir(cacheDir, { recursive: true });
            console.log(`Created cache directory: ${cacheDir}`);
        }
    }

    /**
     * Create and configure the SQLite database connection
     */
    private async createConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(
                DB_CONFIG.DB_PATH,
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                (err) => {
                    if (err) {
                        console.error('Error opening database:', err);
                        reject(err);
                        return;
                    }

                    console.log(`Connected to SQLite database: ${DB_CONFIG.DB_PATH}`);

                    // Enable foreign keys
                    this.db!.run('PRAGMA foreign_keys = ON', (pragmaError) => {
                        if (pragmaError) {
                            console.error('Error enabling foreign keys:', pragmaError);
                            reject(pragmaError);
                            return;
                        }
                        console.log('Foreign keys enabled');
                        resolve();
                    });
                }
            );
        });
    }

    /**
     * Initialize database schema (tables and indexes)
     */
    private async initializeSchema(): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        console.log("Creating tables");

        // Create tables using direct database calls to avoid circular dependency
        console.log("- phrases");
        await this.runQueryDirect(SQL_QUERIES.CREATE_PHRASES_TABLE);
        console.log("- similarity");
        await this.runQueryDirect(SQL_QUERIES.CREATE_SIMILARITY_TABLE);

        console.log("Tables created");

        // Create indexes
        for (const indexQuery of SQL_QUERIES.CREATE_INDEXES) {
            await this.runQueryDirect(indexQuery);
        }

        console.log("Indices created");

        console.log('Database schema initialized');
    }

    /**
     * Execute a SQL query directly without initialization checks
     * Used during initialization to avoid circular dependencies
     */
    private async runQueryDirect(sql: string, params: any[] = []): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not available');
        }

        return new Promise((resolve, reject) => {
            this.db!.run(sql, params, function (err) {
                if (err) {
                    console.error('Query execution error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Get the database connection
     * Automatically initializes the database if not already done
     */
    public async getConnection(): Promise<sqlite3.Database> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.db) {
            throw new Error('Database connection not available');
        }

        return this.db;
    }

    /**
     * Execute a SQL query that doesn't return data (INSERT, UPDATE, DELETE, etc.)
     */
    public async runQuery(sql: string, params: any[] = []): Promise<void> {
        const db = await this.getConnection();

        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    console.error('Query execution error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Execute a SQL query that returns a single row
     */
    public async getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
        const db = await this.getConnection();

        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Query execution error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                    return;
                }
                resolve(row as T);
            });
        });
    }

    /**
     * Execute a SQL query that returns multiple rows
     */
    public async allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const db = await this.getConnection();

        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Query execution error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                    return;
                }
                resolve(rows as T[]);
            });
        });
    }

    /**
     * Execute a SQL query and return the last inserted row ID
     */
    public async runQueryWithLastId(sql: string, params: any[] = []): Promise<number> {
        const db = await this.getConnection();

        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    console.error('Query execution error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
        });
    }

    /**
     * Begin a database transaction
     */
    public async beginTransaction(): Promise<void> {
        await this.runQuery('BEGIN TRANSACTION');
    }

    /**
     * Commit a database transaction
     */
    public async commitTransaction(): Promise<void> {
        await this.runQuery('COMMIT');
    }

    /**
     * Rollback a database transaction
     */
    public async rollbackTransaction(): Promise<void> {
        await this.runQuery('ROLLBACK');
    }

    /**
     * Execute a function within a database transaction
     * Automatically handles commit/rollback based on success/failure
     */
    public async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
        await this.beginTransaction();

        try {
            const result = await fn();
            await this.commitTransaction();
            return result;
        } catch (error) {
            await this.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    public async close(): Promise<void> {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db!.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                        return;
                    }
                    console.log('Database connection closed');
                    this.db = null;
                    this.isInitialized = false;
                    this.initializationPromise = null;
                    resolve();
                });
            });
        }
    }

    /**
     * Check if the database is healthy and responsive
     */
    public async healthCheck(): Promise<boolean> {
        try {
            await this.getQuery('SELECT 1');
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}

/**
 * Get the singleton database manager instance
 */
export function getDatabase(): DatabaseManager {
    return DatabaseManager.getInstance();
}

/**
 * Helper function to format SQL errors for user display
 */
export function formatSqlError(error: any): string {
    if (!error) return 'Unknown database error';

    if (typeof error === 'string') return error;

    if (error.message) {
        // Hide sensitive SQL details from user-facing errors
        if (error.message.includes('SQLITE_CONSTRAINT')) {
            return 'Data constraint violation';
        }
        if (error.message.includes('SQLITE_BUSY')) {
            return 'Database is busy, please try again';
        }
        if (error.message.includes('SQLITE_LOCKED')) {
            return 'Database is locked, please try again';
        }
        return error.message;
    }

    return 'Database operation failed';
}

// Export the singleton instance for backward compatibility
export default getDatabase();

/**
 * Get a database connection for external use
 * This function can be used to obtain a database connection outside the
 * DatabaseManager context, but care should be taken to manage the connection
 * properly (e.g., closing it when done).
 */
export async function getDatabaseConnection() {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize(); // Ensure the database is initialized
    return dbManager.getConnection();
}

/**
 * Insert a new phrase or find an existing one in the database
 * This function attempts to insert a new phrase into the database, and if
 * a conflict occurs (e.g., due to a unique constraint), it retrieves the
 * existing phrase instead.
 * 
 * @param db - The database connection
 * @param phrase - The phrase text to insert or find
 * @param language - The language of the phrase
 * @returns The ID of the inserted or found phrase
 */
export async function insertOrFindPhrase(db: sqlite3.Database, phrase: string, language: string): Promise<number> {
    const insertSql = `INSERT INTO phrases (phrase, language) VALUES (?, ?)`;
    const conflictSql = `SELECT id FROM phrases WHERE phrase = ? AND language = ?`;

    try {
        // Attempt to insert the new phrase
        await db.run(insertSql, [phrase, language]);
    } catch (error) {
        // If a conflict occurs, retrieve the existing phrase ID
        if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT') {
            const row = await db.get(conflictSql, [phrase, language]);
            if (row && hasIdProperty(row)) {
                return row.id;
            }
        }

        // Example usage of hasLastIdProperty
        if (hasLastIdProperty(db)) {
            console.log('Last inserted ID:', db.lastId);
        }

        throw error;
    }

    // Return the ID of the newly inserted phrase
    if (hasLastIdProperty(db)) {
        return db.lastId;
    }
    return -1;
}

// Type guard to check if an error has a 'code' property
function isSqliteError(error: unknown): error is { code: string; } {
    return typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string';
}

// Type guard to check if a row has an 'id' property
function hasIdProperty(row: unknown): row is { id: number; } {
    return typeof row === 'object' && row !== null && 'id' in row && typeof (row as any).id === 'number';
}

// Type guard to check if db has a 'lastId' property
function hasLastIdProperty(db: unknown): db is { lastId: number; } {
    return typeof db === 'object' && db !== null && 'lastId' in db && typeof (db as any).lastId === 'number';
}
