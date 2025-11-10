/**
 * Base Repository Implementation
 * Provides common CRUD operations for all repositories
 */

const mongoose = require('mongoose');

class BaseRepository {
  /**
   * @param {mongoose.Model} model - Mongoose model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      const document = new this.model(data);
      const saved = await document.save();
      return saved;
    } catch (error) {
      throw new Error(`Create failed: ${error.message}`);
    }
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Found document or null
   */
  async findById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.model.findById(id);
    } catch (error) {
      throw new Error(`FindById failed: ${error.message}`);
    }
  }

  /**
   * Find one document by query
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (projection, sort, etc.)
   * @returns {Promise<Object|null>} Found document or null
   */
  async findOne(query, options = {}) {
    try {
      return await this.model.findOne(query, options.projection, options);
    } catch (error) {
      throw new Error(`FindOne failed: ${error.message}`);
    }
  }

  /**
   * Find multiple documents
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (limit, skip, sort, projection)
   * @returns {Promise<Array>} Array of documents
   */
  async findMany(query = {}, options = {}) {
    try {
      let queryBuilder = this.model.find(query);

      if (options.projection) {
        queryBuilder = queryBuilder.select(options.projection);
      }

      if (options.sort) {
        queryBuilder = queryBuilder.sort(options.sort);
      }

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
      }

      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`FindMany failed: ${error.message}`);
    }
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateById(id, data) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.model.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`UpdateById failed: ${error.message}`);
    }
  }

  /**
   * Update one document matching query
   * @param {Object} query - MongoDB query
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateOne(query, data, options = {}) {
    try {
      const updateOptions = {
        new: true,
        runValidators: true,
        ...options
      };
      return await this.model.findOneAndUpdate(query, { $set: data }, updateOptions);
    } catch (error) {
      throw new Error(`UpdateOne failed: ${error.message}`);
    }
  }

  /**
   * Update multiple documents
   * @param {Object} query - MongoDB query
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Update result
   */
  async updateMany(query, data) {
    try {
      return await this.model.updateMany(query, { $set: data });
    } catch (error) {
      throw new Error(`UpdateMany failed: ${error.message}`);
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return false;
      }
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`DeleteById failed: ${error.message}`);
    }
  }

  /**
   * Delete one document matching query
   * @param {Object} query - MongoDB query
   * @returns {Promise<boolean>} Success status
   */
  async deleteOne(query) {
    try {
      const result = await this.model.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`DeleteOne failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents
   * @param {Object} query - MongoDB query
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(query) {
    try {
      return await this.model.deleteMany(query);
    } catch (error) {
      throw new Error(`DeleteMany failed: ${error.message}`);
    }
  }

  /**
   * Count documents matching query
   * @param {Object} query - MongoDB query
   * @returns {Promise<number>} Document count
   */
  async count(query = {}) {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      throw new Error(`Count failed: ${error.message}`);
    }
  }

  /**
   * Check if document exists
   * @param {Object} query - MongoDB query
   * @returns {Promise<boolean>} Exists status
   */
  async exists(query) {
    try {
      const result = await this.model.exists(query);
      return !!result;
    } catch (error) {
      throw new Error(`Exists check failed: ${error.message}`);
    }
  }

  /**
   * Paginate results
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated result with items, total, pages
   */
  async paginate(query = {}, options = {}, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const total = await this.model.countDocuments(query);

      let queryBuilder = this.model.find(query);

      if (options.projection) {
        queryBuilder = queryBuilder.select(options.projection);
      }

      if (options.sort) {
        queryBuilder = queryBuilder.sort(options.sort);
      }

      queryBuilder = queryBuilder.skip(skip).limit(limit);

      const items = await queryBuilder.exec();

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Paginate failed: ${error.message}`);
    }
  }

  /**
   * Aggregate documents
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregated results
   */
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw new Error(`Aggregate failed: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;
