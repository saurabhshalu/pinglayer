import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Link2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  Radio,
  KeyRound,
  Shield,
  Building,
  Phone,
} from 'lucide-react';
import { connectionsApi } from '../../services/connections.api';
import {
  Channel,
  Provider,
  AuthMethod,
  ConnectionStatus,
  ConnectionValidationResult,
} from '../../types';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../context/ToastContext';

export const ConnectionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form Fields
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [channel, setChannel] = useState<Channel>(Channel.WhatsApp);
  const [provider, setProvider] = useState<Provider>(Provider.Meta);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(AuthMethod.Manual);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.Active);

  // Meta Credentials
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Validation Test Modal
  const [validationResult, setValidationResult] = useState<ConnectionValidationResult | null>(null);

  // Fetch connection on edit mode
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      connectionsApi
        .getConnection(id)
        .then((res) => {
          const conn = res.data;
          setTenantId(conn.tenant_id);
          setChannel(conn.channel);
          setProvider(conn.provider);
          setAuthMethod(conn.auth_method);
          setStatus(conn.status);

          if (conn.tenant_name) {
            setTenantName(conn.tenant_name);
          } else if (conn.config && (conn.config as any).tenant_name) {
            setTenantName((conn.config as any).tenant_name);
          }

          if (conn.config) {
            if ((conn.config as any).waba_id) setWabaId((conn.config as any).waba_id);
            if ((conn.config as any).phone_number_id) setPhoneNumberId((conn.config as any).phone_number_id);
          }
        })
        .catch((err) => {
          toast.error('Failed to load connection', err?.error?.message);
          navigate('/connections');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isEdit, id, navigate, toast]);

  const handleTestConnection = async () => {
    if (!id) return;
    setTesting(true);
    try {
      const res = await connectionsApi.validateConnection(id);
      setValidationResult(res.data);
      if (res.data.valid) {
        toast.success('Connection credentials validated', 'Verified with Meta WhatsApp API');
      } else {
        toast.error('Validation failed', res.data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      toast.error('Validation request failed', err?.error?.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit && id) {
        // Update connection
        const credentialsUpdate: Record<string, string> = {};
        if (wabaId.trim()) credentialsUpdate['waba_id'] = wabaId.trim();
        if (phoneNumberId.trim()) credentialsUpdate['phone_number_id'] = phoneNumberId.trim();
        if (accessToken.trim()) credentialsUpdate['access_token'] = accessToken.trim();

        const configUpdate: Record<string, unknown> = {};
        if (wabaId.trim()) configUpdate['waba_id'] = wabaId.trim();
        if (phoneNumberId.trim()) configUpdate['phone_number_id'] = phoneNumberId.trim();
        configUpdate['tenant_name'] = tenantName.trim();

        await connectionsApi.updateConnection(id, {
          tenantName: tenantName.trim() || null,
          credentials: Object.keys(credentialsUpdate).length > 0 ? credentialsUpdate : undefined,
          config: Object.keys(configUpdate).length > 0 ? configUpdate : undefined,
          status,
        });

        toast.success('Connection updated', `Saved changes for tenant "${tenantName || tenantId}"`);
        navigate('/connections');
      } else {
        // Create connection
        if (!accessToken.trim()) {
          toast.error('Access Token is required', 'Please provide a valid WhatsApp Cloud API token');
          setSaving(false);
          return;
        }

        await connectionsApi.createConnection({
          tenantId: tenantId.trim(),
          tenantName: tenantName.trim() || null,
          channel,
          provider,
          authMethod,
          credentials: {
            waba_id: wabaId.trim(),
            phone_number_id: phoneNumberId.trim(),
            access_token: accessToken.trim(),
          },
          config: {
            waba_id: wabaId.trim(),
            phone_number_id: phoneNumberId.trim(),
            tenant_name: tenantName.trim(),
          },
        });

        toast.success('Connection created', `WhatsApp connection registered for tenant "${tenantName || tenantId}"`);
        navigate('/connections');
      }
    } catch (err: any) {
      toast.error('Failed to save connection', err?.error?.message || 'Validation error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-96 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back Link */}
      <Link
        to="/connections"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Connections</span>
      </Link>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-indigo-400" />
            <span>{isEdit ? 'Edit Tenant Connection' : 'Create Tenant Connection'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isEdit
              ? `Update channel parameters or credentials for tenant "${tenantName || tenantId}".`
              : 'Connect a tenant to WhatsApp Meta Cloud API to send notifications.'}
          </p>
        </div>

        {isEdit && (
          <Button
            variant="outline"
            size="sm"
            disabled={testing}
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 border-indigo-500/30 text-indigo-300"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Test Connection</span>
          </Button>
        )}
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          {/* General Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>General Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tenant Display Name <span className="text-slate-500 font-normal">(Friendly Name)</span>
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Jasper's Market, Acme Corp"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Human-friendly name shown across dashboards instead of raw ID.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tenant ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEdit}
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="e.g. merchant-123, customer-uuid"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Unique identifier of your SaaS tenant.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Channel <span className="text-rose-400">*</span>
                </label>
                <Select
                  disabled={isEdit}
                  value={channel}
                  onValueChange={(val) => setChannel(val as Channel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Channel.WhatsApp}>WhatsApp</SelectItem>
                    <SelectItem value={Channel.Email} disabled>Email (Coming soon)</SelectItem>
                    <SelectItem value={Channel.Sms} disabled>SMS (Coming soon)</SelectItem>
                    <SelectItem value={Channel.Push} disabled>Push (Coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Provider <span className="text-rose-400">*</span>
                </label>
                <Select
                  disabled={isEdit}
                  value={provider}
                  onValueChange={(val) => setProvider(val as Provider)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Provider.Meta}>Meta (Cloud API)</SelectItem>
                    <SelectItem value={Provider.Twilio} disabled>Twilio (Coming soon)</SelectItem>
                    <SelectItem value={Provider.SendGrid} disabled>SendGrid (Coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Auth Method <span className="text-rose-400">*</span>
                </label>
                <Select
                  disabled={isEdit}
                  value={authMethod}
                  onValueChange={(val) => setAuthMethod(val as AuthMethod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AuthMethod.Manual}>Manual Credentials</SelectItem>
                    <SelectItem value={AuthMethod.EmbeddedSignup}>Embedded Signup (Meta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Toggle on Edit */}
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Connection Status
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={ConnectionStatus.Active}
                      checked={status === ConnectionStatus.Active}
                      onChange={() => setStatus(ConnectionStatus.Active)}
                      className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-200">Active</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={ConnectionStatus.Inactive}
                      checked={status === ConnectionStatus.Inactive}
                      onChange={() => setStatus(ConnectionStatus.Inactive)}
                      className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-200">Inactive</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Meta WhatsApp Credentials Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Meta WhatsApp Cloud API Credentials</span>
              </h3>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <KeyRound className="w-3 h-3" />
                <span>AES-256 Encrypted</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  WhatsApp Business Account ID (WABA ID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required={!isEdit}
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="w-full font-mono bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required={!isEdit}
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 987654321098765"
                  className="w-full font-mono bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Access Token Input (Strict Security: Password type + toggle, placeholder on edit) */}
            <div>
              <PasswordInput
                label={isEdit ? 'Access Token (Optional - Leave blank to keep existing)' : 'Access Token'}
                required={!isEdit}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={isEdit ? '••••••••' : 'EAAGxxxxx... (System User Permanent Token)'}
                helperText="Your access token is encrypted with AES-256-GCM and stored securely. Leave blank to keep existing token."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/connections')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Save Changes' : 'Create Connection'}</span>
            </Button>
          </div>
        </Card>
      </form>

      {/* Validation Result Modal */}
      <Modal
        isOpen={validationResult !== null}
        onClose={() => setValidationResult(null)}
        title="Live Connection Validation"
        maxWidth="md"
      >
        {validationResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                validationResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {validationResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-semibold">
                  {validationResult.valid ? 'Credentials Validated' : 'Validation Failed'}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">
                  {validationResult.valid
                    ? 'Meta WhatsApp API verified the access token, phone number ID, and WABA ID.'
                    : validationResult.error || 'Meta API rejected credentials.'}
                </p>
              </div>
            </div>

            {validationResult.valid && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                {validationResult.displayName && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>Business Display Name</span>
                    </span>
                    <span className="font-semibold text-slate-100">
                      {validationResult.displayName}
                    </span>
                  </div>
                )}
                {validationResult.phoneNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phone Number</span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      {validationResult.phoneNumber}
                    </span>
                  </div>
                )}
                {validationResult.businessAccountId && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">WABA Account ID</span>
                    <span className="font-mono text-indigo-300">
                      {validationResult.businessAccountId}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setValidationResult(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
