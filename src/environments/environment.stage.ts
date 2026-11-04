export const environment = {
  production: true,
  apiUrl: 'https://api-sr.solterprise.com/api/',
  frontend: 'https://sr.solterprise.com',
  analytics: { measurementId: '', hosts: [] as string[] },
  // SR-207: journal of visitor actions (only with cookie consent); false switches the tracker off entirely
  visitorTracking: true
};
