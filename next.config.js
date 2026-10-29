/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
  async redirects() {
    return [
      // /purchase-requisitions is the older, simpler PR screen (list + a
      // read-only "View" modal, no item management). /purchase/requisitions
      // is the fuller implementation (per-item add/approve, status tracking,
      // and the PR -> PO conversion flow) and is what notification links
      // already point at (see src/lib/notificationRoutes.js: MR -> /purchase/requisitions/:id).
      // The DB-driven sidebar (ui_control_elements, seeded from
      // erp-backend/prisma/seeds/seed-ui-control.ts) still has the old path
      // wired in for some roles, so this redirect keeps that live link
      // working while routing everyone to the complete page instead of
      // maintaining two divergent PR screens. The old page file is left in
      // place (not deleted) in case this needs to be reverted.
      {
        source: '/purchase-requisitions',
        destination: '/purchase/requisitions',
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;
