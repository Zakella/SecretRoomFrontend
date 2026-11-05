export const environment = {
  production: false,
  apiUrl: 'http://localhost:9090/api/',
  frontend: 'http://localhost:7200',
  analytics: { measurementId: '', hosts: [] as string[] },
  // SR-207: journal of visitor actions (only with cookie consent); false switches the tracker off entirely
  visitorTracking: true
};
