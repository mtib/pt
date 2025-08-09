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
                    this.configureConnection().then(resolve).catch(reject);
                }
            );
        });
    }

    /**
     * Configure database connection settings
     */
    private async configureConnection(): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        const promises: Promise<void>[] = [];

        // Enable foreign key constraints
        if (DB_CONFIG.ENABLE_FOREIGN_KEYS) {
            promises.push(this.runQuery('PRAGMA foreign_keys = ON'));
        }

        // Enable WAL mode for better concurrent access
        if (DB_CONFIG.ENABLE_WAL_MODE) {
            promises.push(this.runQuery('PRAGMA journal_mode = WAL'));
        }

        // Set connection timeout
        promises.push(this.runQuery(`PRAGMA busy_timeout = ${DB_CONFIG.CONNECTION_TIMEOUT}`));

        await Promise.all(promises);
    }

    /**
     * Initialize database schema (tables and indexes)
     */
    private async initializeSchema(): Promise<void> {
        if (!this.db) {
            throw new Error('Database connection not established');
        }

        // Create tables
        await this.runQuery(SQL_QUERIES.CREATE_PHRASES_TABLE);
        await this.runQuery(SQL_QUERIES.CREATE_SIMILARITY_TABLE);

        // Create indexes
        for (const indexQuery of SQL_QUERIES.CREATE_INDEXES) {
            await this.runQuery(indexQuery);
        }

        console.log('Database schema initialized');
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
     * Get database file size in bytes
     */
    public async getDatabaseSize(): Promise<number> {
        try {
            const stats = await fs.stat(DB_CONFIG.DB_PATH);
            return stats.size;
        } catch {
            return 0;
        }
    }

    /**
     * Format database size as human-readable string
     */
    public async getFormattedDatabaseSize(): Promise<string> {
        const bytes = await this.getDatabaseSize();

        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
