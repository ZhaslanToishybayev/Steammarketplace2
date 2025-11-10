/**
 * Base Repository Interface
 * Defines common CRUD operations for all repositories
 */

class BaseRepositoryInterface {
  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    throw new Error('Not implemented');
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Found document or null
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Find one document by query
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (projection, sort, etc.)
   * @returns {Promise<Object|null>} Found document or null
   */
  async findOne(query, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Find multiple documents
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (limit, skip, sort, projection)
   * @returns {Promise<Array>} Array of documents
   */
  async findMany(query, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateById(id, data) {
    throw new Error('Not implemented');
  }

  /**
   * Update one document matching query
   * @param {Object} query - MongoDB query
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateOne(query, data, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Update multiple documents
   * @param {Object} query - MongoDB query
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Update result
   */
  async updateMany(query, data) {
    throw new Error('Not implemented');
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Delete one document matching query
   * @param {Object} query - MongoDB query
   * @returns {Promise<boolean>} Success status
   */
  async deleteOne(query) {
    throw new Error('Not implemented');
  }

  /**
   * Delete multiple documents
   * @param {Object} query - MongoDB query
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(query) {
    throw new Error('Not implemented');
  }

  /**
   * Count documents matching query
   * @param {Object} query - MongoDB query
   * @returns {Promise<number>} Document count
   */
  async count(query = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Check if document exists
   * @param {Object} query - MongoDB query
   * @returns {Promise<boolean>} Exists status
   */
  async exists(query) {
    throw new Error('Not implemented');
  }

  /**
   * Paginate results
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result with items, total, pages
   */
  async paginate(query, options = {}, page = 1, limit = 10) {
    throw new Error('Not implemented');
  }

  /**
   * Aggregate documents
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregated results
   */
  async aggregate(pipeline) {
    throw new Error('Not implemented');
  }
}

module.exports = BaseRepositoryInterface;
