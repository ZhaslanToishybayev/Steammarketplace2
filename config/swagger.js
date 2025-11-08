const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Steam Marketplace API',
      version: '2.0.0',
      description: 'CSGO Skin marketplace with Steam integration',
      contact: {
        name: 'API Support',
        email: 'support@steammarketplace.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.steammarketplace.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization header. Example: "Authorization: Bearer {token}"'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            steamId: {
              type: 'string',
              description: 'Steam ID'
            },
            username: {
              type: 'string',
              description: 'Steam username'
            },
            wallet: {
              type: 'object',
              properties: {
                balance: {
                  type: 'number',
                  description: 'Available balance'
                },
                pendingBalance: {
                  type: 'number',
                  description: 'Pending balance'
                }
              }
            },
            reputation: {
              type: 'object',
              properties: {
                positive: {
                  type: 'number',
                  description: 'Positive ratings'
                },
                negative: {
                  type: 'number',
                  description: 'Negative ratings'
                },
                total: {
                  type: 'number',
                  description: 'Total ratings'
                }
              }
            }
          }
        },
        MarketListing: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Listing ID'
            },
            itemName: {
              type: 'string',
              description: 'Item name'
            },
            itemImage: {
              type: 'string',
              description: 'Item image URL'
            },
            price: {
              type: 'number',
              description: 'Listing price'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending_trade', 'sold', 'cancelled'],
              description: 'Listing status'
            },
            seller: {
              type: 'object',
              properties: {
                _id: {
                  type: 'string'
                },
                username: {
                  type: 'string'
                },
                steamId: {
                  type: 'string'
                }
              }
            }
          }
        },
        TradeOffer: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            offerId: {
              type: 'string',
              description: 'Steam trade offer ID'
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'declined', 'cancelled']
            },
            listingId: {
              type: 'string'
            },
            buyer: {
              type: 'string'
            },
            seller: {
              type: 'string'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
