// Backend API service for scoring and tag validation
export interface BackendTagScore {
  guess: string;
  actualTag?: string;
  score: number;
  isCorrect: boolean;
  category?: number;
}

class BackendApiService {
  private baseUrl: string;
  
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl; // Use relative URLs to go through Vite proxy
  }

  /**
   * Score a tag guess using the backend scoring service
   */
  async scoreTag(guess: string): Promise<BackendTagScore | null> {
    console.log('[BackendAPI] Scoring tag:', guess);
    
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${this.baseUrl}/api/scoring/score`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ guess })
        }
      );

      const duration = Date.now() - startTime;
      console.log('[BackendAPI] Score request completed in', duration + 'ms');

      if (!response.ok) {
        console.warn('[BackendAPI] Scoring failed:', response.status, response.statusText);
        return null;
      }

      const result: BackendTagScore = await response.json();
      console.log('[BackendAPI] Score result:', result);
      return result;
    } catch (error) {
      console.error('[BackendAPI] Scoring request failed:', error);
      return null;
    }
  }

  /**
   * Score multiple tags in bulk (for round breakdown)
   */
  async scoreBulkTags(guesses: string[]): Promise<BackendTagScore[]> {
    console.log('[BackendAPI] Bulk scoring', guesses.length, 'tags');
    
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${this.baseUrl}/api/scoring/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ guesses })
        }
      );

      const duration = Date.now() - startTime;
      console.log('[BackendAPI] Bulk request completed in', duration + 'ms');

      if (!response.ok) {
        console.warn('[BackendAPI] Bulk scoring failed:', response.status, response.statusText);
        return [];
      }

      const result = await response.json();
      console.log('[BackendAPI] Bulk scored', result.successful, 'of', result.total, 'tags');
      return result.results || [];
    } catch (error) {
      console.error('[BackendAPI] Bulk scoring request failed:', error);
      return [];
    }
  }

  /**
   * Check if a tag exists in the database (without scoring)
   */
  async checkTag(tagName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/tags/search?q=${encodeURIComponent(tagName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.found === true;
    } catch (error) {
      console.warn('Backend tag check failed:', error);
      return false;
    }
  }

  /**
   * Health check - verify backend is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  }
}

export const backendApi = new BackendApiService();
export default backendApi;