"use client";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto py-20">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white sm:text-6xl">
            Deploy Your Apps
            <span className="text-indigo-600 dark:text-indigo-400"> Instantly</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A local multitenant SaaS simulator with Kubernetes, Helm, and an admin dashboard.
            Perfect for demos and onboarding up to ~10 customers.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <a
              href="/register"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 shadow-lg transition-colors"
            >
              Get Started Free
            </a>
            <a
              href="/dashboard"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 shadow-lg border-2 border-indigo-600 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-gray-700 transition-colors"
            >
              Open Dashboard
            </a>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Spin up tenant environments in seconds with Kubernetes and Helm. Local cluster with nginx-ingress for rapid deployment.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Secure by Default</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Enterprise-grade security with JWT authentication, automatic SSL via nginx-ingress, and namespace isolation.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Auto Scaling</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Easily scale your tenant deployments with replica management. Monitor and adjust resources in real-time.
            </p>
          </div>
        </div>

        <div className="mt-32 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Powered by Modern Tech</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Everything you need for multitenant deployments</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Kind/K3d</div>
              <div className="text-gray-600 dark:text-gray-300">Local Kubernetes</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Helm</div>
              <div className="text-gray-600 dark:text-gray-300">Chart Management</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">FastAPI</div>
              <div className="text-gray-600 dark:text-gray-300">JWT + Alembic</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Next.js</div>
              <div className="text-gray-600 dark:text-gray-300">React + Tailwind</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
