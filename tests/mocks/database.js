// Mock MongoDB/Mongoose for testing
const mongoose = require('mongoose');

// Create mock models
const createMockModel = (name, schema = {}) => {
  return {
    name,
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    populate: jest.fn(),
    exec: jest.fn(),
    schema
  };
};

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve()),
  connection: {
    close: jest.fn(() => Promise.resolve()),
    readyState: 1
  },
  Schema: jest.fn().mockImplementation(() => ({})),
  model: jest.fn((name) => createMockModel(name)),
  Types: {
    ObjectId: jest.fn()
  }
}));

module.exports = {
  createMockModel
};
