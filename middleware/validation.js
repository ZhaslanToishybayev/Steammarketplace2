const Joi = require('joi');

const validateListing = (req, res, next) => {
  const schema = Joi.object({
    assetId: Joi.string().required(),
    classId: Joi.string().required(),
    instanceId: Joi.string().allow(''),
    name: Joi.string().required(),
    marketName: Joi.string().required(),
    iconUrl: Joi.string().uri().required(),
    price: Joi.number().min(0.01).max(10000).required(),
    description: Joi.string().max(500).allow(''),
    autoAccept: Joi.boolean().default(false)
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details[0].message
    });
  }

  next();
};

// Trade Offer Validation
const validateTradeOffer = (req, res, next) => {
  const schema = Joi.object({
    myAssetIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9]+$/))
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'At least one item must be selected',
        'array.max': 'Maximum 10 items allowed',
        'any.required': 'myAssetIds is required'
      }),
    theirAssetIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9]+$/))
      .max(10)
      .default([])
      .messages({
        'array.max': 'Maximum 10 items allowed'
      }),
    message: Joi.string()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Message cannot exceed 500 characters'
      })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessage
    });
  }

  req.body = value;
  next();
};

// Asset IDs Validation
const validateAssetIds = (req, res, next) => {
  const schema = Joi.object({
    assetIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9]+$/))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one asset ID required',
        'any.required': 'assetIds is required'
      })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  }

  req.body = value;
  next();
};

const validatePurchase = (req, res, next) => {
  // Add any purchase validation logic here
  next();
};

const validateTradeUrl = (req, res, next) => {
  const schema = Joi.object({
    tradeUrl: Joi.string()
      .uri()
      .pattern(/^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+(&token=[A-Za-z0-9]+)?$/)
      .required()
      .messages({
        'string.uri': 'Invalid URL format',
        'string.pattern.base': 'Invalid Steam trade URL format',
        'any.required': 'tradeUrl is required'
      })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Invalid trade URL format',
      details: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateListing,
  validatePurchase,
  validateTradeUrl,
  validateTradeOffer,
  validateAssetIds
};