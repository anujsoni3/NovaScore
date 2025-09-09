import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Eye, Calendar } from 'lucide-react';
import { useApi } from '../context/ApiContext';

const History = () => {
  const { getAssessmentHistory } = useApi();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getAssessmentHistory(100);
        setAssessments(data.assessments || []);
      } catch (error) {
        console.error('Failed to fetch assessment history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getAssessmentHistory]);

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || assessment.partner_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Partner Name', 'Type', 'NovaScore', 'Risk Category', 'Loan Approved', 'Amount', 'Date'];
    const csvData = [
      headers.join(','),
      ...filteredAssessments.map(assessment => [
        assessment.id,
        assessment.partner_name,
        assessment.partner_type,
        assessment.nova_score,
        assessment.risk_category,
        assessment.loan_approved ? 'Yes' : 'No',
        assessment.loan_amount || 0,
        new Date(assessment.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessment_history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Excellent': return 'text-accent-success bg-accent-success/20';
      case 'Good': return 'text-accent-primary bg-accent-primary/20';
      case 'Fair': return 'text-accent-warning bg-accent-warning/20';
      case 'Poor': return 'text-accent-danger bg-accent-danger/20';
      default: return 'text-text-muted bg-primary-secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading assessment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Assessment History
          </h1>
          <p className="text-text-secondary">View and manage all partner assessments</p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glassmorphism rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 flex gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by partner name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-primary-secondary border border-border rounded-xl focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-primary-secondary border border-border rounded-xl focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="driver">Driver</option>
                  <option value="merchant">Merchant</option>
                  <option value="delivery_partner">Delivery Partner</option>
                </select>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-3 bg-accent-primary/20 text-accent-primary rounded-xl hover:bg-accent-primary/30 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <p className="text-text-secondary">
            Showing {filteredAssessments.length} of {assessments.length} assessments
          </p>
        </motion.div>

        {/* Assessment Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glassmorphism rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-secondary/50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Partner</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Type</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">NovaScore</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Risk</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Loan</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Amount</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Date</th>
                  <th className="text-left py-4 px-6 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((assessment, index) => (
                  <motion.tr
                    key={assessment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-t border-border/50 hover:bg-accent-primary/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium">{assessment.partner_name}</div>
                        <div className="text-sm text-text-muted">{assessment.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-primary-secondary rounded-full text-xs font-medium capitalize">
                        {assessment.partner_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-accent-primary">
                        {assessment.nova_score?.toFixed(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(assessment.risk_category)}`}>
                        {assessment.risk_category || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assessment.loan_approved ? 'text-accent-success bg-accent-success/20' : 'text-accent-danger bg-accent-danger/20'
                      }`}>
                        {assessment.loan_approved ? 'Approved' : 'Rejected'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono">
                        {assessment.loan_amount > 0 ? `₹${assessment.loan_amount.toLocaleString()}` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-sm text-text-muted">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedAssessment(assessment)}
                        className="flex items-center space-x-1 text-accent-primary hover:text-accent-secondary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">View</span>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAssessments.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-accent-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No assessments found</h3>
              <p className="text-text-secondary">Try adjusting your search criteria</p>
            </div>
          )}
        </motion.div>

        {/* Assessment Detail Modal */}
        {selectedAssessment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAssessment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glassmorphism rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Assessment Details</h3>
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="w-8 h-8 bg-primary-secondary rounded-full flex items-center justify-center hover:bg-accent-primary/20 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary">Partner Name</label>
                    <div className="font-medium">{selectedAssessment.partner_name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Partner Type</label>
                    <div className="font-medium capitalize">{selectedAssessment.partner_type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">NovaScore</label>
                    <div className="font-mono font-bold text-accent-primary text-xl">
                      {selectedAssessment.nova_score?.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary">Risk Category</label>
                    <div className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedAssessment.risk_category)}`}>
                      {selectedAssessment.risk_category}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-3">Financial Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-secondary">Monthly Earning</label>
                      <div className="font-mono">₹{selectedAssessment.monthly_earning?.toLocaleString()}</div>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Yearly Earning</label>
                      <div className="font-mono">₹{selectedAssessment.yearly_earning?.toLocaleString()}</div>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Customer Rating</label>
                      <div className="flex items-center">
                        <span className="font-mono mr-1">{selectedAssessment.customer_rating}</span>
                        <span className="text-accent-warning">★</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Working Tenure</label>
                      <div>{selectedAssessment.working_tenure_ingrab} months</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-3">Loan Decision</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-secondary">Status</label>
                      <div className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                        selectedAssessment.loan_approved ? 'text-accent-success bg-accent-success/20' : 'text-accent-danger bg-accent-danger/20'
                      }`}>
                        {selectedAssessment.loan_approved ? 'Approved' : 'Rejected'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary">Loan Amount</label>
                      <div className="font-mono">
                        {selectedAssessment.loan_amount > 0 ? `₹${selectedAssessment.loan_amount.toLocaleString()}` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default History;