import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale,
} from 'chart.js';
import { Line, Doughnut, Bar, Radar } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Star, 
  Calendar,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  PieChart,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale
);

// API functions
const API_BASE_URL = 'http://localhost:8000';

const apiClient = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats and assessment history in parallel
        const [dashboardStats, history] = await Promise.all([
          apiClient.get('/api/dashboard-stats'),
          apiClient.get('/api/assessment-history?limit=100')
        ]);
        
        setStats(dashboardStats);
        setAssessmentHistory(history);
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate additional metrics from the data
  const calculateEnhancedMetrics = () => {
    if (!stats || !assessmentHistory) return {};

    const assessments = assessmentHistory.assessments || [];
    
    // Calculate average loan amount for approved loans
    const approvedLoans = assessments.filter((a: any) => a.loan_approved);
    const avgLoanAmount = approvedLoans.length > 0 
      ? approvedLoans.reduce((sum: number, a: any) => sum + (a.loan_amount || 0), 0) / approvedLoans.length
      : 0;

    // Calculate total loan value
    const totalLoanValue = approvedLoans.reduce((sum: number, a: any) => sum + (a.loan_amount || 0), 0);

    // Risk category performance
    const riskPerformance = Object.keys(stats.risk_distribution || {}).reduce((acc: any, risk: string) => {
      const riskAssessments = assessments.filter((a: any) => a.risk_category === risk);
      const approvedCount = riskAssessments.filter((a: any) => a.loan_approved).length;
      acc[risk] = {
        total: riskAssessments.length,
        approved: approvedCount,
        approvalRate: riskAssessments.length > 0 ? (approvedCount / riskAssessments.length) * 100 : 0
      };
      return acc;
    }, {});

    // Partner type performance
    const partnerPerformance = Object.keys(stats.partner_distribution || {}).reduce((acc: any, partnerType: string) => {
      const partnerAssessments = assessments.filter((a: any) => a.partner_type === partnerType);
      const approvedCount = partnerAssessments.filter((a: any) => a.loan_approved).length;
      const avgScore = partnerAssessments.length > 0 
        ? partnerAssessments.reduce((sum: number, a: any) => sum + (a.nova_score || 0), 0) / partnerAssessments.length
        : 0;
      
      acc[partnerType] = {
        total: partnerAssessments.length,
        approved: approvedCount,
        approvalRate: partnerAssessments.length > 0 ? (approvedCount / partnerAssessments.length) * 100 : 0,
        avgScore: avgScore
      };
      return acc;
    }, {});

    return {
      avgLoanAmount,
      totalLoanValue,
      riskPerformance,
      partnerPerformance
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-bg py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary-bg py-8 px-4 flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Dashboard</p>
          <p className="text-sm text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const enhancedMetrics = calculateEnhancedMetrics();
  const currentDayAssessments = stats?.daily_assessments?.slice(-1)[0]?.count || 0;

  const kpiCards = [
    {
      title: 'Total Assessments',
      value: stats?.total_assessments || 0,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
    },
    {
      title: 'Approval Rate',
      value: `${stats?.approval_rate || 0}%`,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/20',
    },
    {
      title: 'Average NovaScore',
      value: stats?.avg_nova_score?.toFixed(1) || 0,
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/20',
    },
    {
      title: 'Today\'s Assessments',
      value: currentDayAssessments,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
    },
    {
      title: 'Total Loan Value',
      value: `₹${((enhancedMetrics.totalLoanValue || 0) / 100000).toFixed(1)}L`,
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
    },
    {
      title: 'Avg Loan Amount',
      value: `₹${((enhancedMetrics.avgLoanAmount || 0) / 1000).toFixed(0)}K`,
      icon: Target,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/20',
    }
  ];

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
          font: { size: 12 }
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
      },
      y: {
        ticks: { color: '#9CA3AF', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#9CA3AF',
          padding: 20,
          font: { size: 12 }
        },
      },
    },
  };

  // Risk Distribution Chart (from actual data)
  const riskChartData = {
    labels: Object.keys(stats?.risk_distribution || {}),
    datasets: [
      {
        data: Object.values(stats?.risk_distribution || {}),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Excellent
          'rgba(147, 197, 114, 0.8)', // Good
          'rgba(245, 158, 11, 0.8)',  // Fair
          'rgba(239, 68, 68, 0.8)',   // Poor
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(147, 197, 114)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Partner Type Distribution Chart (from actual data)
  const partnerChartData = {
    labels: Object.keys(stats?.partner_distribution || {}).map(key => 
      key.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    ),
    datasets: [
      {
        data: Object.values(stats?.partner_distribution || {}),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(147, 51, 234)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Daily Trend Chart (from actual data)
  const trendChartData = {
    labels: stats?.daily_assessments?.map((item: any) => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [
      {
        label: 'Daily Assessments',
        data: stats?.daily_assessments?.map((item: any) => item.count) || [],
        borderColor: 'rgb(147, 197, 114)',
        backgroundColor: 'rgba(147, 197, 114, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Risk Performance Analysis (calculated from actual data)
  const riskPerformanceData = {
    labels: Object.keys(enhancedMetrics.riskPerformance || {}),
    datasets: [
      {
        label: 'Total Assessments',
        data: Object.values(enhancedMetrics.riskPerformance || {}).map((r: any) => r.total),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Approved',
        data: Object.values(enhancedMetrics.riskPerformance || {}).map((r: any) => r.approved),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  // Partner Type Performance Radar (calculated from actual data)
  const partnerRadarData = {
    labels: ['Total Assessments', 'Approval Rate', 'Avg Nova Score'],
    datasets: Object.keys(enhancedMetrics.partnerPerformance || {}).map((partnerType, index) => {
      const colors = [
        'rgba(59, 130, 246, 0.2)',
        'rgba(147, 51, 234, 0.2)',
        'rgba(34, 197, 94, 0.2)',
      ];
      const borderColors = [
        'rgb(59, 130, 246)',
        'rgb(147, 51, 234)',
        'rgb(34, 197, 94)',
      ];
      
      const performance = enhancedMetrics.partnerPerformance[partnerType];
      return {
        label: partnerType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        data: [
          performance.total / 10, // Normalize for radar chart
          performance.approvalRate,
          performance.avgScore
        ],
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 2,
      };
    }),
  };

  return (
    <div className="min-h-screen bg-primary-bg py-8 px-4 ">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400">Real-time insights into your partner assessments</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {kpiCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700 hover:border-green-400/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
                <div className="text-sm text-gray-400">{card.title}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Risk Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-green-400" />
              Risk Distribution
            </h3>
            <div className="h-80">
              <Doughnut data={riskChartData} options={doughnutOptions} />
            </div>
          </motion.div>

          {/* Partner Type Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-400" />
              Partner Type Distribution
            </h3>
            <div className="h-80">
              <Doughnut data={partnerChartData} options={doughnutOptions} />
            </div>
          </motion.div>

          {/* Daily Assessments Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-400" />
              Daily Assessments Trend
            </h3>
            <div className="h-80">
              <Line data={trendChartData} options={chartOptions} />
            </div>
          </motion.div>

          {/* Risk Performance Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
              Risk Category Performance
            </h3>
            <div className="h-80">
              <Bar data={riskPerformanceData} options={chartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Partner Performance Comparison */}
        {Object.keys(enhancedMetrics.partnerPerformance || {}).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700 mb-8"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-yellow-400" />
              Partner Type Performance Comparison
            </h3>
            <div className="h-96">
              <Radar 
                data={partnerRadarData} 
                options={{
                  ...doughnutOptions,
                  scales: {
                    r: {
                      angleLines: { color: 'rgba(75, 85, 99, 0.3)' },
                      grid: { color: 'rgba(75, 85, 99, 0.3)' },
                      pointLabels: { color: '#9CA3AF', font: { size: 12 } },
                      ticks: { color: '#9CA3AF', backdropColor: 'transparent' }
                    }
                  }
                }}
              />
            </div>
          </motion.div>
        )}

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism rounded-2xl p-6 rounded-2xl p-6 border border-gray-700"
        >
          <h3 className="text-xl font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-900/30 rounded-xl border border-green-700/30">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2 animate-pulse"></div>
              <div className="text-sm font-medium text-green-400">API Status</div>
              <div className="text-xs text-gray-400">Online</div>
            </div>
            <div className="text-center p-4 bg-blue-900/30 rounded-xl border border-blue-700/30">
              <div className="w-3 h-3 bg-blue-400 rounded-full mx-auto mb-2"></div>
              <div className="text-sm font-medium text-blue-400">Database</div>
              <div className="text-xs text-gray-400">Connected</div>
            </div>
            <div className="text-center p-4 bg-yellow-900/30 rounded-xl border border-yellow-700/30">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-2"></div>
              <div className="text-sm font-medium text-yellow-400">Last Update</div>
              <div className="text-xs text-gray-400">Just now</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;