import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const AdminLogin: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await loginAdmin(secret.trim());
      toast.success('Admin Authenticated', 'Welcome to PingLayer Admin Console');
      navigate('/admin/products');
    } catch (err: any) {
      const errorMsg = err?.error?.message || err?.message || 'Invalid Admin Secret. Please check your credentials.';
      setError(errorMsg);
      toast.error('Authentication Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#798777]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#BDD2B6]/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-[#798777] to-[#BDD2B6] shadow-xl shadow-[#798777]/25 mb-4">
            <Shield className="w-7 h-7 text-[#111511]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8EDE3]">
            PingLayer Platform Admin
          </h1>
          <p className="text-xs text-[#A2B29F] mt-1.5">
            Authenticate using the system admin secret key to manage tenants & products.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Admin Auth Secret"
              required
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="••••••••••••••••"
              error={error || undefined}
              helperText="Configured in backend ADMIN_AUTH_SECRET environment variable."
            />

            <Button
              type="submit"
              disabled={loading || !secret.trim()}
              size="lg"
              className="w-full mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              <span>Sign In as Admin</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <Link
              to="/api-login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#BDD2B6] transition-colors font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Are you a Product User? Sign in with API Key</span>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
