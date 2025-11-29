'use client';

export default function CustomerInvoicesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Invoices & Contracts</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Recent Invoices</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">Invoice #INV-2024-042</p>
                  <p className="text-sm text-gray-500">Due: Nov 30, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">$1,299.00</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">Invoice #INV-2024-038</p>
                  <p className="text-sm text-gray-500">Paid: Oct 15, 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">$999.00</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Paid
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Active Contracts</h3>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium text-gray-900">Web Hosting Service Agreement</p>
                <p className="text-sm text-gray-500">Valid until: Dec 31, 2024</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium text-gray-900">Premium Support Package</p>
                <p className="text-sm text-gray-500">Valid until: Jan 15, 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

