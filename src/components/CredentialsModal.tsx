import React, { useState } from 'react';
import { KeyRound, Server, User, X, Check } from 'lucide-react';
import { UserCredentials, saveCredentials } from '../api/strategyApi';
import { ENV } from '../config';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: UserCredentials;
  onSave: (creds: UserCredentials) => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSave,
}) => {
  const [token, setToken] = useState(credentials.token);
  const [userId, setUserId] = useState(credentials.userId);
  const [clientId, setClientId] = useState(credentials.clientId);
  const [apiUrl, setApiUrl] = useState(credentials.apiUrl || '');
  const [marketWsUrl, setMarketWsUrl] = useState(credentials.marketWsUrl || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserCredentials = {
      token: token.trim(),
      userId: userId.trim() || ENV.DEFAULT_USER_ID,
      clientId: clientId.trim() || ENV.DEFAULT_CLIENT_ID,
      apiUrl: apiUrl.trim(),
      marketWsUrl: marketWsUrl.trim(),
    };
    saveCredentials(updated);
    onSave(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#232a35] bg-slate-50 dark:bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Symphony Credentials</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Symphony Session Token <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="v2.local.tSnT0cPTDMlSC7HrBVNTMGwQ2n5hgCYDw6j..."
              className="w-full text-xs font-mono bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Raw or Bearer session token from Symphony XTS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={`Default: ${ENV.DEFAULT_USER_ID}`}
                className="w-full text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={`Default: ${ENV.DEFAULT_CLIENT_ID}`}
                className="w-full text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Server className="w-3 h-3 text-slate-400" /> API Base URL (Optional)
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={`Leave empty for proxy or ${ENV.SYMPHONY_API_URL}`}
                className="w-full text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Server className="w-3 h-3 text-slate-400" /> Market Data WS URL (Optional)
              </label>
              <input
                type="text"
                value={marketWsUrl}
                onChange={(e) => setMarketWsUrl(e.target.value)}
                placeholder="Leave empty for auto-derive / proxy"
                className="w-full text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#232a35]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d1117] dark:hover:bg-[#1c222b] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] transition-all shadow-2xs active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500/50 transition-all active:scale-95"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saved ? 'Saved!' : 'Save & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
