import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Smart Manufacturing ERP
        </h1>
        <p className="text-gray-500 text-lg">
          Enterprise MES Platform — Phase 0 Live
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Login
          </Link>

          <a
            href={process.env.NEXT_PUBLIC_API_URL + '/health'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
          >
            API Health
          </a>
        </div>
      </div>
    </main>
  );
}
