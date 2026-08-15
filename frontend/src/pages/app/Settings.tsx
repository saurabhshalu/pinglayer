import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  KeyRound,
  ShieldAlert,
  LogOut,
  Radio,
  FileCode,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { connectionsApi } from '../../services/connections.api';
import { definitionsApi } from '../../services/definitions.api';
import { notificationsApi } from '../../services/notifications.api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useToast } from '../../context/ToastContext';

export const Settings: React.FC = () => {
  const { apiKeyPrefix, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<{
    connections: number;
    definitions: number;
    notifications: number;
  }>({
    connections: 0,
    definitions: 0,
    notifications: 0,
  });

  useEffect(() => {
    Promise.allSettled([
      connectionsApi.listConnections({ limit: 1 }),
      definitionsApi.listDefinitions({ limit: 1 }),
      notificationsApi.listNotifications({ limit: 1 }),
    ]).then(([cRes, dRes, nRes]) => {
      setStats({
        connections: cRes.status === 'fulfilled' ? cRes.value.pagination?.total || 0 : 0,
        definitions: dRes.status === 'fulfilled' ? dRes.value.pagination?.total || 0 : 0,
        notifications: nRes.status === 'fulfilled' ? nRes.value.pagination?.total || 0 : 0,
      });
    });
  }, []);

  const handleLogout = () => {
    logout();
    toast.info('Logged out', 'Session storage cleared');
    navigate('/api-login');
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Product Workspace Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Authentication credentials, active sessions, and workspace statistics.
        </p>
      </div>

      {/* API Key Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-xs font-semibold text-slate-200">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <span>Active Product API Key</span>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Key Prefix</span>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm font-semibold text-emerald-400">
              <span>{apiKeyPrefix || 'key'}••••••••••••••••••••</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-2" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-300">Need to rotate or revoke this key?</p>
              <p className="text-indigo-200/80 mt-0.5">
                Contact your PingLayer platform administrator. They can safely generate, rotate, or revoke product API keys from the Platform Admin console.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Workspace Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Total Connections</span>
            <span className="text-xl font-bold text-slate-100">{stats.connections}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Event Definitions</span>
            <span className="text-xl font-bold text-slate-100">{stats.definitions}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Sent Notifications</span>
            <span className="text-xl font-bold text-slate-100">{stats.notifications}</span>
          </div>
        </Card>
      </div>

      {/* Sign Out Card */}
      <Card className="p-6 border-rose-500/20 bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-rose-200">End Product Session</h4>
          <p className="text-xs text-rose-300/70 mt-0.5">
            Clears all authentication tokens from browser session storage.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </Card>
    </div>
  );
};
