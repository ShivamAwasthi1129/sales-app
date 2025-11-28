'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';

const GET_COUPONS = gql`
  query GetCoupons {
    getCoupons {
      id
      code
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      applicableProductIds
      applicableGroupIds
      createdAt
      updatedAt
    }
  }
`;

const GET_COUPON = gql`
  query GetCoupon($id: ID!) {
    getCoupon(id: $id) {
      id
      code
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
      applicableProductIds
      applicableGroupIds
    }
  }
`;

const CREATE_COUPON = gql`
  mutation CreateCoupon($input: CouponInput!) {
    createCoupon(input: $input) {
      id
      code
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
    }
  }
`;

const UPDATE_COUPON = gql`
  mutation UpdateCoupon($id: ID!, $input: CouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
      code
      name
      description
      discountType
      discountValue
      minPurchase
      maxDiscount
      validFrom
      validTo
      usageLimit
      usedCount
      status
      applicableTo
    }
  }
`;

const DELETE_COUPON = gql`
  mutation DeleteCoupon($id: ID!) {
    deleteCoupon(id: $id) {
      success
      message
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts {
    getProducts {
      id
      name
      group {
        id
        name
      }
    }
  }
`;

const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
    }
  }
`;

export default function CouponManagement() {
  const [activeTab, setActiveTab] = useState('list');
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [seedingCoupons, setSeedingCoupons] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: 0,
    maxDiscount: null,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    usageLimit: null,
    status: 'active',
    applicableTo: 'all',
    applicableProductIds: [],
    applicableGroupIds: [],
  });

  const { data: couponsData, loading: couponsLoading, refetch: refetchCoupons } = useQuery(GET_COUPONS, {
    fetchPolicy: 'network-only',
  });

  const { data: productsData } = useQuery(GET_PRODUCTS, {
    fetchPolicy: 'network-only',
    skip: formData.applicableTo !== 'products',
  });

  const { data: groupsData } = useQuery(GET_GROUPS, {
    fetchPolicy: 'network-only',
    skip: formData.applicableTo !== 'groups',
  });

  const [getCoupon, { data: couponData }] = useLazyQuery(GET_COUPON, {
    fetchPolicy: 'network-only',
  });

  const [createCoupon, { loading: creating, error: createError }] = useMutation(CREATE_COUPON, {
    onError: (error) => {
      console.error('Create coupon error:', error);
      toast.error(error.message || 'Failed to create coupon');
    },
    onCompleted: (data) => {
      console.log('Create coupon completed:', data);
    }
  });
  const [updateCoupon, { loading: updating, error: updateError }] = useMutation(UPDATE_COUPON, {
    onError: (error) => {
      console.error('Update coupon error:', error);
      toast.error(error.message || 'Failed to update coupon');
    }
  });
  const [deleteCoupon] = useMutation(DELETE_COUPON);

  // Load coupon for editing
  useEffect(() => {
    if (editingCouponId && couponData?.getCoupon) {
      const coupon = couponData.getCoupon;
      setFormData({
        code: coupon.code || '',
        name: coupon.name || '',
        description: coupon.description || '',
        discountType: coupon.discountType || 'percentage',
        discountValue: coupon.discountValue || 0,
        minPurchase: coupon.minPurchase || 0,
        maxDiscount: coupon.maxDiscount || null,
        validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : new Date().toISOString().split('T')[0],
        validTo: coupon.validTo ? coupon.validTo.split('T')[0] : new Date().toISOString().split('T')[0],
        usageLimit: coupon.usageLimit || null,
        status: coupon.status || 'active',
        applicableTo: coupon.applicableTo || 'all',
        applicableProductIds: coupon.applicableProductIds || [],
        applicableGroupIds: coupon.applicableGroupIds || [],
      });
    }
  }, [couponData, editingCouponId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEdit = (couponId) => {
    setEditingCouponId(couponId);
    setActiveTab('add');
    getCoupon({ variables: { id: couponId } });
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      await deleteCoupon({ variables: { id: couponId } });
      toast.success('Coupon deleted successfully');
      refetchCoupons();
    } catch (error) {
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const handleCancel = () => {
    setEditingCouponId(null);
    setActiveTab('list');
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: 0,
      maxDiscount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: null,
      status: 'active',
      applicableTo: 'all',
      applicableProductIds: [],
      applicableGroupIds: [],
    });
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('=== Form submit triggered ===', { 
      formData, 
      creating, 
      updating, 
      editingCouponId,
      hasCreateCoupon: !!createCoupon,
      hasUpdateCoupon: !!updateCoupon
    });
    
    // Prevent double submission
    if (creating || updating) {
      console.log('Already processing, skipping...');
      return;
    }

    // Validation
    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Coupon name is required');
      return;
    }
    const discountValue = typeof formData.discountValue === 'string' && formData.discountValue.trim() === '' 
      ? null 
      : parseFloat(formData.discountValue);
    
    if (!discountValue || discountValue <= 0 || isNaN(discountValue)) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (formData.discountType === 'percentage' && discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    if (new Date(formData.validTo) < new Date(formData.validFrom)) {
      toast.error('Valid To date must be after Valid From date');
      return;
    }

    try {
      // Clean and format input data
      const input = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        discountType: formData.discountType,
        discountValue: discountValue,
        minPurchase: formData.minPurchase || 0,
        maxDiscount: formData.maxDiscount || null,
        usageLimit: formData.usageLimit || null,
        status: formData.status || 'active',
        applicableTo: formData.applicableTo || 'all',
        applicableProductIds: formData.applicableProductIds || [],
        applicableGroupIds: formData.applicableGroupIds || [],
        validFrom: new Date(formData.validFrom).toISOString(),
        validTo: new Date(formData.validTo).toISOString(),
      };

      console.log('=== SUBMITTING COUPON ===');
      console.log('Input data:', JSON.stringify(input, null, 2));
      console.log('Editing mode:', !!editingCouponId);
      console.log('createCoupon available:', typeof createCoupon === 'function');
      console.log('updateCoupon available:', typeof updateCoupon === 'function');
      
      if (editingCouponId) {
        console.log('Updating coupon:', editingCouponId);
        const result = await updateCoupon({ 
          variables: { id: editingCouponId, input },
          refetchQueries: [{ query: GET_COUPONS }]
        });
        console.log('Update result:', result);
        if (result?.data?.updateCoupon) {
          toast.success('Coupon updated successfully');
          handleCancel();
          await refetchCoupons();
        } else {
          console.error('Update failed - no data returned');
          toast.error('Failed to update coupon');
        }
      } else {
        console.log('Creating new coupon...');
        if (!createCoupon || typeof createCoupon !== 'function') {
          console.error('createCoupon is not a function!', createCoupon);
          toast.error('Coupon creation service unavailable. Please refresh the page.');
          return;
        }
        
        const result = await createCoupon({ 
          variables: { input },
          refetchQueries: [{ query: GET_COUPONS }]
        });
        
        console.log('=== CREATE RESULT ===');
        console.log('Full result:', result);
        console.log('Result data:', result?.data);
        console.log('Result errors:', result?.errors);
        
        if (result?.data?.createCoupon) {
          console.log('✅ Coupon created successfully!');
          toast.success('Coupon created successfully');
          handleCancel();
          await refetchCoupons();
        } else if (result?.errors && result.errors.length > 0) {
          console.error('❌ GraphQL errors:', result.errors);
          const errorMsg = result.errors[0]?.message || 'Failed to create coupon';
          toast.error(errorMsg);
        } else {
          console.error('❌ No data and no errors - unexpected response');
          toast.error('Failed to create coupon - unexpected response');
        }
      }
    } catch (error) {
      console.error('=== ERROR IN HANDLESUBMIT ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('GraphQL errors:', error.graphQLErrors);
      console.error('Network error:', error.networkError);
      console.error('Error stack:', error.stack);
      
      const errorMessage = error.message || 
                          error.graphQLErrors?.[0]?.message || 
                          error.networkError?.message ||
                          'Failed to save coupon. Check console for details.';
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isCouponExpired = (validTo) => {
    return new Date(validTo) < new Date();
  };

  const isCouponValid = (coupon) => {
    const now = new Date();
    return (
      coupon.status === 'active' &&
      now >= new Date(coupon.validFrom) &&
      now <= new Date(coupon.validTo) &&
      (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('list');
              handleCancel();
            }}
            className={`${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            All Coupons
          </button>
          <button
            onClick={() => {
              setEditingCouponId(null);
              setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'percentage',
                discountValue: '',
                minPurchase: 0,
                maxDiscount: null,
                validFrom: new Date().toISOString().split('T')[0],
                validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                usageLimit: null,
                status: 'active',
                applicableTo: 'all',
                applicableProductIds: [],
                applicableGroupIds: [],
              });
              setActiveTab('add');
            }}
            className={`${
              activeTab === 'add'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer`}
          >
            {editingCouponId ? 'Edit Coupon' : 'Create Coupon'}
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <div className="bg-white rounded-lg shadow">
          {/* Header with Create Button */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Coupons</h2>
            <button
              onClick={() => {
                setEditingCouponId(null);
                setFormData({
                  code: '',
                  name: '',
                  description: '',
                  discountType: 'percentage',
                  discountValue: '',
                  minPurchase: 0,
                  maxDiscount: null,
                  validFrom: new Date().toISOString().split('T')[0],
                  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  usageLimit: null,
                  status: 'active',
                  applicableTo: 'all',
                  applicableProductIds: [],
                  applicableGroupIds: [],
                });
                setActiveTab('add');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Coupon</span>
            </button>
          </div>
          {couponsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading coupons...</p>
            </div>
          ) : couponsData?.getCoupons?.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-500">No coupons found</p>
              <p className="mt-2 text-sm text-gray-400 mb-4">Create your first coupon to get started</p>
              <button
                onClick={async () => {
                  setSeedingCoupons(true);
                  try {
                    const response = await fetch('/api/seed-coupons', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) {
                      toast.success(`Successfully seeded ${data.created} coupons!`);
                      refetchCoupons();
                    } else {
                      toast.error(data.error || 'Failed to seed coupons');
                    }
                  } catch (error) {
                    toast.error('Failed to seed coupons: ' + error.message);
                  } finally {
                    setSeedingCoupons(false);
                  }
                }}
                disabled={seedingCoupons}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seedingCoupons ? 'Seeding...' : 'Seed Test Coupons (10 coupons)'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {couponsData?.getCoupons?.map((coupon) => {
                    const expired = isCouponExpired(coupon.validTo);
                    const valid = isCouponValid(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="font-mono font-semibold text-indigo-600">{coupon.code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-sm text-gray-500">{coupon.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {coupon.discountType === 'percentage' 
                              ? `${coupon.discountValue}%`
                              : `$${coupon.discountValue.toFixed(2)}`}
                            {coupon.maxDiscount && coupon.discountType === 'percentage' && (
                              <div className="text-xs text-gray-500">Max: ${coupon.maxDiscount.toFixed(2)}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validTo).toLocaleDateString()}
                          </div>
                          {expired && (
                            <div className="text-xs text-red-600">Expired</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {coupon.usedCount} / {coupon.usageLimit || '∞'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(coupon.status)}`}>
                            {coupon.status}
                          </span>
                          {valid && (
                            <div className="text-xs text-green-600 mt-1">Valid</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(coupon.id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Code will be converted to uppercase</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Summer Sale 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter coupon description..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Discount Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => handleInputChange('discountType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discountType === 'percentage' ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={(e) => handleInputChange('discountValue', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder={formData.discountType === 'percentage' ? '20' : '50.00'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Discount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount || ''}
                      onChange={(e) => handleInputChange('maxDiscount', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Purchase ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minPurchase}
                  onChange={(e) => handleInputChange('minPurchase', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum order amount required to use this coupon</p>
              </div>
            </div>

            {/* Validity & Usage */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Validity & Usage</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => handleInputChange('validFrom', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => handleInputChange('validTo', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit || ''}
                    onChange={(e) => handleInputChange('usageLimit', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Unlimited (leave empty)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited usage</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Applicability */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Applicability</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable To
                </label>
                <select
                  value={formData.applicableTo}
                  onChange={(e) => handleInputChange('applicableTo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Products</option>
                  <option value="products">Specific Products</option>
                  <option value="groups">Product Groups</option>
                </select>
              </div>

              {formData.applicableTo === 'products' && productsData?.getProducts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Products
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {productsData.getProducts.map((product) => (
                      <label key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.applicableProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleInputChange('applicableProductIds', [...formData.applicableProductIds, product.id]);
                            } else {
                              handleInputChange('applicableProductIds', formData.applicableProductIds.filter(id => id !== product.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{product.name}</span>
                        {product.group && (
                          <span className="text-xs text-gray-500">({product.group.name})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.applicableTo === 'groups' && groupsData?.getGroups && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Groups
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {groupsData.getGroups.map((group) => (
                      <label key={group.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.applicableGroupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleInputChange('applicableGroupIds', [...formData.applicableGroupIds, group.id]);
                            } else {
                              handleInputChange('applicableGroupIds', formData.applicableGroupIds.filter(id => id !== group.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 border-t pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  try {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('=== CREATE COUPON BUTTON CLICKED ===');
                    console.log('Button state:', { 
                      creating, 
                      updating, 
                      editingQuotationId: editingCouponId,
                      formDataCode: formData.code,
                      formDataName: formData.name,
                      formDataDiscountValue: formData.discountValue,
                      hasCreateCoupon: typeof createCoupon === 'function',
                      createCouponValue: createCoupon
                    });
                    
                    if (creating || updating) {
                      console.log('⚠️ Button disabled - already processing');
                      return;
                    }
                    
                    console.log('✅ Calling handleSubmit...');
                    await handleSubmit(e);
                    console.log('✅ handleSubmit completed');
                  } catch (err) {
                    console.error('❌ Error in button onClick:', err);
                    toast.error('An error occurred. Check console for details.');
                  }
                }}
                disabled={creating || updating}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating || updating ? 'Saving...' : editingCouponId ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

