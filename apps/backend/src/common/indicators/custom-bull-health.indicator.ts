import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class CustomBullHealthIndicator extends HealthIndicator {
  constructor() {
    super();
  }
  async isHealthy(key: string, queue: Queue): Promise<HealthIndicatorResult> {
    try {
      // Check if queue is defined
      if (!queue) {
        throw new Error(`Queue "${key}" is not defined`);
      }

      // Check if queue is ready (await the promise)
      try {
        await queue.isReady();
      } catch (error) {
        throw new Error(`Queue "${key}" is not ready: ${error.message}`);
      }

      // Try to get queue job counts
      let jobCounts;
      try {
        jobCounts = await queue.getJobCounts();
      } catch (error) {
        // If we can't get job counts, the queue might still be healthy
        // Log the error but don't fail the health check
        console.warn(`Could not retrieve job counts for queue "${key}":`, error.message);
      }

      return this.getStatus(key, true, {
        queueName: queue.name,
        ready: true,
        ...(jobCounts && {
          waiting: jobCounts.waiting || 0,
          active: jobCounts.active || 0,
          completed: jobCounts.completed || 0,
          failed: jobCounts.failed || 0,
          delayed: jobCounts.delayed || 0,
        }),
      });
    } catch (error) {
      throw new HealthCheckError(
        key,
        error.message || `Bull queue health check failed for key "${key}"`
      );
    }
  }
}