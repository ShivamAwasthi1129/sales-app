'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetchPaymentDetails(sessionId);
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  const fetchPaymentDetails = async (sessionId) => {
    try {
      const response = await fetch(`/api/payment/verify?session_id=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }
      const data = await response.json();
      setPaymentDetails(data);

      // Update quotation with payment information if payment is successful
      if (data.paymentStatus === 'paid' && (data.quotationNo || data.quotationId)) {
        const identifier = data.quotationNo || data.quotationId;
        console.log('Attempting to update quotation:', identifier);
        try {
          const updateResponse = await fetch('/api/payment/update-quotation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quotationNo: data.quotationNo,
              quotationId: data.quotationId, // Keep as fallback
              payment: {
                sessionId: data.sessionId,
                paymentStatus: data.paymentStatus,
                amount: data.amount,
                currency: data.currency,
                customerEmail: data.customerEmail,
                paymentMode: data.paymentMode,
                subscriptionId: data.subscriptionId,
                paidAt: new Date().toISOString(),
              },
              status: 'paid',
            }),
          });

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('Quotation updated successfully:', updateResult);
            // Show success message to user
            setPaymentDetails(prev => ({
              ...prev,
              quotationUpdated: true,
            }));
          } else {
            const errorText = await updateResponse.text();
            console.error('Failed to update quotation. Status:', updateResponse.status, 'Error:', errorText);
            // Retry once after a short delay
            setTimeout(async () => {
              try {
                console.log('Retrying quotation update...');
                const retryResponse = await fetch('/api/payment/update-quotation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    quotationNo: data.quotationNo,
                    quotationId: data.quotationId, // Keep as fallback
                    payment: {
                      sessionId: data.sessionId,
                      paymentStatus: data.paymentStatus,
                      amount: data.amount,
                      currency: data.currency,
                      customerEmail: data.customerEmail,
                      paymentMode: data.paymentMode,
                      subscriptionId: data.subscriptionId,
                      paidAt: new Date().toISOString(),
                    },
                    status: 'paid',
                  }),
                });
                if (retryResponse.ok) {
                  const retryResult = await retryResponse.json();
                  console.log('Quotation updated successfully on retry:', retryResult);
                } else {
                  const retryError = await retryResponse.text();
                  console.error('Retry also failed:', retryError);
                }
              } catch (retryErr) {
                console.error('Error retrying quotation update:', retryErr);
              }
            }, 2000);
          }
        } catch (updateErr) {
          console.error('Error updating quotation:', updateErr);
          // Don't show error to user as payment was successful
        }
      } else {
        console.warn('Cannot update quotation - missing data:', {
          paymentStatus: data.paymentStatus,
          quotationNo: data.quotationNo,
          quotationId: data.quotationId,
        });
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-linear-to-r from-green-500 to-emerald-600 px-8 py-12 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-green-100 text-lg">Thank you for your payment</p>
        </div>

        {/* Payment Details */}
        <div className="p-8">
          {paymentDetails && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quotation Number:</span>
                    <span className="font-semibold text-gray-900">{paymentDetails.quotationNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-semibold text-green-600 text-lg">
                      {paymentDetails.currency?.toUpperCase() || '$'} {paymentDetails.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {paymentDetails.paymentMode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Type:</span>
                      <span className="font-semibold text-gray-900 capitalize">
                        {paymentDetails.paymentMode === 'subscription' ? 'Subscription' : 'One-time Payment'}
                      </span>
                    </div>
                  )}
                  {paymentDetails.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-gray-900">{paymentDetails.customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {paymentDetails.paymentMode === 'subscription' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-blue-800">
                    <strong>Subscription Active:</strong> Your subscription has been activated. You will receive a confirmation email shortly.
                  </p>
                </div>
              )}

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="text-green-800">
                  <strong>Receipt:</strong> A payment receipt has been sent to your email address.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              Go to Home
            </Link>
            {paymentDetails?.quotationNo && (
              <button
                onClick={() => router.push(`/dashboard/quotations`)}
                className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                View Quotations
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

