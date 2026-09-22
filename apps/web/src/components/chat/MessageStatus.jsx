import { Check, CheckCheck, Clock } from 'lucide-react';

export function MessageStatus({ status }) {
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] font-bold" title="Read" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" title="Delivered" />;
  }
  if (status === 'sending') {
    return <Clock className="w-3 h-3 text-zinc-500 animate-spin" title="Sending" />;
  }
  return <Check className="w-3.5 h-3.5 text-zinc-400" title="Sent" />;
}