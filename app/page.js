'use client';

import { useState } from 'react';

// HMRC Tax Constants for 2025/26
const TAX_CONSTANTS = {
  PERSONAL_ALLOWANCE: 12570,
  BASIC_RATE_LIMIT: 37700,
  HIGHER_RATE_LIMIT: 125140,
  HIGH_INCOME_THRESHOLD: 100000,
  NI_PRIMARY_THRESHOLD: 12570,
  NI_UPPER_EARNINGS_LIMIT: 50270,
  
  // Tax rates
  BASIC_RATE: 0.20,
  HIGHER_RATE: 0.40,
  ADDITIONAL_RATE: 0.45,
  
  // National Insurance rates
  NI_MAIN_RATE: 0.08,
  NI_ADDITIONAL_RATE: 0.02
};

// Tax calculation logic
function calculateDeductions(annualSalary) {
  // Personal Allowance calculation
  let personalAllowance = TAX_CONSTANTS.PERSONAL_ALLOWANCE;
  if (annualSalary > TAX_CONSTANTS.HIGH_INCOME_THRESHOLD) {
    const reduction = Math.floor((annualSalary - TAX_CONSTANTS.HIGH_INCOME_THRESHOLD) / 2);
    personalAllowance = Math.max(TAX_CONSTANTS.PERSONAL_ALLOWANCE - reduction, 0);
  }
  
  const taxFreeIncome = Math.min(personalAllowance, annualSalary);
  const taxableIncome = Math.max(annualSalary - personalAllowance, 0);

  // Income Tax calculation
  let incomeTax = 0;
  if (taxableIncome > 0) {
    // Basic rate (20%)
    const basicBand = Math.min(taxableIncome, TAX_CONSTANTS.BASIC_RATE_LIMIT);
    incomeTax += basicBand * TAX_CONSTANTS.BASIC_RATE;
    
    // Higher rate (40%)
    if (taxableIncome > TAX_CONSTANTS.BASIC_RATE_LIMIT) {
      const higherBand = Math.min(
        taxableIncome - TAX_CONSTANTS.BASIC_RATE_LIMIT, 
        TAX_CONSTANTS.HIGHER_RATE_LIMIT - TAX_CONSTANTS.BASIC_RATE_LIMIT
      );
      incomeTax += higherBand * TAX_CONSTANTS.HIGHER_RATE;
      
      // Additional rate (45%)
      if (taxableIncome > TAX_CONSTANTS.HIGHER_RATE_LIMIT - TAX_CONSTANTS.PERSONAL_ALLOWANCE) {
        const additionalBand = taxableIncome - (TAX_CONSTANTS.HIGHER_RATE_LIMIT - TAX_CONSTANTS.PERSONAL_ALLOWANCE);
        incomeTax += additionalBand * TAX_CONSTANTS.ADDITIONAL_RATE;
      }
    }
  }

  // National Insurance calculation
  let ni = 0;
  if (annualSalary > TAX_CONSTANTS.NI_PRIMARY_THRESHOLD) {
    // Main rate (8%) between primary threshold and upper earnings limit
    const niMainBand = Math.min(
      annualSalary - TAX_CONSTANTS.NI_PRIMARY_THRESHOLD,
      TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT - TAX_CONSTANTS.NI_PRIMARY_THRESHOLD
    );
    ni += niMainBand * TAX_CONSTANTS.NI_MAIN_RATE;
    
    // Additional rate (2%) above upper earnings limit
    if (annualSalary > TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT) {
      const niAdditionalBand = annualSalary - TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT;
      ni += niAdditionalBand * TAX_CONSTANTS.NI_ADDITIONAL_RATE;
    }
  }

  const totalDeductions = incomeTax + ni;
  const takeHome = annualSalary - totalDeductions;

  return {
    grossIncome: annualSalary,
    taxFreeIncome,
    taxableIncome,
    incomeTax,
    ni,
    totalDeductions,
    takeHome
  };
}

// Currency formatting function
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export default function Home() {
  const [formData, setFormData] = useState({
    jobTitle: '',
    county: '',
    salary: '',
    period: 'yearly'
  });
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCalculating(true);
    setError('');

    // Validation
    const salary = parseFloat(formData.salary);
    if (!salary || salary <= 0) {
      setError('Please enter a valid positive salary amount');
      setIsCalculating(false);
      return;
    }

    if (!formData.jobTitle.trim() || !formData.county.trim()) {
      setError('Please fill in all fields');
      setIsCalculating(false);
      return;
    }

    try {
      // Convert salary to annual
      let annualSalary = salary;
      if (formData.period === 'monthly') {
        annualSalary = salary * 12;
      } else if (formData.period === 'weekly') {
        annualSalary = salary * 52;
      }

      // Calculate tax deductions
      const calculations = calculateDeductions(annualSalary);

      // Save to database via API route
      try {
        const response = await fetch('/api/tax-calculations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_title: formData.jobTitle,
            county: formData.county,
            salary_input: salary,
            salary_period: formData.period
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error saving to database:', errorData);
          // Continue anyway - don't block user from seeing results
        } else {
          const result = await response.json();
          console.log('Successfully saved calculation:', result.message);
        }
      } catch (fetchError) {
        console.error('Network error saving to database:', fetchError);
        // Continue anyway - don't block user from seeing results
      }

      // Set results for display
      setResults({
        yearly: calculations,
        monthly: {
          grossIncome: calculations.grossIncome / 12,
          taxFreeIncome: calculations.taxFreeIncome / 12,
          taxableIncome: calculations.taxableIncome / 12,
          incomeTax: calculations.incomeTax / 12,
          ni: calculations.ni / 12,
          totalDeductions: calculations.totalDeductions / 12,
          takeHome: calculations.takeHome / 12
        },
        weekly: {
          grossIncome: calculations.grossIncome / 52,
          taxFreeIncome: calculations.taxFreeIncome / 52,
          taxableIncome: calculations.taxableIncome / 52,
          incomeTax: calculations.incomeTax / 52,
          ni: calculations.ni / 52,
          totalDeductions: calculations.totalDeductions / 52,
          takeHome: calculations.takeHome / 52
        }
      });

    } catch (err) {
      console.error('Calculation error:', err);
      setError('An error occurred during calculation. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UK Tax Deduction Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Calculate your take-home pay after Income Tax and National Insurance deductions
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Software Engineer"
                  required
                />
              </div>

              <div>
                <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-2">
                  UK County
                </label>
                <input
                  type="text"
                  id="county"
                  name="county"
                  value={formData.county}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. London, Manchester"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Amount (£)
                </label>
                <input
                  type="number"
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Period
                </label>
                <select
                  id="period"
                  name="period"
                  value={formData.period}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="yearly">Yearly (per year)</option>
                  <option value="monthly">Monthly (per month)</option>
                  <option value="weekly">Weekly (per week)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Tax & Take-Home Pay'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Income Summary</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">Income & Deductions</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border-b">Yearly</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border-b">Monthly</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border-b">Weekly</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Gross Income</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.yearly.grossIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.monthly.grossIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.weekly.grossIncome)}</td>
                  </tr>
                  <tr className="border-b bg-green-50">
                    <td className="py-3 px-4 font-medium">Tax-Free Income (Personal Allowance)</td>
                    <td className="py-3 px-4 text-right font-mono text-green-700">{formatCurrency(results.yearly.taxFreeIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono text-green-700">{formatCurrency(results.monthly.taxFreeIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono text-green-700">{formatCurrency(results.weekly.taxFreeIncome)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Taxable Income</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.yearly.taxableIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.monthly.taxableIncome)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(results.weekly.taxableIncome)}</td>
                  </tr>
                  <tr className="border-b bg-red-50">
                    <td className="py-3 px-4 font-medium">Income Tax</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.yearly.incomeTax)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.monthly.incomeTax)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.weekly.incomeTax)}</td>
                  </tr>
                  <tr className="border-b bg-red-50">
                    <td className="py-3 px-4 font-medium">National Insurance</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.yearly.ni)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.monthly.ni)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-700">-{formatCurrency(results.weekly.ni)}</td>
                  </tr>
                  <tr className="border-b bg-red-100">
                    <td className="py-3 px-4 font-semibold">Total Deductions</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-red-800">-{formatCurrency(results.yearly.totalDeductions)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-red-800">-{formatCurrency(results.monthly.totalDeductions)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-red-800">-{formatCurrency(results.weekly.totalDeductions)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-4 px-4 font-bold text-lg">Take-Home Income</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-lg text-blue-700">{formatCurrency(results.yearly.takeHome)}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-lg text-blue-700">{formatCurrency(results.monthly.takeHome)}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-lg text-blue-700">{formatCurrency(results.weekly.takeHome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p><strong>Note:</strong> Calculations are based on HMRC rates for the 2025/26 tax year. This calculator assumes standard tax code and Category A National Insurance for employees under State Pension age, living outside Scotland.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© 2025 UK Tax Calculator. Developed by Prince Nchiba for a Stairpay Demo. Based on official HMRC rates and thresholds.</p>
        </div>
      </div>
    </div>
  );
}
