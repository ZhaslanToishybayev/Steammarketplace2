/**
 * DTO Layer Index
 * Exports all DTOs
 */

// Request DTOs
const CreateUserDTO = require('./requests/CreateUserDTO');
const UpdateUserDTO = require('./requests/UpdateUserDTO');
const CreateListingDTO = require('./requests/CreateListingDTO');
const CreateTradeOfferDTO = require('./requests/CreateTradeOfferDTO');

// Response DTOs
const UserResponseDTO = require('./responses/UserResponseDTO');
const ListingResponseDTO = require('./responses/ListingResponseDTO');
const TradeOfferResponseDTO = require('./responses/TradeOfferResponseDTO');
const PaginatedResponseDTO = require('./responses/PaginatedResponseDTO');

module.exports = {
  // Requests
  CreateUserDTO,
  UpdateUserDTO,
  CreateListingDTO,
  CreateTradeOfferDTO,

  // Responses
  UserResponseDTO,
  ListingResponseDTO,
  TradeOfferResponseDTO,
  PaginatedResponseDTO
};
