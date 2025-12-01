'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';

const MIGRATE_QUOTATIONS = gql`
  mutation MigrateQuotationCompanyIds {
    migrateQuotationCompanyIds {
      success
      message
      updated
      failed
      synced
      errors
    }
  }
`;

export default function MigratePage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);
  const [migrateQuotations] = useMutation(MIGRATE_QUOTATIONS);

  const handleMigrate = async () => {
    if (!window.confirm('Are you sure you want to run the quotation migration? This will update all existing quotations with companyId.')) {
      return;
    }

    setMigrating(true);
    setResult(null);

    try {
      const { data } = await migrateQuotations();

      if (data?.migrateQuotationCompanyIds?.success) {
        const migrationResult = data.migrateQuotationCompanyIds;
        setResult(migrationResult);
        toast.success(migrationResult.message);
      } else {
        throw new Error('Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Migration failed');
      setResult({ success: false, message: error.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Quotation Migration</h1>
        <p className="text-indigo-100">Add companyId to existing quotations and sync counts</p>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-3">What does this do?</h2>
            <div className="space-y-2 text-gray-600">
              <p className="flex items-start">
                <span className="mr-2">•</span>
                <span>Adds <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">companyId</code> field to all existing quotations based on their creator's company</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">•</span>
                <span>Updates company quotation counts to reflect actual quotation numbers</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ensures accurate tracking in the Companies module's "Plan & Usage" section</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Card */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important Notes</h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-1">
              <p>• This is a <strong>one-time migration</strong> for existing quotations</p>
              <p>• New quotations created after this will automatically include companyId</p>
              <p>• Safe to run multiple times - will only update quotations missing companyId</p>
              <p>• Process may take a few seconds depending on the number of quotations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className={`
            px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300
            ${migrating 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 active:scale-95'
            }
            text-white flex items-center space-x-3
          `}
        >
          {migrating ? (
            <>
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Running Migration...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Run Migration</span>
            </>
          )}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className={`rounded-xl border-2 p-6 ${result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {result.success ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? '✅ Migration Completed!' : '❌ Migration Failed'}
              </h3>
              <p className={`mb-4 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
              
              {result.success && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Quotations Updated</p>
                    <p className="text-2xl font-bold text-green-600">{result.updated || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Companies Synced</p>
                    <p className="text-2xl font-bold text-blue-600">{result.synced || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-gray-600">{result.failed || 0}</p>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">Errors:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.errors.map((error, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Next Step:</strong> Go to the <a href="/super-admin/companies" className="underline font-semibold hover:text-blue-900">Companies</a> page to see the updated quotation counts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

