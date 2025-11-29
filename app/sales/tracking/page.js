'use client';

export default function SalesTrackingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Quotation Tracking</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Track the status and progress of your quotations</p>
        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-semibold">P</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Pending Approval</p>
              <p className="text-sm text-gray-500">8 quotations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">A</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Approved</p>
              <p className="text-sm text-gray-500">12 quotations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-semibold">R</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Rejected</p>
              <p className="text-sm text-gray-500">3 quotations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

