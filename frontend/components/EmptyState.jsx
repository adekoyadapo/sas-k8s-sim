"use client";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

export default function EmptyState({ onCreateClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full"
    >
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full flex items-center justify-center mb-6"
        >
          <Rocket className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No deployments yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
          Get started by creating your first tenant deployment. It only takes a few seconds!
        </p>

        <button
          onClick={onCreateClick}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 shadow-lg transition-all hover:shadow-xl hover:scale-105"
        >
          Create Your First Deployment
        </button>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">1. Configure</div>
            <div>Choose server type</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">2. Deploy</div>
            <div>Launch in seconds</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">3. Manage</div>
            <div>Scale & monitor</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
