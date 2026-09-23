import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate, Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === 'users') {
        res = await adminApi.getUsers();
        setData(res.data?.users || []);
      } else if (activeTab === 'reports') {
        res = await adminApi.getReports();
        setData(res.data?.reports || []);
      } else if (activeTab === 'logs') {
        res = await adminApi.getAuditLogs();
        setData(res.data?.logs || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [activeTab, user]);


  const handleUserStatus = async (id, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'active' ? 'suspend' : 'restore'} this user?`)) return;
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await adminApi.updateUserStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const handleReportStatus = async (id, newStatus) => {
    try {
      await adminApi.updateReportStatus(id, newStatus, 'Status updated via admin panel');
      fetchData();
    } catch (err) {
      alert('Failed to update report status');
    }
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }


  return (
    <div className="min-h-screen bg-virexo-bg-dark text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-virexo-brand to-purple-500 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            Back to App
          </button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
          {['users', 'reports', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-virexo-brand text-white' : 'text-virexo-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-virexo-text-muted">Loading...</div>
        ) : error ? (
          <div className="text-red-400 p-4 bg-red-500/10 rounded-xl">{error}</div>
        ) : (
          <div className="bg-black/30 rounded-2xl border border-white/10 overflow-hidden">
            {activeTab === 'users' && (
              <table className="w-full text-left">
                <thead className="bg-white/5 text-virexo-text-muted text-sm border-b border-white/10">
                  <tr>
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={u.avatarUrl} alt={u.username} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-medium">{u.displayName}</p>
                          <p className="text-sm text-virexo-text-muted">@{u.username}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-gray-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.accountStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {u.accountStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.role !== 'admin' && u.id !== user.id && (
                          <button
                            onClick={() => handleUserStatus(u.id, u.accountStatus)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              u.accountStatus === 'active' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                          >
                            {u.accountStatus === 'active' ? 'Suspend' : 'Restore'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-virexo-text-muted">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'reports' && (
              <table className="w-full text-left">
                <thead className="bg-white/5 text-virexo-text-muted text-sm border-b border-white/10">
                  <tr>
                    <th className="p-4 font-medium">Reporter</th>
                    <th className="p-4 font-medium">Reason</th>
                    <th className="p-4 font-medium">Target</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">@{r.reporter?.username || 'Unknown'}</td>
                      <td className="p-4 capitalize">{r.reason}</td>
                      <td className="p-4 text-sm text-virexo-text-muted">
                        {r.reportedUser && `User: @${r.reportedUser.username}`}
                        {r.reportedMessage && `Message: ${r.reportedMessage}`}
                        {r.reportedConversation && `Conv: ${r.reportedConversation}`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          r.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          'bg-white/10 text-gray-300'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex gap-2 justify-end">
                        {r.status !== 'resolved' && (
                          <button
                            onClick={() => handleReportStatus(r.id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            Resolve
                          </button>
                        )}
                        {r.status !== 'dismissed' && (
                          <button
                            onClick={() => handleReportStatus(r.id, 'dismissed')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/20"
                          >
                            Dismiss
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-virexo-text-muted">No reports found.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'logs' && (
              <table className="w-full text-left">
                <thead className="bg-white/5 text-virexo-text-muted text-sm border-b border-white/10">
                  <tr>
                    <th className="p-4 font-medium">Admin</th>
                    <th className="p-4 font-medium">Action</th>
                    <th className="p-4 font-medium">Target</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.map((l) => (
                    <tr key={l.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-virexo-brand font-medium">@{l.admin?.username || 'Unknown'}</td>
                      <td className="p-4 font-mono text-sm">{l.action}</td>
                      <td className="p-4 text-sm text-virexo-text-muted">{l.targetType}: {l.targetId}</td>
                      <td className="p-4 text-sm text-virexo-text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-virexo-text-muted">No logs found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
