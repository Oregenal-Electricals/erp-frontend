const axios = require('axios');

const BASE = 'http://localhost:3001/api/v1';

function getToken() {
  return process.env.E2E_TOKEN;
}

function api() {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${getToken()}` },
  });
}

module.exports = { api, BASE };
