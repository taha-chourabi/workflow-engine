import React, { useEffect, useState } from 'react';
import { getStats, getUsers } from '../services/adminService';
import { getRequests } from '../services/requestService';
import { toast } from 'react-toastify';
import { FiUsers, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiTrendingUp, FiActivity, FiCalendar, FiRefreshCw, FiFilter, FiSearch, FiSettings, FiShield, FiZap, FiTarget, FiBarChart2, FiPieChart, FiUserX, FiMoreVertical, FiDownload, FiBriefcase, FiAward, FiGitBranch, FiTrendingDown, FiPercent } from 'react-icons/fi';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import '../../styles/neural-stats.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const Statistics = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    loadData();
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        loadData();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const statsData = await getStats();
      setStats(statsData);
      
      const requestsData = await getRequests();
      setRequests(requestsData);
      
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.workflowType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate additional statistics
  const calculateStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    const totalRequests = requests.length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;
    const returnedRequests = requests.filter(r => r.status === 'returned').length;
    
    const adminCount = users.filter(u => u.role === 'admin').length;
    const validatorCount = users.filter(u => u.role === 'validator').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;
    
    const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
    const avgRequestsPerUser = totalUsers > 0 ? (totalRequests / totalUsers).toFixed(2) : 0;
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      inProgressRequests,
      returnedRequests,
      adminCount,
      validatorCount,
      employeeCount,
      departments,
      avgRequestsPerUser
    };
  };

  const calculatedStats = calculateStats();

  // Chart data
  const monthlyData = () => {
    const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const requestsByMonth = new Array(12).fill(0);
    const approvalsByMonth = new Array(12).fill(0);
    
    requests.forEach((request) => {
      if (!request.createdAt) return;
      const monthIndex = new Date(request.createdAt).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        requestsByMonth[monthIndex] += 1;
        if (request.status === 'approved') {
          approvalsByMonth[monthIndex] += 1;
        }
      }
    });

    return {
      labels: monthLabels,
      datasets: [
        {
          label: 'Demandes créées',
          data: requestsByMonth,
          borderColor: 'rgb(59,130,246)',
          backgroundColor: 'rgba(59,130,246,0.2)',
          tension: 0.2,
        },
        {
          label: 'Demandes approuvées',
          data: approvalsByMonth,
          borderColor: 'rgb(16,185,129)',
          backgroundColor: 'rgba(16,185,129,0.2)',
          tension: 0.2,
        }
      ]
    };
  };

  const statusData = {
    labels: ['Approuvées', 'Rejetées', 'En attente', 'En cours', 'Retournées'],
    datasets: [{
      data: [
        calculatedStats.approvedRequests,
        calculatedStats.rejectedRequests,
        calculatedStats.pendingRequests,
        calculatedStats.inProgressRequests,
        calculatedStats.returnedRequests
      ],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)'
      ],
      borderWidth: 2,
      hoverBackgroundColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)'
      ],
      hoverBorderWidth: 3
    }]
  };

  const roleData = {
    labels: ['Admins', 'Validateurs', 'Employés'],
    datasets: [{
      data: [calculatedStats.adminCount, calculatedStats.validatorCount, calculatedStats.employeeCount],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      borderWidth: 2,
      hoverBackgroundColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      hoverBorderWidth: 3
    }]
  };

  const departmentData = () => {
    const deptCounts = {};
    users.forEach(user => {
      if (user.department) {
        deptCounts[user.department] = (deptCounts[user.department] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(deptCounts),
      datasets: [{
        data: Object.values(deptCounts),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
        hoverBorderColor: 'rgba(59, 130, 246, 1)',
        hoverBorderWidth: 3,
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  };

  const statCards = [
    { title: 'Total Utilisateurs', value: calculatedStats.totalUsers, tone: 'slate', icon: <FiUsers className="w-6 h-6" />, trend: '+12%' },
    { title: 'Utilisateurs Actifs', value: calculatedStats.activeUsers, tone: 'green', icon: <FiShield className="w-6 h-6" />, trend: '+8%' },
    { title: 'Total Demandes', value: calculatedStats.totalRequests, tone: 'blue', icon: <FiFileText className="w-6 h-6" />, trend: '+15%' },
    { title: 'Demandes Approuvées', value: calculatedStats.approvedRequests, tone: 'emerald', icon: <FiCheckCircle className="w-6 h-6" />, trend: '+5%' },
    { title: 'Demandes Rejetées', value: calculatedStats.rejectedRequests, tone: 'red', icon: <FiXCircle className="w-6 h-6" />, trend: '-2%' },
    { title: 'En Attente', value: calculatedStats.pendingRequests, tone: 'amber', icon: <FiClock className="w-6 h-6" />, trend: '+3%' },
    { title: 'En Cours', value: calculatedStats.inProgressRequests, tone: 'blue', icon: <FiActivity className="w-6 h-6" />, trend: '+7%' },
    { title: 'Retournées', value: calculatedStats.returnedRequests, tone: 'purple', icon: <FiAlertCircle className="w-6 h-6" />, trend: '+1%' },
  ];

  const performanceCards = [
    { title: 'Taux d\'Approbation', value: calculatedStats.totalRequests > 0 ? `${((calculatedStats.approvedRequests / calculatedStats.totalRequests) * 100).toFixed(1)}%` : '0%', tone: 'emerald', icon: <FiPercent className="w-6 h-6" /> },
    { title: 'Moyenne/Demande', value: calculatedStats.avgRequestsPerUser, tone: 'blue', icon: <FiBarChart2 className="w-6 h-6" /> },
    { title: 'Départements', value: calculatedStats.departments.length, tone: 'purple', icon: <FiBriefcase className="w-6 h-6" /> },
    { title: 'Admins', value: calculatedStats.adminCount, tone: 'red', icon: <FiAward className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Advanced 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
        
        {/* Dynamic mesh grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mesh" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0,255,255,0.1)" strokeWidth="0.5"/>
              <circle cx="30" cy="30" r="1" fill="rgba(0,255,255,0.3)"/>
            </pattern>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#ff00ff" stopOpacity="0.5"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mesh)" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="url(#lineGradient)" strokeWidth="0.5" opacity="0.3"/>
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="url(#lineGradient)" strokeWidth="0.5" opacity="0.3"/>
        </svg>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Futuristic Header */}
      <div className="relative z-10 border-b border-gradient-to-r from-cyan-500/50 to-purple-500/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-6">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  NEURAL STATS
                </h1>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse animation-delay-1000"></div>
              </div>
              <p className="text-white/20 text-xl font-light tracking-wide ml-12">ADVANCED SYSTEM ANALYTICS DASHBOARD</p>
              <div className="flex items-center gap-4 ml-12">
                <div className="h-px w-20 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                <span className="text-white/10 text-xs font-mono">v2.0.1</span>
                <div className="h-px w-20 bg-gradient-to-l from-purple-500 to-transparent"></div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-white/40 text-xs font-mono">SYSTEM STATUS</div>
                <div className="text-cyan-400 text-sm font-bold animate-pulse">ONLINE</div>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative px-8 py-4 border transition-all flex items-center gap-3 font-bold tracking-wider text-sm overflow-hidden group ${
                  autoRefresh 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' 
                    : 'bg-white/5 text-white/60 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <FiRefreshCw className={`w-4 h-4 relative z-10 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="relative z-10">LIVE FEED</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Holographic Main Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Central 3D Metric Display */}
          <div className="lg:col-span-2 relative group">
            {/* Holographic frame */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl transform perspective-1000 rotateY-0 group-hover:rotateY-3 transition-all duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl transform scale-95 group-hover:scale-100 transition-all duration-700"></div>
            
            <div className="relative bg-black/50 backdrop-blur-2xl rounded-3xl p-10 border border-cyan-500/30 overflow-hidden">
              {/* Scanning line effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-1000"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <h2 className="text-white/40 text-xs font-bold tracking-widest uppercase">QUANTUM METRIC</h2>
                    </div>
                    <div className="flex items-baseline gap-6">
                      <span className="text-8xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{calculatedStats.totalRequests}</span>
                      <span className="text-cyan-400 text-3xl font-bold tracking-wider">NODES</span>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="text-green-400 text-xl font-bold flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        +15.3%
                      </div>
                      <span className="text-white/20 text-sm">quantum flux vs previous cycle</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/20 text-xs font-mono mb-2">PERFORMANCE INDEX</div>
                    <div className="text-5xl font-black text-cyan-400">98.7</div>
                    <div className="text-green-400 text-xs mt-1">+2.3 pts</div>
                  </div>
                </div>
                
                {/* Advanced 3D Wave Visualization */}
                <div className="h-40 relative">
                  <div className="absolute inset-0 flex items-end justify-between gap-1">
                    {[65, 45, 80, 55, 70, 85, 60, 75, 90, 65, 80, 95, 70, 85, 60, 75, 90, 55, 70, 85].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/80 via-blue-500/60 to-purple-500/40 rounded-t-lg transition-all duration-300 group-hover:from-cyan-400 group-hover:via-blue-400 group-hover:to-purple-400"></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 group-hover:bg-white/40 transition-colors duration-300"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-400/50 group-hover:bg-cyan-400 transition-colors duration-300"></div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-white/20 text-xs font-mono">
                    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, i) => (
                      <span key={i} className="group-hover:text-white/40 transition-colors duration-300">{month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Neural Network Side Panel */}
          <div className="space-y-6">
            {/* Quantum State Cards */}
            {[
              { label: 'APPROVED', value: calculatedStats.approvedRequests, color: 'green', icon: FiCheckCircle, subtext: 'synced nodes' },
              { label: 'PENDING', value: calculatedStats.pendingRequests, color: 'amber', icon: FiClock, subtext: 'processing queue' },
              { label: 'ACTIVE USERS', value: calculatedStats.totalUsers, color: 'purple', icon: FiUsers, subtext: 'connected terminals' }
            ].map((item, index) => (
              <div key={item.label} className="group relative">
                {/* Neural frame effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-${item.color}-500/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-${item.color}-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 bg-${item.color}-400 rounded-full animate-pulse`}></div>
                      <span className="text-white/30 text-xs font-bold tracking-widest uppercase">{item.label}</span>
                    </div>
                    <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-white to-${item.color}-400 bg-clip-text text-transparent">{item.value}</div>
                  <div className={`text-${item.color}-400 text-xs mt-2 font-mono`}>{item.subtext}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holographic Chart Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Quantum Status Field */}
          <div className="group relative">
            {/* Holographic border */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-green-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            
            <div className="relative bg-black/30 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 hover:border-cyan-500/30 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">QUANTUM FIELD</h2>
                </div>
                <div className="flex items-center gap-6">
                  {[
                    { color: 'green', label: 'Approved' },
                    { color: 'amber', label: 'Pending' },
                    { color: 'red', label: 'Rejected' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 bg-${item.color}-400 rounded-full animate-pulse`}></div>
                      <span className="text-white/30 text-xs font-mono">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-80 relative">
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
                <Doughnut 
                  data={statusData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                          color: '#ffffff',
                          font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                          },
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ffff',
                        bodyColor: '#ffffff',
                        borderColor: '#00ffff',
                        borderWidth: 2,
                        titleFont: {
                          size: 14,
                          weight: 'bold',
                          family: 'Inter, sans-serif'
                        },
                        bodyFont: {
                          size: 12,
                          family: 'Inter, sans-serif'
                        },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    cutout: '60%',
                    spacing: 2,
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000,
                      easing: 'easeInOutQuart'
                    },
                    onClick: (event, activeElements) => {
                      if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const label = statusData.labels[index];
                        const value = statusData.datasets[0].data[index];
                        console.log(`Clicked on ${label}: ${value}`);
                      }
                    }
                  }}
                />
                
                {/* Center metrics */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-4xl font-black text-cyan-400">{calculatedStats.totalRequests}</div>
                    <div className="text-white/20 text-xs font-mono">TOTAL NODES</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Neural Role Matrix */}
          <div className="group relative">
            {/* Holographic border */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            
            <div className="relative bg-black/30 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 hover:border-purple-500/30 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">NEURAL MATRIX</h2>
                </div>
                <div className="flex items-center gap-6">
                  {[
                    { color: 'red', label: 'Admins' },
                    { color: 'blue', label: 'Validators' },
                    { color: 'green', label: 'Employees' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 bg-${item.color}-400 rounded-full animate-pulse`}></div>
                      <span className="text-white/30 text-xs font-mono">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-80 relative">
                <Pie 
                  data={roleData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                          color: '#ffffff',
                          font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                          },
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ff00ff',
                        bodyColor: '#ffffff',
                        borderColor: '#ff00ff',
                        borderWidth: 2,
                        titleFont: {
                          size: 14,
                          weight: 'bold',
                          family: 'Inter, sans-serif'
                        },
                        bodyFont: {
                          size: 12,
                          family: 'Inter, sans-serif'
                        },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    spacing: 2,
                    animation: {
                      animateRotate: true,
                      animateScale: true,
                      duration: 1000,
                      easing: 'easeInOutQuart'
                    },
                    onClick: (event, activeElements) => {
                      if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const label = roleData.labels[index];
                        const value = roleData.datasets[0].data[index];
                        console.log(`Clicked on ${label}: ${value}`);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Department Display */}
        <div className="relative group">
          {/* Scanning effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-1000"></div>
          
          <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 hover:border-orange-500/30 transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">DEPARTMENT GRID</h2>
              </div>
              <div className="text-right">
                <div className="text-white/20 text-xs font-mono">ACTIVE TERMINALS</div>
                <div className="text-orange-400 text-lg font-bold">{calculatedStats.departments.length}</div>
              </div>
            </div>
            
            <div className="h-80 relative">
              {/* Terminal grid overlay */}
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
              <Bar 
                data={departmentData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.95)',
                      titleColor: '#ff9900',
                      bodyColor: '#ffffff',
                      borderColor: '#ff9900',
                      borderWidth: 2,
                      titleFont: {
                        size: 14,
                        weight: 'bold',
                        family: 'Inter, sans-serif'
                      },
                      bodyFont: {
                        size: 12,
                        family: 'Inter, sans-serif'
                      },
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: false,
                      callbacks: {
                        title: function(context) {
                          return `Département: ${context[0].label}`;
                        },
                        label: function(context) {
                          return `Employés: ${context.parsed.y}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(255, 153, 0, 0.15)',
                        drawBorder: false,
                        borderDash: [5, 5]
                      },
                      ticks: {
                        color: 'rgba(255, 153, 0, 0.6)',
                        font: {
                          size: 11,
                          weight: '500',
                          family: 'Inter, sans-serif'
                        },
                        padding: 8
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: 'rgba(255, 153, 0, 0.6)',
                        font: {
                          size: 11,
                          weight: '500',
                          family: 'Inter, sans-serif'
                        },
                        padding: 8
                      }
                    }
                  },
                  animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart',
                    delay: (context) => {
                      let delay = 0;
                      if (context.type === 'data' && context.mode === 'default') {
                        delay = context.dataIndex * 100 + context.datasetIndex * 50;
                      }
                      return delay;
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  },
                  onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                      const index = activeElements[0].index;
                      const label = departmentData().labels[index];
                      const value = departmentData().datasets[0].data[index];
                      console.log(`Clicked on ${label}: ${value} employees`);
                    }
                  }
                }}
              />
            </div>
            
            {/* Terminal status bar */}
            <div className="mt-6 flex items-center justify-between text-xs font-mono text-white/20">
              <div>SYSTEM.ONLINE</div>
              <div>LAST_SYNC: {new Date().toLocaleTimeString()}</div>
              <div>STATUS: OPERATIONAL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
