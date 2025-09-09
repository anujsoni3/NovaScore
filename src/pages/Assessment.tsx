import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Store, Truck, Star, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import NovaScoreRing from '../components/3D/NovaScoreRing';
import toast from 'react-hot-toast';

interface PartnerType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const Assessment = () => {
  const { assessPartner } = useApi();
  const [selectedType, setSelectedType] = useState<string>('driver');
  const [formData, setFormData] = useState<any>({});
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const partnerTypes: PartnerType[] = [
    {
      id: 'driver',
      name: 'Driver',
      description: 'Vehicle drivers for ride-sharing',
      icon: Car,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'merchant',
      name: 'Merchant',
      description: 'Restaurant and store partners',
      icon: Store,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'delivery_partner',
      name: 'Delivery Partner',
      description: 'Food and package delivery',
      icon: Truck,
      color: 'from-green-500 to-green-600',
    },
  ];

  const commonFields = [
    { name: 'partner_name', label: 'Partner Name', type: 'text', required: true },
    { name: 'monthly_earning', label: 'Monthly Earning (₹)', type: 'number', required: true },
    { name: 'yearly_earning', label: 'Yearly Earning (₹)', type: 'number', required: true },
    { name: 'customer_rating', label: 'Customer Rating', type: 'rating', min: 1, max: 5, step: 0.1, required: true },
    { name: 'active_days', label: 'Active Days (0-31)', type: 'number', min: 0, max: 31, required: true },
    { name: 'working_tenure_ingrab', label: 'Working Tenure (months)', type: 'number', required: true },
    { name: 'complaint_rate', label: 'Complaint Rate (%)', type: 'slider', min: 0, max: 20, step: 0.1, defaultValue: 3 },
    { name: 'cancellation_rate', label: 'Cancellation Rate (%)', type: 'slider', min: 0, max: 20, step: 0.1, defaultValue: 5 },
  ];

  const specificFields = {
    driver: [
      { name: 'total_trips', label: 'Total Trips', type: 'number', required: true },
      { name: 'vehicle_age', label: 'Vehicle Age (years)', type: 'number', required: true },
      { name: 'trip_distance', label: 'Average Trip Distance (km)', type: 'number', step: 0.1, required: true },
      { name: 'peak_hours_ratio', label: 'Peak Hours Ratio', type: 'slider', min: 0, max: 1, step: 0.01, required: true },
    ],
    merchant: [
      { name: 'total_orders', label: 'Total Orders', type: 'number', required: true },
      { name: 'avg_ordervalue', label: 'Average Order Value (₹)', type: 'number', step: 0.01, required: true },
      { name: 'preparation_time', label: 'Average Preparation Time (minutes)', type: 'number', step: 0.1, required: true },
      { name: 'menu_diversity', label: 'Menu Diversity (items)', type: 'number', required: true },
      { name: 'consumer_retention_rate', label: 'Consumer Retention Rate', type: 'slider', min: 0, max: 1, step: 0.01, required: true },
    ],
    delivery_partner: [
      { name: 'total_deliveries', label: 'Total Deliveries', type: 'number', required: true },
      { name: 'avg_delivery_time', label: 'Average Delivery Time (minutes)', type: 'number', step: 0.1, required: true },
      { name: 'delivery_success_rate', label: 'Delivery Success Rate', type: 'slider', min: 0, max: 1, step: 0.01, required: true },
      { name: 'batch_delivery_ratio', label: 'Batch Delivery Ratio', type: 'slider', min: 0, max: 1, step: 0.01, required: true },
    ],
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Convert percentage fields to decimal
      const processedData = { ...formData };
      if (processedData.complaint_rate) processedData.complaint_rate = processedData.complaint_rate / 100;
      if (processedData.cancellation_rate) processedData.cancellation_rate = processedData.cancellation_rate / 100;

      const response = await assessPartner({
        partner_type: selectedType,
        partner_data: processedData,
      });

      setAssessment(response);
      toast.success('Assessment completed successfully!');
    } catch (error) {
      toast.error('Failed to complete assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.name] || field.defaultValue || '';

    if (field.type === 'rating') {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            {field.label} {field.required && <span className="text-accent-danger">*</span>}
          </label>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleInputChange(field.name, star)}
                className={`transition-colors ${
                  star <= (value || 0) ? 'text-accent-warning' : 'text-text-muted hover:text-accent-warning'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
            <span className="ml-2 text-sm text-text-secondary">({value || 0})</span>
          </div>
        </div>
      );
    }

    if (field.type === 'slider') {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            {field.label} {field.required && <span className="text-accent-danger">*</span>}
          </label>
          <div className="space-y-1">
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
              className="w-full h-2 bg-primary-secondary rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>{field.min}</span>
              <span className="text-accent-primary font-medium">{value}</span>
              <span>{field.max}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          {field.label} {field.required && <span className="text-accent-danger">*</span>}
        </label>
        <input
          type={field.type}
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => handleInputChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          className="w-full px-4 py-3 bg-primary-secondary border border-border rounded-xl focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-300"
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      </div>
    );
  };

  const isFormValid = () => {
    const requiredFields = [...commonFields, ...specificFields[selectedType as keyof typeof specificFields]].filter(field => field.required);
    return requiredFields.every(field => formData[field.name] !== undefined && formData[field.name] !== '');
  };

  return (
    <div className="min-h-screen bg-primary-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Partner Assessment
          </h1>
          <p className="text-text-secondary">Complete the form to get your NovaScore and loan eligibility</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Partner Type Selection */}
            <div className="glassmorphism rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Select Partner Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {partnerTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.id);
                        setFormData({});
                        setAssessment(null);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        selectedType === type.id
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-border hover:border-accent-primary/50'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mx-auto mb-2 ${
                        selectedType === type.id ? 'text-accent-primary' : 'text-text-secondary'
                      }`} />
                      <div className={`font-medium ${
                        selectedType === type.id ? 'text-accent-primary' : 'text-text-primary'
                      }`}>
                        {type.name}
                      </div>
                      <div className="text-xs text-text-muted mt-1">{type.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Common Fields */}
            <div className="glassmorphism rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commonFields.map((field) => (
                  <div key={field.name}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>

            {/* Specific Fields */}
            <div className="glassmorphism rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">
                {partnerTypes.find(t => t.id === selectedType)?.name} Specific
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specificFields[selectedType as keyof typeof specificFields]?.map((field) => (
                  <div key={field.name}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={!isFormValid() || loading}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                isFormValid() && !loading
                  ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-primary-bg hover:shadow-neon'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              whileHover={{ scale: isFormValid() && !loading ? 1.02 : 1 }}
              whileTap={{ scale: isFormValid() && !loading ? 0.98 : 1 }}
            >
              {loading ? 'Calculating...' : 'Calculate NovaScore'}
            </motion.button>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {assessment ? (
              <>
                {/* NovaScore Display */}
                <div className="glassmorphism rounded-2xl p-6 text-center">
                  <h3 className="text-xl font-semibold mb-6">Your NovaScore</h3>
                  <div className="flex justify-center">
                    <NovaScoreRing score={assessment.nova_score} animated />
                  </div>
                </div>

                {/* Loan Decision */}
                <div className="glassmorphism rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Loan Decision</h3>
                  <div className={`flex items-center space-x-2 mb-4 ${
                    assessment.loan_decision.approved ? 'text-accent-success' : 'text-accent-danger'
                  }`}>
                    {assessment.loan_decision.approved ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                    <span className="font-medium">
                      {assessment.loan_decision.approved ? 'Approved' : 'Not Approved'}
                    </span>
                  </div>

                  {assessment.loan_decision.approved && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Max Loan Amount:</span>
                        <span className="font-mono font-bold text-accent-primary">
                          ₹{assessment.loan_decision.max_amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Interest Rate:</span>
                        <span className="font-mono font-bold">{assessment.loan_decision.interest_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Tenure:</span>
                        <span className="font-mono font-bold">{assessment.loan_decision.tenure_months} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Monthly EMI:</span>
                        <span className="font-mono font-bold text-accent-secondary">
                          ₹{assessment.loan_decision.monthly_emi.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {!assessment.loan_decision.approved && assessment.loan_decision.reason && (
                    <div className="text-sm text-text-muted bg-accent-danger/10 p-3 rounded-lg">
                      {assessment.loan_decision.reason}
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {assessment.recommendations && assessment.recommendations.length > 0 && (
                  <div className="glassmorphism rounded-2xl p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-accent-primary" />
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {assessment.recommendations.map((rec: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-2 p-3 bg-accent-primary/5 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 bg-accent-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glassmorphism rounded-2xl p-6 text-center">
                <div className="w-24 h-24 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-12 h-12 text-accent-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready for Assessment</h3>
                <p className="text-text-secondary">
                  Fill out the form to get your NovaScore and loan eligibility results
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Assessment;