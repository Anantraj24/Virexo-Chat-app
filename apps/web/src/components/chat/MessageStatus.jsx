import { Check, CheckCheck } from 'lucide-react';

export function MessageStatus({ status }) {
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-sky-400" title="Read" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" title="Delivered" />;
  }
  if (status === 'sending') {
    return <Check className="w-3.5 h-3.5 text-zinc-600" title="Sending" />;
  }
  return <Check className="w-3.5 h-3.5 text-zinc-500" title="Sent" />;
}