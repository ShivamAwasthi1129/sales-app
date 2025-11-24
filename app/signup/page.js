'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const packages = [
  {
    id: 'base',
    name: 'Base Package',
    price: '$99',
    period: '/month',
    description: 'Perfect for small businesses getting started',
    limits: {
      adminTeam: 2,
      superAdmin: 2,
      clients: 50,
    },
    features: [
      '2 Admin Team Members',
      '2 Super Admin Accounts',
      '50 Client Accounts',
      'Basic Analytics Dashboard',
      'Email Support',
      'Standard Security Features',
      'Product Catalogue Management',
      'Basic Reporting Tools',
    ],
    popular: false,
    color: 'blue',
  },
  {
    id: 'professional',
    name: 'Professional Package',
    price: '$199',
    period: '/month',
    description: 'Ideal for growing businesses with more needs',
    limits: {
      adminTeam: 5,
      superAdmin: 5,
      clients: 200,
    },
    features: [
      '5 Admin Team Members',
      '5 Super Admin Accounts',
      '200 Client Accounts',
      'Advanced Analytics Dashboard',
      'Priority Email Support',
      'Enhanced Security Features',
      'Advanced Product Catalogue',
      'Advanced Reporting & Insights',
      'API Access',
      'Custom Integrations',
    ],
    popular: true,
    color: 'purple',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Package',
    price: '$399',
    period: '/month',
    description: 'For large organizations with extensive requirements',
    limits: {
      adminTeam: 20,
      superAdmin: 10,
      clients: 1000,
    },
    features: [
      '20 Admin Team Members',
      '10 Super Admin Accounts',
      '1000 Client Accounts',
      'Premium Analytics Dashboard',
      '24/7 Priority Support',
      'Enterprise-Grade Security',
      'Unlimited Product Catalogue',
      'Custom Reporting & BI Tools',
      'Full API Access',
      'White-Label Options',
      'Dedicated Account Manager',
      'Custom Training Sessions',
    ],
    popular: false,
    color: 'indigo',
  },
];

export default function SignupPage() {
  const router = useRouter();

  const handlePackageSelect = (pkg) => {
    router.push(`/signup/register?package=${pkg.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Package
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your business needs. All packages include full access to our sales management system.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => handlePackageSelect(pkg)}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-2xl ${
                pkg.popular
                  ? 'border-purple-500 ring-4 ring-purple-200'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Package Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br ${
                    pkg.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    pkg.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    'from-indigo-500 to-indigo-600'
                  } shadow-lg`}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm">{pkg.description}</p>
                </div>

                {/* Pricing */}
                <div className="text-center mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{pkg.price}</span>
                    <span className="text-gray-600 ml-2">{pkg.period}</span>
                  </div>
                </div>

                {/* Limits */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Admin Team</span>
                    <span className="text-lg font-bold text-gray-900">{pkg.limits.adminTeam}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Super Admin</span>
                    <span className="text-lg font-bold text-gray-900">{pkg.limits.superAdmin}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Clients</span>
                    <span className="text-lg font-bold text-gray-900">{pkg.limits.clients}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Features:</h4>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select Button */}
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Select Package
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center text-gray-600 text-sm">
          <p>All packages include a 14-day free trial. No credit card required.</p>
        </div>
      </div>
    </div>
  );
}

