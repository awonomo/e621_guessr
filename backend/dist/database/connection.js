import { Pool } from 'pg';
import { config } from '../config/database.js';
export class DatabaseManager {
    static instance;
    pool;
    constructor() {
        this.pool = new Pool(config.database);
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
            return result;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    async getClient() {
        return this.pool.connect();
    }
    async close() {
        await this.pool.end();
    }
    // Health check
    async healthCheck() {
        try {
            await this.query('SELECT 1');
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}
export default DatabaseManager.getInstance();
//# sourceMappingURL=connection.js.map