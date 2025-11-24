'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { setAuthToken } from '../../../lib/auth';
import Link from 'next/link';

const REGISTER_MUTATION = gql`
  mutation Register(
    $name: String!
    $email: String!
    $password: String!
    $role: String!
    $phone: String
    $address: String
  ) {
    register(
      name: $name
      email: $email
      password: $password
      role: $role
      phone: $phone
      address: $address
    ) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;

const packages = {
  base: {
    name: 'Base Package',
    limits: { adminTeam: 2, superAdmin: 2, clients: 50 },
  },
  professional: {
    name: 'Professional Package',
    limits: { adminTeam: 5, superAdmin: 5, clients: 200 },
  },
  enterprise: {
    name: 'Enterprise Package',
    limits: { adminTeam: 20, superAdmin: 10, clients: 1000 },
  },
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPackageId = searchParams.get('package') || 'base';
  const selectedPackage = packages[selectedPackageId] || packages.base;

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [register] = useMutation(REGISTER_MUTATION);

  // Company Information
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyWebsite: '',
  });

  // Team Members
  const [teamMembers, setTeamMembers] = useState([
    {
      name: '',
      email: '',
      password: '',
      role: 'Super Admin',
      phone: '',
      address: '',
    },
  ]);

  // Add team member
  const addTeamMember = () => {
    const currentSuperAdmin = teamMembers.filter(m => m.role === 'Super Admin').length;
    const currentAdminTeam = teamMembers.filter(m => m.role === 'AdminTeam').length;
    
    if (currentSuperAdmin >= selectedPackage.limits.superAdmin && currentAdminTeam >= selectedPackage.limits.adminTeam) {
      alert('You have reached the maximum number of team members for this package.');
      return;
    }

    setTeamMembers([
      ...teamMembers,
      {
        name: '',
        email: '',
        password: '',
        role: 'AdminTeam',
        phone: '',
        address: '',
      },
    ]);
  };

  // Remove team member
  const removeTeamMember = (index) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter((_, i) => i !== index));
    }
  };

  // Update team member
  const updateTeamMember = (index, field, value) => {
    const updated = [...teamMembers];
    updated[index][field] = value;
    setTeamMembers(updated);
  };

  // Validate step 1
  const validateStep1 = () => {
    if (!companyData.companyName.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!companyData.companyEmail.trim()) {
      setError('Company email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.companyEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  // Validate step 2
  const validateStep2 = () => {
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      if (!member.name.trim()) {
        setError(`Team member ${i + 1}: Name is required`);
        return false;
      }
      if (!member.email.trim()) {
        setError(`Team member ${i + 1}: Email is required`);
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        setError(`Team member ${i + 1}: Please enter a valid email address`);
        return false;
      }
      if (!member.password || member.password.length < 6) {
        setError(`Team member ${i + 1}: Password must be at least 6 characters`);
        return false;
      }
    }

    // Check limits
    const superAdminCount = teamMembers.filter(m => m.role === 'Super Admin').length;
    const adminTeamCount = teamMembers.filter(m => m.role === 'AdminTeam').length;

    if (superAdminCount > selectedPackage.limits.superAdmin) {
      setError(`You can only have ${selectedPackage.limits.superAdmin} Super Admin(s) in ${selectedPackage.name}`);
      return false;
    }
    if (adminTeamCount > selectedPackage.limits.adminTeam) {
      setError(`You can only have ${selectedPackage.limits.adminTeam} Admin Team member(s) in ${selectedPackage.name}`);
      return false;
    }

    return true;
  };

  // Handle next step
  const handleNext = () => {
    setError('');
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateStep2()) {
      setLoading(false);
      return;
    }

    try {
      // Register all team members
      const registrationPromises = teamMembers.map((member) =>
        register({
          variables: {
            name: member.name,
            email: member.email,
            password: member.password,
            role: member.role,
            phone: member.phone || '',
            address: member.address || '',
          },
        })
      );

      const results = await Promise.all(registrationPromises);

      // Store token from first user (Super Admin if available, otherwise first user)
      const superAdminResult = results.find(r => r.data?.register?.user?.role === 'Super Admin');
      const firstResult = superAdminResult || results[0];

      if (firstResult?.data?.register?.token) {
        setAuthToken(firstResult.data.register.token);
        router.push('/dashboard');
      } else {
        setError('Registration successful but failed to login. Please try logging in.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/signup"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Packages
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Complete Your Registration
          </h1>
          <p className="text-gray-600">
            Selected Package: <span className="font-semibold text-purple-600">{selectedPackage.name}</span>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Company Info</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Team Members</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          {error && (
            <div className="mb-6 border-red-200 bg-red-50 rounded-xl p-4 flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyData.companyName}
                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                    placeholder="Your Company Name"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={companyData.companyEmail}
                    onChange={(e) => setCompanyData({ ...companyData, companyEmail: e.target.value })}
                    placeholder="company@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Phone
                  </label>
                  <input
                    type="tel"
                    value={companyData.companyPhone}
                    onChange={(e) => setCompanyData({ ...companyData, companyPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={companyData.companyWebsite}
                    onChange={(e) => setCompanyData({ ...companyData, companyWebsite: e.target.value })}
                    placeholder="https://www.example.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Address
                </label>
                <textarea
                  value={companyData.companyAddress}
                  onChange={(e) => setCompanyData({ ...companyData, companyAddress: e.target.value })}
                  placeholder="Enter company address..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Next: Add Team Members
                  <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team Members */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Limits:</span> {selectedPackage.limits.superAdmin} Super Admin, {selectedPackage.limits.adminTeam} Admin Team
                </div>
              </div>

              {teamMembers.map((member, index) => {
                const superAdminCount = teamMembers.filter(m => m.role === 'Super Admin').length;
                const adminTeamCount = teamMembers.filter(m => m.role === 'AdminTeam').length;
                const canAddSuperAdmin = superAdminCount < selectedPackage.limits.superAdmin;
                const canAddAdminTeam = adminTeamCount < selectedPackage.limits.adminTeam;

                return (
                  <div key={index} className="border-2 border-gray-200 rounded-xl p-6 space-y-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Team Member {index + 1}
                        {index === 0 && <span className="ml-2 text-xs text-gray-500">(Primary Super Admin)</span>}
                      </h3>
                      {teamMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTeamMember(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateTeamMember(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={member.password}
                          onChange={(e) => updateTeamMember(index, 'password', e.target.value)}
                          placeholder="Minimum 6 characters"
                          minLength={6}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole === 'Super Admin' && !canAddSuperAdmin) {
                              alert(`You can only have ${selectedPackage.limits.superAdmin} Super Admin(s) in ${selectedPackage.name}`);
                              return;
                            }
                            if (newRole === 'AdminTeam' && !canAddAdminTeam) {
                              alert(`You can only have ${selectedPackage.limits.adminTeam} Admin Team member(s) in ${selectedPackage.name}`);
                              return;
                            }
                            updateTeamMember(index, 'role', newRole);
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        >
                          {index === 0 ? (
                            <option value="Super Admin">Super Admin</option>
                          ) : (
                            <>
                              <option value="Super Admin" disabled={!canAddSuperAdmin}>
                                Super Admin {!canAddSuperAdmin && '(Limit Reached)'}
                              </option>
                              <option value="AdminTeam" disabled={!canAddAdminTeam}>
                                Admin Team {!canAddAdminTeam && '(Limit Reached)'}
                              </option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={member.phone}
                          onChange={(e) => updateTeamMember(index, 'phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={member.address}
                          onChange={(e) => updateTeamMember(index, 'address', e.target.value)}
                          placeholder="Street address"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all"
                >
                  + Add Team Member
                </button>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </span>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
