'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const CREATE_SALES_PERSON = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $role: String!
    $phone: String
    $address: String
    $companyId: ID
    $salesPersonId: String
    $dateOfBirth: String
    $photo: String
    $about: String
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      role: $role
      phone: $phone
      address: $address
      companyId: $companyId
      salesPersonId: $salesPersonId
      dateOfBirth: $dateOfBirth
      photo: $photo
      about: $about
    ) {
      id
      name
      email
      salesPersonId
    }
  }
`;

const UPDATE_SALES_PERSON = gql`
  mutation UpdateUser(
    $id: ID!
    $name: String
    $email: String
    $password: String
    $phone: String
    $address: String
    $salesPersonId: String
    $dateOfBirth: String
    $photo: String
    $about: String
  ) {
    updateUser(
      id: $id
      name: $name
      email: $email
      password: $password
      phone: $phone
      address: $address
      salesPersonId: $salesPersonId
      dateOfBirth: $dateOfBirth
      photo: $photo
      about: $about
    ) {
      id
      name
      email
      salesPersonId
    }
  }
`;

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      salesPersonId
      createdAt
    }
  }
`;

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      name
      email
      role
      phone
      address
      companyId
    }
  }
`;

const GET_COMPANY = gql`
  query GetCompany($id: ID!) {
    getCompany(id: $id) {
      id
      name
      email
      phone
      address
    }
  }
`;

export default function SalesPersonForm({ salesPerson, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    password: '',
    salesPersonId: '',
    role: 'Sales Team Member', // Fixed role
    about: '',
    address: '',
    photo: '',
    status: 'Active',
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [companyName, setCompanyName] = useState('');

  const isEditing = !!salesPerson;
  
  const [createSalesPerson] = useMutation(CREATE_SALES_PERSON);
  const [updateSalesPerson] = useMutation(UPDATE_SALES_PERSON);
  const { data: salesPersonsData } = useQuery(GET_SALES_PERSONS, {
    skip: isEditing, // Only fetch when creating new sales person
    fetchPolicy: 'network-only',
  });
  const { data: currentUserData } = useQuery(GET_CURRENT_USER, {
    skip: isEditing, // Only fetch when creating new sales person
    fetchPolicy: 'cache-and-network',
  });
  const { data: companyData } = useQuery(GET_COMPANY, {
    variables: { id: currentUserData?.getCurrentUser?.companyId },
    skip: !currentUserData?.getCurrentUser?.companyId || isEditing,
    fetchPolicy: 'cache-and-network',
  });

  // Set current admin details when creating new sales person
  useEffect(() => {
    if (!isEditing && currentUserData?.getCurrentUser) {
      const admin = currentUserData.getCurrentUser;
      setCurrentAdmin(admin);
      
      // Get company name for display
      if (companyData?.getCompany) {
        const company = companyData.getCompany;
        setCompanyName(company.name);
      }
    }
  }, [isEditing, currentUserData, companyData]);

  // Generate sales person ID when creating new sales person
  useEffect(() => {
    if (!isEditing && salesPersonsData?.getSalesPersons) {
      const salesPersons = salesPersonsData.getSalesPersons;
      let nextId = 1;
      
      if (salesPersons.length > 0) {
        // Find the highest ID number
        const ids = salesPersons
          .map(sp => {
            if (sp.salesPersonId) {
              const match = sp.salesPersonId.match(/SP-(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }
            return 0;
          })
          .filter(id => id > 0);
        
        if (ids.length > 0) {
          nextId = Math.max(...ids) + 1;
        }
      }
      
      const generatedId = `SP-${String(nextId).padStart(4, '0')}`;
      setFormData(prev => ({
        ...prev,
        salesPersonId: generatedId,
      }));
    }
  }, [isEditing, salesPersonsData]);

  useEffect(() => {
    if (salesPerson) {
      const dob = salesPerson.dateOfBirth ? salesPerson.dateOfBirth.split('T')[0] : '';
      setFormData({
        name: salesPerson.name || '',
        dateOfBirth: dob,
        phone: salesPerson.phone || '',
        email: salesPerson.email || '',
        password: '', // Don't populate password for security
        salesPersonId: salesPerson.salesPersonId || '',
        role: 'Sales Team Member', // Fixed role
        about: salesPerson.about || '',
        address: salesPerson.address || '',
        photo: salesPerson.photo || '',
        status: salesPerson.status || 'Active',
      });
      if (salesPerson.photo) {
        setPhotoPreview(salesPerson.photo);
      }
      setConfirmPassword(''); // Reset confirm password when editing
    } else {
      // Reset form when creating new
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [salesPerson]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData((prev) => ({ ...prev, photo: base64String }));
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For new sales persons, password is required
      if (!isEditing && !formData.password) {
        setError('Password is required for new sales persons');
        setLoading(false);
        return;
      }

      // Validate password confirmation
      if (!isEditing && formData.password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (isEditing && formData.password && formData.password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (isEditing) {
        await updateSalesPerson({
          variables: {
            id: salesPerson.id,
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            phone: formData.phone,
            address: formData.address,
            salesPersonId: formData.salesPersonId || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            photo: formData.photo || undefined,
            about: formData.about || undefined,
          },
        });
        toast.success('Sales person updated successfully!');
      } else {
        await createSalesPerson({
          variables: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: 'Sales Person',
            phone: formData.phone,
            address: formData.address,
            companyId: currentUserData?.getCurrentUser?.companyId || undefined,
            salesPersonId: formData.salesPersonId || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            photo: formData.photo || undefined,
            about: formData.about || undefined,
          },
        });
        toast.success('Sales person created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'Failed to save sales person');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Sales Person' : 'Add New Sales Person'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Admin Details Section - Only show when creating new sales person */}
          {!isEditing && currentAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Assignee Admin Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Name:</span>
                  <span className="ml-2 text-blue-900">{currentAdmin.name}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Email:</span>
                  <span className="ml-2 text-blue-900">{currentAdmin.email}</span>
                </div>
                {currentAdmin.phone && (
                  <div>
                    <span className="text-blue-700 font-medium">Phone:</span>
                    <span className="ml-2 text-blue-900">{currentAdmin.phone}</span>
                  </div>
                )}
                {companyName && (
                  <div>
                    <span className="text-blue-700 font-medium">Company:</span>
                    <span className="ml-2 text-blue-900">{companyName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                international
                defaultCountry="US"
                value={formData.phone}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                className="phone-input-wrapper"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {!isEditing && <span className="text-red-500">*</span>}
                {isEditing && <span className="text-gray-500 text-xs">(Leave blank to keep current password)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEditing}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
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

            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
            )}

            {isEditing && formData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!!formData.password}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Person ID <span className="text-gray-500 text-xs">(Auto-generated)</span>
              </label>
              <input
                type="text"
                name="salesPersonId"
                value={formData.salesPersonId || (isEditing ? salesPerson?.salesPersonId || '' : 'Generating...')}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono uppercase cursor-not-allowed"
                placeholder="SP-0001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <input
                type="text"
                name="role"
                value="Sales Team Member"
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Optional: Enter address"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About
              </label>
              <textarea
                name="about"
                value={formData.about}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Optional: Brief description about the sales person"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional: Max 5MB</p>
                </div>
                {photoPreview && (
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

