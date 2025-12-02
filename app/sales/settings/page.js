'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import { getCurrentUserFromToken } from '../../../lib/auth';

const GET_CURRENT_USER_FULL = gql`
  query GetCurrentUserFull {
    getCurrentUser {
      id
      name
      email
      role
      phone
      address
      salesPersonId
      dateOfBirth
      photo
      about
      status
      companyId
      company {
        id
        name
        email
        phone
        address
        website
      }
      createdByAdmin {
        id
        name
        email
        phone
      }
      passwordChangeRequest {
        status
        requestedAt
        respondedAt
        canChangePassword
        passwordChangedAt
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $name: String
    $phone: String
    $address: String
    $dateOfBirth: String
    $about: String
  ) {
    updateUser(
      id: $id
      name: $name
      phone: $phone
      address: $address
      dateOfBirth: $dateOfBirth
      about: $about
    ) {
      id
      name
      phone
      address
      dateOfBirth
      about
    }
  }
`;

const REQUEST_PASSWORD_CHANGE = gql`
  mutation RequestPasswordChange {
    requestPasswordChange {
      success
      message
      user {
        id
        passwordChangeRequest {
          status
          requestedAt
        }
      }
    }
  }
`;

const UPDATE_PASSWORD_WITH_APPROVAL = gql`
  mutation UpdatePasswordWithApproval($oldPassword: String!, $newPassword: String!) {
    updatePasswordWithApproval(oldPassword: $oldPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export default function SalesSettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    about: '',
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);

  const { data: userData, loading, error, refetch } = useQuery(GET_CURRENT_USER_FULL, {
    fetchPolicy: 'network-only',
  });

  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER);
  const [requestPasswordChange, { loading: requesting }] = useMutation(REQUEST_PASSWORD_CHANGE);
  const [updatePassword, { loading: updatingPassword }] = useMutation(UPDATE_PASSWORD_WITH_APPROVAL);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (userData?.getCurrentUser) {
      const user = userData.getCurrentUser;
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        about: user.about || '',
      });
    }
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      await updateUser({
        variables: {
          id: userData.getCurrentUser.id,
          ...formData,
        },
      });

      // Show success modal
      setShowProfileSuccessModal(true);
      
      // Also show toast
      toast.success('Profile updated successfully!');
      
      // Refetch user data
      refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  const handleRequestPasswordChange = async () => {
    try {
      const { data } = await requestPasswordChange();
      
      if (data.requestPasswordChange.success) {
        toast.success(data.requestPasswordChange.message);
        refetch();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    // Validation: Passwords must match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match. Please ensure both passwords are the same.');
      return;
    }

    // Validation: Minimum length
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    // Validation: Old password must be provided
    if (!passwordData.oldPassword || passwordData.oldPassword.trim().length === 0) {
      toast.error('Please enter your current password');
      return;
    }

    try {
      const { data } = await updatePassword({
        variables: {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        },
      });

      if (data.updatePasswordWithApproval.success) {
        // Show success modal
        setShowSuccessModal(true);
        
        // Also show toast
        toast.success(data.updatePasswordWithApproval.message);
        
        // Reset form states
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
        
        // Refetch user data
        refetch();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading settings</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const user = userData?.getCurrentUser;
  const passwordRequest = user?.passwordChangeRequest;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sales Settings</h1>
            <p className="text-indigo-100 text-lg">Manage your profile and account settings</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About Me
                </label>
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Password Management</h2>

            {/* Password Request Status */}
            {passwordRequest && passwordRequest.status !== 'none' && (
              <div className={`mb-4 p-4 rounded-lg ${
                passwordRequest.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
                passwordRequest.status === 'approved' ? 'bg-green-50 border border-green-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {passwordRequest.status === 'pending' && (
                    <>
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-yellow-800">Request Pending</span>
                    </>
                  )}
                  {passwordRequest.status === 'approved' && (
                    <>
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-800">Request Approved</span>
                    </>
                  )}
                  {passwordRequest.status === 'rejected' && (
                    <>
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-red-800">Request Rejected</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {passwordRequest.status === 'pending' && 'Your password change request is awaiting Admin approval.'}
                  {passwordRequest.status === 'approved' && 'Your request has been approved. You can now change your password below.'}
                  {passwordRequest.status === 'rejected' && 'Your password change request was rejected. Please contact your Admin.'}
                </p>
                {passwordRequest.requestedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Requested: {new Date(passwordRequest.requestedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Show password form if approved */}
            {passwordRequest?.canChangePassword && passwordRequest?.status === 'approved' ? (
              showPasswordForm ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      ⚠️ You can change your password only once with this approval.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.oldPassword ? "text" : "password"}
                        name="oldPassword"
                        value={passwordData.oldPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, oldPassword: !prev.oldPassword }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPasswords.oldPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.newPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, newPassword: !prev.newPassword }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPasswords.newPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordData.newPassword && passwordData.newPassword.length < 6 && (
                      <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPasswords.confirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={
                        updatingPassword || 
                        !passwordData.oldPassword || 
                        !passwordData.newPassword || 
                        !passwordData.confirmPassword ||
                        passwordData.newPassword !== passwordData.confirmPassword ||
                        passwordData.newPassword.length < 6
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Change Password Now
                </button>
              )
            ) : (
              <button
                onClick={handleRequestPasswordChange}
                disabled={requesting || passwordRequest?.status === 'pending'}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? 'Sending Request...' : 
                 passwordRequest?.status === 'pending' ? 'Request Already Sent' : 
                 'Send Request to Change Password'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Sales Person ID</p>
                <p className="font-mono font-semibold text-gray-900">{user?.salesPersonId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user?.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          {user?.company && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Company Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Company Name</p>
                  <p className="font-semibold text-gray-900">{user.company.name}</p>
                </div>
                {user.company.email && (
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-700">{user.company.email}</p>
                  </div>
                )}
                {user.company.phone && (
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-700">{user.company.phone}</p>
                  </div>
                )}
                {user.company.website && (
                  <div>
                    <p className="text-xs text-gray-500">Website</p>
                    <a 
                      href={user.company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      {user.company.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Info */}
          {user?.createdByAdmin && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your Admin</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-semibold text-gray-900">{user.createdByAdmin.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-700">{user.createdByAdmin.email}</p>
                </div>
                {user.createdByAdmin.phone && (
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-700">{user.createdByAdmin.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scaleIn">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Password Updated Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your password has been changed successfully.
              </p>
              
              {/* Email Confirmation Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-900">Email Confirmation Sent</p>
                    <p className="text-xs text-blue-800 mt-1">
                      A confirmation email has been sent to you and your admin.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-yellow-900">Security Reminder</p>
                    <p className="text-xs text-yellow-800 mt-1">
                      Keep your password secure and don't share it with anyone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Got it, Thanks!
            </button>
          </div>
        </div>
      )}

      {/* Profile Update Success Modal */}
      {showProfileSuccessModal && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-scaleIn">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Profile Updated Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your profile information has been updated.
              </p>
              
              {/* Updated Fields Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-indigo-900">Changes Saved</p>
                    <p className="text-xs text-indigo-800 mt-1">
                      All your profile changes have been saved to the database.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visible to Admin */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-purple-900">Admin Notification</p>
                    <p className="text-xs text-purple-800 mt-1">
                      Your admin can see your updated profile information.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowProfileSuccessModal(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Perfect, Got it!
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

