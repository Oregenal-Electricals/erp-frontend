const axios = require('axios');
const BASE = 'http://localhost:3001/api/v1';

async function getToken() {
  if (!process.env.E2E_TOKEN) {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: 'admin@acmeelectronics.com',
      password: 'Admin@1234',
    });
    process.env.E2E_TOKEN = res.data.accessToken;
    process.env.E2E_COMPANY = res.data.user.companyId;
  }
  return process.env.E2E_TOKEN;
}

function api() {
  // Return axios instance factory - called fresh each time to get latest token
  return {
    get: (url, config = {}) => getToken().then(t => 
      axios.get(`${BASE}${url}`, { headers: { Authorization: `Bearer ${t}` }, ...config })),
    post: (url, data, config = {}) => getToken().then(t => 
      axios.post(`${BASE}${url}`, data, { headers: { Authorization: `Bearer ${t}` }, ...config })),
    put: (url, data, config = {}) => getToken().then(t => 
      axios.put(`${BASE}${url}`, data, { headers: { Authorization: `Bearer ${t}` }, ...config })),
    delete: (url, config = {}) => getToken().then(t => 
      axios.delete(`${BASE}${url}`, { headers: { Authorization: `Bearer ${t}` }, ...config })),
    patch: (url, data, config = {}) => getToken().then(t => 
      axios.patch(`${BASE}${url}`, data, { headers: { Authorization: `Bearer ${t}` }, ...config })),
  };
}

module.exports = { api, BASE };
