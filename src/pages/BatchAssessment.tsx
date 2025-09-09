import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, FileText, CheckCircle, AlertCircle, BarChart } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import toast from 'react-hot-toast';

const BatchAssessment = () => {
  const { batchAssess } = useApi();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (file.type !== 'text/csv') {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    try {
      const response = await batchAssess(file);
      setResults(response);
      toast.success(`Successfully processed ${response.total_processed} assessments`);
    } catch (error) {
      toast.error('Failed to process batch assessment');
    } finally {
      setUploading(false);
    }
  }, [batchAssess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const templateData = [
      'partner_type,partner_name,monthly_earning,yearly_earning,customer_rating,active_days,working_tenure_ingrab,total_trips,vehicle_age,trip_distance,peak_hours_ratio',
      'driver,John Doe,25000,300000,4.5,25,12,150,3,8.5,0.7',
      'merchant,Pizza Palace,35000,420000,4.2,28,18,200,0,0,0.8',
      'delivery_partner,Quick Delivery,22000,264000,4.6,26,8,180,0,0,0.9',
    ];
    
    const blob = new Blob([templateData.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_assessment_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadResults = () => {
    if (!results) return;

    const csvData = [
      'assessment_id,partner_name,nova_score,risk_category,loan_approved,loan_amount',
      ...results.results.map((r: any) => 
        `${r.assessment_id},${r.partner_name},${r.nova_score},${r.risk_category},${r.loan_approved},${r.loan_amount}`
      )
    ];

    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_assessment_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-primary-bg py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Batch Assessment
          </h1>
          <p className="text-text-secondary">Upload CSV file to process multiple partner assessments</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Template Download */}
            <div className="glassmorphism rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-accent-primary" />
                CSV Template
              </h3>
              <p className="text-text-secondary mb-4">
                Download the CSV template to ensure your data is in the correct format
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Template</span>
              </button>
            </div>

            {/* File Upload */}
            <div className="glassmorphism rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-accent-primary" />
                Upload CSV File
              </h3>
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive || dragActive
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border hover:border-accent-primary/50 hover:bg-accent-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                
                <motion.div
                  animate={{
                    scale: isDragActive ? 1.05 : 1,
                  }}
                  className="space-y-4"
                >
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                    isDragActive ? 'bg-accent-primary text-primary-bg' : 'bg-accent-primary/20 text-accent-primary'
                  }`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  
                  {uploading ? (
                    <div className="space-y-2">
                      <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-accent-primary font-medium">Processing...</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop CSV file here'}
                      </p>
                      <p className="text-text-muted">or click to browse</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Results Table */}
            {results && (
              <div className="glassmorphism rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center">
                    <BarChart className="w-5 h-5 mr-2 text-accent-primary" />
                    Processing Results
                  </h3>
                  <button
                    onClick={downloadResults}
                    className="flex items-center space-x-2 px-4 py-2 bg-accent-success/20 text-accent-success rounded-lg hover:bg-accent-success/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Results</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-text-secondary font-medium">Partner</th>
                        <th className="text-left py-3 px-2 text-text-secondary font-medium">NovaScore</th>
                        <th className="text-left py-3 px-2 text-text-secondary font-medium">Risk Category</th>
                        <th className="text-left py-3 px-2 text-text-secondary font-medium">Loan Status</th>
                        <th className="text-left py-3 px-2 text-text-secondary font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((result: any, index: number) => (
                        <motion.tr
                          key={result.assessment_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-accent-primary/5"
                        >
                          <td className="py-3 px-2">{result.partner_name}</td>
                          <td className="py-3 px-2">
                            <span className="font-mono font-bold text-accent-primary">
                              {result.nova_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.risk_category === 'Excellent' ? 'bg-accent-success/20 text-accent-success' :
                              result.risk_category === 'Good' ? 'bg-accent-primary/20 text-accent-primary' :
                              result.risk_category === 'Fair' ? 'bg-accent-warning/20 text-accent-warning' :
                              'bg-accent-danger/20 text-accent-danger'
                            }`}>
                              {result.risk_category}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-1">
                              {result.loan_approved ? (
                                <CheckCircle className="w-4 h-4 text-accent-success" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-accent-danger" />
                              )}
                              <span className={result.loan_approved ? 'text-accent-success' : 'text-accent-danger'}>
                                {result.loan_approved ? 'Approved' : 'Rejected'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-mono">
                              {result.loan_amount > 0 ? `₹${result.loan_amount.toLocaleString()}` : '-'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>

          {/* Stats Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {results ? (
              <>
                {/* Processing Summary */}
                <div className="glassmorphism rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Processing Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total Processed:</span>
                      <span className="font-bold">{results.total_processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total Rows:</span>
                      <span className="font-bold">{results.total_rows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Success Rate:</span>
                      <span className="font-bold text-accent-success">
                        {((results.total_processed / results.total_rows) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="glassmorphism rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Approved:</span>
                      <span className="font-bold text-accent-success">
                        {results.results.filter((r: any) => r.loan_approved).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Rejected:</span>
                      <span className="font-bold text-accent-danger">
                        {results.results.filter((r: any) => !r.loan_approved).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Avg Score:</span>
                      <span className="font-bold text-accent-primary">
                        {(results.results.reduce((sum: number, r: any) => sum + r.nova_score, 0) / results.results.length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="glassmorphism rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Process</h3>
                <p className="text-text-secondary text-sm">
                  Upload your CSV file to begin batch assessment
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BatchAssessment;