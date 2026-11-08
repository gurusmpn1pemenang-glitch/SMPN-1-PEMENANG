import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncMessage: string | null;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOnline,
  pendingCount,
  onSync,
  isSyncing,
  lastSyncMessage,
}) => {
  if (isOnline && pendingCount === 0 && !lastSyncMessage) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3">
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-800 shrink-0">
              <WifiOff className="w-4 h-4" />
            </span>
            <div className="text-xs">
              <span className="font-bold block">Mode Akses Offline Aktif</span>
              <span className="text-amber-800 text-[11px]">
                Koneksi internet tidak terdeteksi. Seluruh presensi dan jurnal tetap disimpan aman di penyimpanan lokal perangkat.
              </span>
            </div>
          </div>

          {pendingCount > 0 && (
            <span className="text-xs font-bold bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full shrink-0">
              {pendingCount} data tersimpan di antrean
            </span>
          )}
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 shrink-0">
              <Database className="w-4 h-4" />
            </span>
            <div className="text-xs">
              <span className="font-bold block">
                Koneksi Pulih: Ada {pendingCount} data presensi offline yang siap disinkronkan
              </span>
              <span className="text-teal-700 text-[11px]">
                Klik tombol sinkronisasi untuk mengirimkan rekaman presensi ke database Firebase Cloud Firestore.
              </span>
            </div>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      )}

      {lastSyncMessage && (
        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {lastSyncMessage}
          </span>
        </div>
      )}
    </div>
  );
};
