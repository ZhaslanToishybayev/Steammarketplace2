// Type definitions for axios-retry
// Project: https://github.com/softonic/axios-retry
// Definitions by: Your Name <your-email@example.com>

import * as axios from 'axios';

declare module 'axios-retry' {
  interface IAxiosRetryCondition {
    (error: any): boolean;
  }

  interface IAxiosRetryDelay {
    (retryNumber: number, error: any, response?: axios.AxiosResponse): number;
  }

  interface IAxiosRetryConfig {
    retries?: number;
    retryCondition?: IAxiosRetryCondition;
    retryDelay?: IAxiosRetryDelay;
    shouldResetTimeout?: boolean;
  }

  function isNetworkError(error: any): boolean;
  function isRetryableError(error: any): boolean;
  function exponentialDelay(retryNumber: number, error?: any, response?: axios.AxiosResponse): number;
  function attach(): void;

  function defaultRetry(
    axios: any,
    config?: IAxiosRetryConfig
  ): void;

  export {
    IAxiosRetryCondition,
    IAxiosRetryDelay,
    IAxiosRetryConfig,
    isNetworkError,
    isRetryableError,
    exponentialDelay,
    attach,
    defaultRetry,
  };

  export { defaultRetry as default };
}