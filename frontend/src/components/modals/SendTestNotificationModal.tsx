import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { connectionsApi } from '../../services/connections.api';
import { definitionsApi } from '../../services/definitions.api';
import {
  notificationsApi,
  SendNotificationResult,
} from '../../services/notifications.api';
import {
  Connection,
  NotificationDefinition,
  Channel,
  NotificationStatus,
} from '../../types';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../context/ToastContext';

interface SendTestNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendTestNotificationModal: React.FC<SendTestNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [definitions, setDefinitions] = useState<NotificationDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Form State
  const [tenantId, setTenantId] = useState('');
  const [event, setEvent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState<Channel>(Channel.WhatsApp);
  const [dataPayload, setDataPayload] = useState(
    JSON.stringify(
      {
        customerName: 'Alex Smith',
        orderId: 'ORD-98231',
        trackingNumber: 'TRK-10928374',
      },
      null,
      2
    )
  );

  // Result state
  const [result, setResult] = useState<SendNotificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setResult(null);
      setError(null);
      Promise.all([
        connectionsApi.listConnections({ limit: 100 }),
        definitionsApi.listDefinitions({ limit: 100 }),
      ])
        .then(([connRes, defRes]) => {
          const conns = connRes.data || [];
          const defs = defRes.data || [];
          setConnections(conns);
          setDefinitions(defs);

          if (conns.length > 0 && !tenantId) {
            setTenantId(conns[0].tenant_id);
          }
          if (defs.length > 0 && !event) {
            setEvent(defs[0].key);
          }
        })
        .catch((err) => {
          toast.error('Failed to load connection data', err?.error?.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, toast]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    let parsedData = {};
    try {
      if (dataPayload.trim()) {
        parsedData = JSON.parse(dataPayload);
      }
    } catch (parseErr) {
      setError('Invalid JSON in data payload. Please check formatting.');
      setSending(false);
      return;
    }

    try {
      const res = await notificationsApi.sendNotification({
        tenantId: tenantId.trim(),
        event: event.trim().toUpperCase(),
        channel,
        recipient: { phone: recipient.trim() },
        data: parsedData,
      });

      setResult(res.data);
      toast.success('Test notification dispatched', `Status: ${res.data.status}`);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to dispatch test notification');
      toast.error('Dispatch failed', err?.error?.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Send Test Notification</span>
        </div>
      }
      description="Simulate a live notification dispatch to test template variable replacement and WhatsApp delivery."
      maxWidth="xl"
    >
      {loading ? (
        <div className="py-8 flex justify-center items-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Tenant ID */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Target Tenant ID <span className="text-rose-400">*</span>
              </label>
              <Select
                value={tenantId}
                onValueChange={(val) => setTenantId(val)}
              >
                <SelectTrigger className="w-full text-indigo-300">
                  <SelectValue placeholder={connections.length === 0 ? "No connections found" : "Select tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => {
                    const friendlyName = (c.config as any)?.tenant_name;
                    return (
                      <SelectItem
                        key={c.id}
                        value={c.tenant_id}
                        label={friendlyName || c.tenant_id}
                        badge={`${c.channel} (${c.provider})`}
                        sublabel={friendlyName ? c.tenant_id : undefined}
                      />
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Event Key */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Event Key <span className="text-rose-400">*</span>
              </label>
              <Select
                value={event}
                onValueChange={(val) => setEvent(val)}
              >
                <SelectTrigger className="w-full font-mono text-indigo-300">
                  <SelectValue placeholder={definitions.length === 0 ? "No definitions found" : "Select event"} />
                </SelectTrigger>
                <SelectContent>
                  {definitions.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.key}
                      label={d.key}
                      sublabel={d.name || undefined}
                    />
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Channel */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Channel <span className="text-rose-400">*</span>
              </label>
              <Select
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
                </SelectContent>
              </Select>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Recipient (E.164 Phone) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="+14155552671"
                className="w-full font-mono bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* JSON Data Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Data Payload (JSON)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">Dynamic Variables</span>
            </div>
            <textarea
              rows={4}
              value={dataPayload}
              onChange={(e) => setDataPayload(e.target.value)}
              className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-lg p-3 text-emerald-300 focus:border-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Result Display */}
          {result && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Notification Dispatched!</span>
                </span>
                <StatusBadge status={result.status as NotificationStatus} type="notification" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Notification ID:</span>
                  <span className="text-indigo-300">{result.notificationId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Provider Message ID:</span>
                  <span className="text-emerald-400 truncate block">
                    {result.providerMessageId || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={sending || connections.length === 0 || definitions.length === 0}
              className="flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Dispatch Notification</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
