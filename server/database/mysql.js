/**
 * MySQL Database Connection and Caching Layer
 * 
 * Optional caching layer to reduce API calls to Teamwork.
 * Stores projects and tasks locally for faster access.
 */

const mysql = require('mysql2/promise');

class TeamworkCache {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'teamwork_cache',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000
      });

      // Test connection
      await this.pool.execute('SELECT 1');
      this.isConnected = true;
      
      console.log('✅ MySQL cache connected successfully');
      
      // Initialize tables
      await this.initializeTables();
      
    } catch (error) {
      console.error('❌ MySQL cache connection failed:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Create necessary tables if they don't exist
   */
  async initializeTables() {
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50),
        description TEXT,
        start_date DATE,
        end_date DATE,
        created_on DATETIME,
        last_changed_on DATETIME,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_cached_at (cached_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY,
        project_id INT NOT NULL,
        content VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50),
        priority VARCHAR(20),
        due_date DATE,
        start_date DATE,
        created_on DATETIME,
        last_changed_on DATETIME,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_cached_at (cached_at),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await this.pool.execute(createProjectsTable);
      await this.pool.execute(createTasksTable);
      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize tables:', error.message);
    }
  }  /**
   * Cache projects data
   */
  async cacheProjects(projects) {
    if (!this.isConnected) return;

    try {
      const query = `
        REPLACE INTO projects (
          id, name, status, description, start_date, end_date, 
          created_on, last_changed_on, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const project of projects) {
        await this.pool.execute(query, [
          project.id,
          project.name,
          project.status,
          project.description,
          project.startDate || null,
          project.endDate || null,
          project.createdOn || null,
          project.lastChangedOn || null
        ]);
      }

      console.log(`✅ Cached ${projects.length} projects`);
    } catch (error) {
      console.error('❌ Failed to cache projects:', error.message);
    }
  }

  /**
   * Cache tasks data
   */
  async cacheTasks(projectId, tasks) {
    if (!this.isConnected) return;

    try {
      const query = `
        REPLACE INTO tasks (
          id, project_id, content, description, status, priority,
          due_date, start_date, created_on, last_changed_on, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const task of tasks) {
        await this.pool.execute(query, [
          task.id,
          projectId,
          task.content,
          task.description,
          task.status,
          task.priority,
          task.dueDate || null,
          task.startDate || null,
          task.createdOn || null,
          task.lastChangedOn || null
        ]);
      }

      console.log(`✅ Cached ${tasks.length} tasks for project ${projectId}`);
    } catch (error) {
      console.error('❌ Failed to cache tasks:', error.message);
    }
  }  /**
   * Get cached projects (with freshness check)
   */
  async getCachedProjects(maxAgeMinutes = 60) {
    if (!this.isConnected) return null;

    try {
      const query = `
        SELECT * FROM projects 
        WHERE cached_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY name
      `;
      
      const [rows] = await this.pool.execute(query, [maxAgeMinutes]);
      return rows.length > 0 ? rows : null;
    } catch (error) {
      console.error('❌ Failed to get cached projects:', error.message);
      return null;
    }
  }

  /**
   * Get cached tasks for a project (with freshness check)
   */
  async getCachedTasks(projectId, maxAgeMinutes = 30) {
    if (!this.isConnected) return null;

    try {
      const query = `
        SELECT * FROM tasks 
        WHERE project_id = ? AND cached_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY due_date, created_on
      `;
      
      const [rows] = await this.pool.execute(query, [projectId, maxAgeMinutes]);
      return rows.length > 0 ? rows : null;
    } catch (error) {
      console.error('❌ Failed to get cached tasks:', error.message);
      return null;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ MySQL cache connection closed');
    }
  }
}

// Export singleton instance
module.exports = new TeamworkCache();