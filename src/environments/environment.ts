export const environment = {
  production: false,
  apiUrl: 'http://localhost:9090/api/',
  frontend: 'http://localhost:7200',
  analytics: { measurementId: '', hosts: [] as string[] },
  // SR-207: journal of visitor actions (only with cookie consent); false switches the tracker off entirely
  visitorTracking: true,
  // SR-213: share of cookie consents (one anonymous event per banner decision); false — nothing is sent
  consentTracking: true
};
