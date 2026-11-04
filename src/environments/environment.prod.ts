export const environment = {
  production: true,
  apiUrl: 'https://api.secretroom.md/api/',
  frontend: 'https://secretroom.md',
  analytics: { measurementId: 'G-H4H04KH2Z2', hosts: ['secretroom.md', 'www.secretroom.md'] },
  // SR-207: journal of visitor actions (only with cookie consent); false switches the tracker off entirely
  visitorTracking: true
};
