/**
 * Configuration file for API base URL
 * Automatically switches between production and development environments
 */

const API_BASE_URL = import.meta.env.PROD
  ? 'https://school-checker-epmh.onrender.com'
  : 'http://localhost:3000';

export default API_BASE_URL;

