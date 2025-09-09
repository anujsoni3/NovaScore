import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, BarChart, Upload, DollarSign, Users } from 'lucide-react';
import FloatingShapes from '../components/3D/FloatingShapes';
import ParticleBackground from '../components/ParticleBackground';

const Landing = () => {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Credit Scoring',
      description: 'Real-time ML assessment with advanced algorithms',
    },
    {
      icon: Shield,
      title: 'Fairness by Design',
      description: 'Bias-free algorithmic evaluation',
    },
    {
      icon: BarChart,
      title: 'Real-time Analytics',
      description: 'Live dashboard & comprehensive insights',
    },
    {
      icon: Upload,
      title: 'Batch Processing',
      description: 'Upload CSV for bulk assessment',
    },
    {
      icon: DollarSign,
      title: 'Instant Loan Decisions',
      description: 'Immediate eligibility results',
    },
    {
      icon: Users,
      title: 'Partner Focused',
      description: 'Designed for gig economy partners',
    },
  ];

  const stats = [
    { label: 'Total Assessments', value: '50,000+', color: 'text-accent-primary' },
    { label: 'Average NovaScore', value: '72.5', color: 'text-accent-secondary' },
    { label: 'Approval Rate', value: '68%', color: 'text-accent-success' },
    { label: 'Active Partners', value: '12,000+', color: 'text-accent-warning' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* 3D Background */}
        <div className="absolute inset-0 opacity-30">
          <FloatingShapes />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8"
          >
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-success bg-clip-text text-transparent mb-4">
              NovaScore
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Dynamic Financial Assessment Platform for Gig Economy Partners
            </p>
          </motion.div>

          {/* Glassmorphism Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="glassmorphism rounded-3xl p-8 md:p-12 max-w-4xl mx-auto mb-12"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-center"
                >
                  <div className={`text-3xl md:text-4xl font-mono font-bold ${stat.color} mb-2`}>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                    >
                      {stat.value}
                    </motion.span>
                  </div>
                  <div className="text-sm text-text-muted">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Link to="/assess">
                <motion.button
                  className="group relative bg-gradient-to-r from-accent-primary to-accent-secondary text-primary-bg px-8 py-4 rounded-2xl font-semibold text-lg shadow-neon hover:shadow-neon-strong transition-all duration-300 overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Start Assessment</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  
                  {/* Animated background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent-secondary to-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Advanced technology meets intuitive design for comprehensive financial assessment
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glassmorphism rounded-2xl p-6 hover:bg-accent-primary/10 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 bg-accent-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-primary/30 transition-colors">
                    <Icon className="w-6 h-6 text-accent-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-accent-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary group-hover:text-text-primary transition-colors">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;