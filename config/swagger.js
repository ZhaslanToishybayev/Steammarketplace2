const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Steam Marketplace API',
      version: '2.0.0',
      description: `
# Steam Marketplace API

A comprehensive REST API for CSGO/CS2 skin marketplace with Steam integration.

## Features

- 🔐 Steam authentication via OAuth
- 💰 Wallet and payment processing
- 🛒 Marketplace listings and transactions
- 🔄 Trade offer management
- 📊 Real-time metrics and monitoring
- 🔔 Slack notifications
- 📈 Prometheus metrics
- 📝 Comprehensive logging

## Authentication

All protected endpoints require a JWT token in the Authorization header:

\`\`\`
Authorization: Bearer {token}
\`\`\`

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes
- **Premium**: 5000 requests per 15 minutes

## Error Format

All errors follow this format:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

## Status Codes

- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`429\` - Too Many Requests
- \`500\` - Internal Server Error
      `,
      termsOfService: 'https://sgomarket.com/terms',
      contact: {
        name: 'API Support Team',
        email: 'support@sgomarket.com',
        url: 'https://sgomarket.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.sgomarket.com',
        description: 'Production server',
        variables: {
          environment: {
            default: 'prod',
            description: 'The environment name'
          }
        }
      },
      {
        url: 'https://staging-api.sgomarket.com',
        description: 'Staging server'
      }
    ],
    externalDocs: {
      description: 'Additional Documentation',
      url: 'https://docs.sgomarket.com'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization header. Example: "Authorization: Bearer {token}"'
        },
        steamAuth: {
          type: 'oauth2',
          description: 'Steam OpenID authentication',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://steamcommunity.com/openid/login',
              tokenUrl: 'https://sgomarket.com/api/auth/steam/callback',
              scopes: {
                'read': 'Read user information',
                'write': 'Perform actions on behalf of user',
                'trade': 'Access Steam trade functionality'
              }
            }
          }
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for application-level access'
        }
      },
      schemas: {
        // ========================================================================
        // ERROR SCHEMAS
        // ========================================================================
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request'
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'INVALID_REQUEST'
            },
            details: {
              type: 'object',
              description: 'Additional error details',
              example: {
                field: 'email',
                value: 'invalid-email'
              }
            },
            requestId: {
              type: 'string',
              description: 'Unique request ID for tracking',
              example: 'req_123456789'
            }
          }
        },
        ValidationError: {
          type: 'object',
          required: ['error', 'details'],
          properties: {
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'object' }
                }
              }
            }
          }
        },

        // ========================================================================
        // AUTH SCHEMAS
        // ========================================================================
        LoginRequest: {
          type: 'object',
          required: ['steamId', 'ticket'],
          properties: {
            steamId: {
              type: 'string',
              description: 'Steam ID',
              example: '76561198000000000'
            },
            ticket: {
              type: 'string',
              description: 'Steam authentication ticket',
              example: 'XBOX123...'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          required: ['token', 'refreshToken', 'user'],
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIs...'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
              example: 'eyJhbGciOiJIUzI1NiIs...'
            },
            expiresIn: {
              type: 'number',
              description: 'Token expiration time in seconds',
              example: 3600
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token',
              example: 'eyJhbGciOiJIUzI1NiIs...'
            }
          }
        },

        // ========================================================================
        // USER SCHEMAS
        // ========================================================================
        User: {
          type: 'object',
          required: ['_id', 'steamId', 'username', 'createdAt'],
          properties: {
            _id: {
              type: 'string',
              description: 'Unique user ID',
              example: '507f1f77bcf86cd799439011'
            },
            steamId: {
              type: 'string',
              description: 'Steam 64-bit ID',
              example: '76561198000000000'
            },
            username: {
              type: 'string',
              description: 'Steam username',
              example: 'SteamUser'
            },
            avatar: {
              type: 'object',
              properties: {
                small: { type: 'string', example: 'https://example.com/avatar.jpg' },
                medium: { type: 'string', example: 'https://example.com/avatar_medium.jpg' },
                large: { type: 'string', example: 'https://example.com/avatar_full.jpg' }
              }
            },
            wallet: {
              type: 'object',
              properties: {
                balance: {
                  type: 'number',
                  description: 'Available balance in USD',
                  example: 150.50
                },
                pendingBalance: {
                  type: 'number',
                  description: 'Pending balance in USD',
                  example: 25.00
                },
                currency: {
                  type: 'string',
                  example: 'USD'
                }
              }
            },
            reputation: {
              type: 'object',
              properties: {
                positive: {
                  type: 'number',
                  example: 150
                },
                negative: {
                  type: 'number',
                  example: 5
                },
                total: {
                  type: 'number',
                  example: 155
                },
                score: {
                  type: 'number',
                  example: 96.8
                }
              }
            },
            inventory: {
              type: 'object',
              properties: {
                totalItems: {
                  type: 'number',
                  example: 250
                },
                estimatedValue: {
                  type: 'number',
                  example: 1250.75
                },
                lastUpdated: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00Z'
                }
              }
            },
            settings: {
              type: 'object',
              properties: {
                twoFactorEnabled: {
                  type: 'boolean',
                  example: true
                },
                tradeOffersEnabled: {
                  type: 'boolean',
                  example: true
                },
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean', example: true },
                    slack: { type: 'boolean', example: true }
                  }
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            steamId: {
              type: 'string',
              example: '76561198000000000'
            },
            username: {
              type: 'string',
              example: 'SteamUser'
            },
            reputation: {
              $ref: '#/components/schemas/User/properties/reputation'
            },
            inventory: {
              $ref: '#/components/schemas/User/properties/inventory'
            },
            lastSeen: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            isOnline: {
              type: 'boolean',
              example: false
            }
          }
        },

        // ========================================================================
        // MARKETPLACE SCHEMAS
        // ========================================================================
        MarketListing: {
          type: 'object',
          required: ['_id', 'itemName', 'itemHashName', 'price', 'status', 'seller'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            itemName: {
              type: 'string',
              description: 'Display name of the item',
              example: 'AK-47 | Redline (Field-Tested)'
            },
            itemHashName: {
              type: 'string',
              description: 'Hashed name for Steam API',
              example: 'AK-47 | Redline (Field-Tested)'
            },
            itemImage: {
              type: 'string',
              description: 'Item image URL',
              example: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1X.png'
            },
            game: {
              type: 'string',
              enum: ['csgo', 'cs2'],
              example: 'cs2'
            },
            price: {
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  example: 45.99
                },
                currency: {
                  type: 'string',
                  example: 'USD'
                }
              }
            },
            suggestedPrice: {
              type: 'number',
              description: 'Steam market suggested price',
              example: 42.50
            },
            status: {
              type: 'string',
              enum: ['active', 'pending_trade', 'sold', 'cancelled', 'expired'],
              example: 'active'
            },
            seller: {
              type: 'object',
              properties: {
                _id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011'
                },
                username: {
                  type: 'string',
                  example: 'SellerUser'
                },
                steamId: {
                  type: 'string',
                  example: '76561198000000000'
                },
                reputation: {
                  type: 'number',
                  example: 96.8
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-02-15T10:30:00Z'
            }
          }
        },
        CreateListingRequest: {
          type: 'object',
          required: ['itemName', 'price'],
          properties: {
            itemName: {
              type: 'string',
              example: 'AK-47 | Redline (Field-Tested)'
            },
            itemHashName: {
              type: 'string',
              example: 'AK-47 | Redline (Field-Tested)'
            },
            itemImage: {
              type: 'string',
              example: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1X.png'
            },
            price: {
              type: 'number',
              minimum: 0.01,
              example: 45.99
            },
            game: {
              type: 'string',
              enum: ['csgo', 'cs2'],
              example: 'cs2'
            }
          }
        },

        // ========================================================================
        // TRADE SCHEMAS
        // ========================================================================
        TradeOffer: {
          type: 'object',
          required: ['_id', 'offerId', 'listingId', 'status'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            offerId: {
              type: 'string',
              description: 'Steam trade offer ID',
              example: '1234567890'
            },
            listingId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            type: {
              type: 'string',
              enum: ['buy', 'sell'],
              example: 'buy'
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'accepted', 'declined', 'cancelled', 'expired'],
              example: 'pending'
            },
            buyer: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                steamId: { type: 'string' },
                username: { type: 'string' }
              }
            },
            seller: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                steamId: { type: 'string' },
                username: { type: 'string' }
              }
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  image: { type: 'string' },
                  value: { type: 'number' }
                }
              }
            },
            value: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // ========================================================================
        // PAYMENT SCHEMAS
        // ========================================================================
        Payment: {
          type: 'object',
          required: ['_id', 'amount', 'currency', 'status', 'method'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            transactionId: {
              type: 'string',
              example: 'tx_123456789'
            },
            amount: {
              type: 'number',
              example: 50.00
            },
            currency: {
              type: 'string',
              example: 'USD'
            },
            method: {
              type: 'string',
              enum: ['stripe', 'paypal', 'steam', 'crypto'],
              example: 'stripe'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
              example: 'completed'
            },
            description: {
              type: 'string',
              example: 'Wallet funding'
            },
            metadata: {
              type: 'object',
              additionalProperties: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        CreatePaymentRequest: {
          type: 'object',
          required: ['amount', 'currency', 'method'],
          properties: {
            amount: {
              type: 'number',
              minimum: 1,
              example: 50.00
            },
            currency: {
              type: 'string',
              example: 'USD'
            },
            method: {
              type: 'string',
              enum: ['stripe', 'paypal'],
              example: 'stripe'
            },
            description: {
              type: 'string',
              example: 'Wallet funding'
            }
          }
        },

        // ========================================================================
        // STEAM SCHEMAS
        // ========================================================================
        SteamInventory: {
          type: 'object',
          properties: {
            totalItems: {
              type: 'number',
              example: 250
            },
            appId: {
              type: 'number',
              example: 730
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  marketHashName: { type: 'string' },
                  name: { type: 'string' },
                  icon: { type: 'string' },
                  quantity: { type: 'number' },
                  tradable: { type: 'boolean' }
                }
              }
            }
          }
        },
        SteamPrice: {
          type: 'object',
          properties: {
            lowestPrice: {
              type: 'string',
              example: '$45.99'
            },
            volume: {
              type: 'string',
              example: '123'
            },
            medianPrice: {
              type: 'string',
              example: '$42.50'
            }
          }
        },

        // ========================================================================
        // METRICS SCHEMAS
        // ========================================================================
        MetricsSummary: {
          type: 'object',
          properties: {
            uptime: {
              type: 'number',
              example: 86400
            },
            memory: {
              type: 'object',
              properties: {
                heapUsed: { type: 'number' },
                heapTotal: { type: 'number' },
                external: { type: 'number' },
                rss: { type: 'number' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            environment: {
              type: 'string',
              example: 'production'
            },
            version: {
              type: 'string',
              example: '2.0.0'
            }
          }
        },

        // ========================================================================
        // PAGINATION SCHEMAS
        // ========================================================================
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1
            },
            limit: {
              type: 'number',
              example: 20
            },
            total: {
              type: 'number',
              example: 100
            },
            pages: {
              type: 'number',
              example: 5
            },
            hasNext: {
              type: 'boolean',
              example: true
            },
            hasPrev: {
              type: 'boolean',
              example: false
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            meta: {
              $ref: '#/components/schemas/PaginationMeta'
            }
          }
        },

        // ========================================================================
        // HEALTH SCHEMAS
        // ========================================================================
        HealthStatus: {
          type: 'object',
          required: ['status', 'timestamp'],
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              example: 86400
            },
            version: {
              type: 'string',
              example: '2.0.0'
            },
            checks: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['up', 'down', 'degraded']
                  },
                  responseTime: {
                    type: 'number',
                    example: 50
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              },
              example: {
                error: 'Validation failed',
                details: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                    value: 'not-an-email'
                  }
                ]
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized',
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                code: 'FORBIDDEN',
                message: 'Insufficient permissions'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not Found',
                code: 'NOT_FOUND',
                message: 'User not found'
              }
            }
          }
        },
        RateLimit: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Try again later.',
                retryAfter: 900
              }
            }
          }
        },
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Internal server error',
                code: 'SERVER_ERROR',
                message: 'An unexpected error occurred'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Steam authentication and token management'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Marketplace',
        description: 'Marketplace listings and transactions'
      },
      {
        name: 'Trade',
        description: 'Steam trade offer management'
      },
      {
        name: 'Payments',
        description: 'Payment processing and wallet management'
      },
      {
        name: 'Steam',
        description: 'Steam API integration'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      },
      {
        name: 'System',
        description: 'System health and monitoring'
      },
      {
        name: 'Slack',
        description: 'Slack notifications and testing'
      }
    ]
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
