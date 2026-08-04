import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportApi } from '../../api/reportApi';

export const ReportModal = ({ isOpen, onClose, targetType, targetId, targetName }) => {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      reason,
      description,
    };

    if (targetType === 'user') payload.reportedUserId = targetId;
    if (targetType === 'message') payload.reportedMessageId = targetId;
    if (targetType === 'conversation') payload.reportedConversationId = targetId;

    try {
      await reportApi.createReport(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-virexo-bg-dark border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-virexo-text-muted hover:text-white transition-colors"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-white mb-2">Report {targetType}</h2>
          <p className="text-sm text-virexo-text-muted mb-6">
            You are reporting {targetName ? <span className="font-semibold text-white">{targetName}</span> : 'this item'}.
          </p>

          {success ? (
            <div className="text-center py-8">
              <div className="text-virexo-brand text-4xl mb-4">✓</div>
              <p className="text-white font-medium">Report submitted</p>
              <p className="text-virexo-text-muted text-sm mt-2">Thank you for keeping Virexo safe.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-virexo-text-muted mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-virexo-brand transition-colors"
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-virexo-text-muted mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-virexo-brand transition-colors resize-none"
                  placeholder="Provide additional details..."
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
