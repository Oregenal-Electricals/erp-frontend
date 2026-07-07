const https = require('https');
const BASE = 'https://erp-frontend-five-alpha.vercel.app';

const pages = [
  '/dashboard', '/analytics',
  '/masters', '/masters/company', '/masters/plant', '/masters/vendors',
  '/masters/products', '/masters/raw-materials', '/masters/department',
  '/settings', '/settings/system',
  '/users', '/change-requests',
  '/gate/dashboard', '/gate/visitors',
  '/purchase-orders', '/purchase-requisitions', '/rfq',
  '/grn', '/iqc',
  '/sales-orders', '/quotations', '/leads', '/dispatches',
  '/inventory-dashboard', '/stock-ledger',
  '/production-dashboard', '/work-orders',
  '/quality-dashboard', '/ncr', '/capa',
  '/hr/employees', '/hr/attendance', '/hr/payroll',
  '/hr/leave', '/hr/training', '/hr/reports',
  '/finance/accounts', '/finance/vouchers', '/finance/ar',
  '/finance/ap', '/finance/gst', '/finance/bank-recon',
  '/notifications', '/alerts', '/tasks', '/workflows',
  '/documents', '/mis-reports',
  '/vendor-portal', '/customer-portal',
  '/iot',
  '/inventory-dashboard', '/production-dashboard', '/quality-dashboard',
];

let passed = 0; let failed = 0; const failures = [];

function checkPage(path) {
  return new Promise((resolve) => {
    https.get(BASE + path, (res) => {
      if (res.statusCode === 200) {
        console.log('✅', path);
        passed++;
      } else {
        console.log('❌', path, '→', res.statusCode);
        failed++;
        failures.push(path);
      }
      resolve();
    }).on('error', (e) => {
      console.log('❌', path, '→ ERR');
      failed++;
      failures.push(path);
      resolve();
    });
  });
}

async function run() {
  for (const p of pages) {
    await checkPage(p);
  }
  console.log('\n=== FRONTEND PAGE CHECK ===');
  console.log('✅ Passed:', passed);
  console.log('❌ Failed:', failed);
  if (failures.length > 0) {
    console.log('Failed pages:', failures.join(', '));
  } else {
    console.log('🎉 ALL PAGES PASSING!');
  }
}
run();
