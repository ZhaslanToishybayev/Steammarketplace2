/**
 * Retry Utility with Exponential Backoff
 * For resilient API calls to Steam and other external services
 */

/**
 * Sleep for a given duration
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @param {Function} options.onRetry - Callback on each retry attempt
 */
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        shouldRetry = defaultShouldRetry,
        onRetry = null,
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt >= maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff + jitter
            const delay = Math.min(
                baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
                maxDelay
            );

            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`);

            if (onRetry) {
                onRetry(error, attempt + 1);
            }

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Default function to determine if an error is retryable
 */
function defaultShouldRetry(error) {
    // Network errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET') {
        return true;
    }

    // HTTP errors that are typically transient
    if (error.response) {
        const status = error.response.status;
        // 429 Too Many Requests, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
        return status === 429 || status === 502 || status === 503 || status === 504;
    }

    // Steam-specific errors
    if (error.message?.includes('rate limit') ||
        error.message?.includes('too many requests') ||
        error.message?.includes('temporarily unavailable')) {
        return true;
    }

    return false;
}

/**
 * Steam-specific retry configuration
 */
const steamRetryOptions = {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    shouldRetry: (error) => {
        // Steam-specific checks
        if (error.message?.includes('403')) return false; // Forbidden - don't retry
        if (error.message?.includes('401')) return false; // Unauthorized - don't retry
        return defaultShouldRetry(error);
    },
};

/**
 * Database retry configuration (shorter)
 */
const dbRetryOptions = {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
};

/**
 * Retry wrapper for axios/fetch calls
 */
async function fetchWithRetry(fetchFn, options = steamRetryOptions) {
    return withRetry(fetchFn, options);
}

module.exports = {
    sleep,
    withRetry,
    fetchWithRetry,
    defaultShouldRetry,
    steamRetryOptions,
    dbRetryOptions,
};
