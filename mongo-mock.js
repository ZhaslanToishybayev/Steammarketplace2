/**
 * MongoDB Mock для разработки без реальной БД
 * Имитирует основные функции mongoose
 */

const EventEmitter = require('events');

class MockConnection extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // connected
    this.db = {
      databaseName: 'steam-marketplace',
      collections: new Map()
    };
  }

  async connect() {
    return this;
  }

  async close() {
    this.readyState = 0;
    return this;
  }

  collection(name) {
    if (!this.db.collections.has(name)) {
      this.db.collections.set(name, new MockCollection(name));
    }
    return this.db.collections.get(name);
  }

  model(name, schema) {
    return mongooseMock.model(name, schema);
  }
}

class MockCollection extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.data = [];
    this.indexes = [];
  }

  async createIndex(fields, options) {
    this.indexes.push({ fields, options });
    return `${Object.keys(fields)[0]}_1`;
  }

  async find(query = {}, options = {}) {
    let results = [...this.data];

    // Простая фильтрация
    Object.keys(query).forEach(key => {
      if (key === '_id') {
        results = results.filter(item => item._id?.toString() === query[key]?.toString());
      } else if (typeof query[key] === 'object' && query[key] !== null) {
        // Операторы $eq, $gt, etc.
        Object.keys(query[key]).forEach(op => {
          if (op === '$eq') {
            results = results.filter(item => item[key] === query[key][op]);
          }
        });
      } else {
        results = results.filter(item => item[key] === query[key]);
      }
    });

    return results;
  }

  async findOne(query = {}) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async insertOne(doc) {
    const _id = require('mongoose').Types.ObjectId();
    const newDoc = { ...doc, _id, createdAt: new Date() };
    this.data.push(newDoc);
    return { acknowledged: true, insertedId: _id };
  }

  async insertMany(docs) {
    const ids = [];
    docs.forEach(doc => {
      const _id = require('mongoose').Types.ObjectId();
      const newDoc = { ...doc, _id, createdAt: new Date() };
      this.data.push(newDoc);
      ids.push(_id);
    });
    return { acknowledged: true, insertedIds: ids };
  }

  async updateOne(filter, update) {
    const results = await this.find(filter);
    if (results.length > 0) {
      Object.assign(results[0], update.$set || update);
      return { acknowledged: true, modifiedCount: 1 };
    }
    return { acknowledged: true, modifiedCount: 0 };
  }

  async deleteOne(filter) {
    const beforeLength = this.data.length;
    this.data = this.data.filter(item => {
      return !Object.keys(filter).every(key => {
        if (key === '_id') {
          return item._id?.toString() === filter[key]?.toString();
        }
        return item[key] === filter[key];
      });
    });
    return { acknowledged: true, deletedCount: beforeLength - this.data.length };
  }
}

const mongooseMock = {
  connection: null,
  Types: {
    ObjectId: () => ({
      toString: () => Math.random().toString(36).substr(2, 9)
    })
  },

  async connect(uri) {
    this.connection = new MockConnection();
    setTimeout(() => this.connection.emit('connected'), 100);
    return this.connection;
  },

  model(name, schema) {
    // Возвращаем простую модель
    return {
      find: (...args) => this.connection.collection(name.toLowerCase() + 's').find(...args),
      findOne: (...args) => this.connection.collection(name.toLowerCase() + 's').findOne(...args),
      findById: (...args) => this.connection.collection(name.toLowerCase() + 's').findById(...args),
      create: (doc) => this.connection.collection(name.toLowerCase() + 's').insertOne(doc),
      save: function(doc) {
        return this.connection.collection(name.toLowerCase() + 's').insertOne(doc);
      }
    };
  },

  Schema: class {
    constructor(def, options = {}) {
      this.def = def;
      this.options = options;
    }
  },

  modelExists: () => false,
  set: () => {},
  get: () => {}
};

module.exports = mongooseMock;
