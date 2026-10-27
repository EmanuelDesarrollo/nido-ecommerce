export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export const HEALTH_SERVICE_NAME = 'nido-api';
