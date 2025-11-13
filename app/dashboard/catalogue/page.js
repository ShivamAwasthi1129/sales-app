'use client';

import ProductForm from '../../components/ProductForm';

export default function CataloguePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Catalogue</h1>
        <p className="text-gray-600 mt-1">Manage your product catalogue</p>
      </div>
      
      <ProductForm />
    </div>
  );
}

