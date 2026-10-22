"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Settings,
  HeartHandshake,
} from "lucide-react";
import {
  flushOfflineQueues,
  getPendingResponses,
  getPendingContacts,
} from "@/lib/offline/sync-queue";

interface MosaproHeaderProps {
  showAdminLink?: boolean;
}

export function MosaproHeader({ showAdminLink = true }: MosaproHeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null);

  const refreshQueueCount = async () => {
    const [r, c] = await Promise.all([
      getPendingResponses(),
      getPendingContacts(),
    ]);
    setPendingCount(r.length + c.length);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await flushOfflineQueues();
      await refreshQueueCount();
      if (res.syncedResponses + res.syncedContacts > 0) {
        setLastSyncNotice(
          `Se sincronizaron ${res.syncedResponses + res.syncedContacts} envíos pendientes.`
        );
        setTimeout(() => setLastSyncNotice(null), 5000);
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    refreshQueueCount();

    const onOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const onOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };
    const onQueueUpdated = () => {
      refreshQueueCount();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("mosapro-queue-updated", onQueueUpdated);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("mosapro-queue-updated", onQueueUpdated);
    };
  }, []);

  return (
    <header className="w-full shadow-md bg-white sticky top-0 z-40">
      {/* Top Institutional Bar (matches mosapro.com.ar .header-social-bar) */}
      <div className="bg-[#567c7f] text-white text-xs py-1.5 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium tracking-wide">
            MOVIMIENTO SANITARIO PROVINCIAL · PROVINCIA DE BUENOS AIRES
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? "bg-emerald-900/40 text-emerald-100 border border-emerald-300/30"
                  : "bg-amber-900/60 text-amber-100 border border-amber-300/40"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Modo Offline activo</span>
                </>
              )}
            </span>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={!isOnline || syncing}
                className="inline-flex items-center gap-1.5 bg-[#b99e93] hover:bg-[#a6897d] disabled:opacity-60 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold transition cursor-pointer"
                title="Sincronizar respuestas guardadas en el dispositivo"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                <span>
                  {pendingCount} pendiente{pendingCount > 1 ? "s" : ""} de subir
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-lg bg-[#567c7f] flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-[#4f7478] transition">
            MP
          </div>
          <div>
            <div className="text-lg md:text-xl font-extrabold text-[#567c7f] tracking-tight leading-tight">
              MOSAPRO
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Relevamiento Sanitario Territorial
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/contacto"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#567c7f] hover:text-[#3f5f61] px-3 py-2 rounded-lg hover:bg-[#f3f6f7] transition"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Sumate a una Mesa</span>
          </Link>
          {showAdminLink && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#567c7f] px-3 py-2 rounded-lg border border-slate-200 hover:border-[#567c7f] transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Administración</span>
            </Link>
          )}
        </nav>
      </div>

      {lastSyncNotice && (
        <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-2 text-xs text-emerald-900 flex items-center justify-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lastSyncNotice}</span>
        </div>
      )}
    </header>
  );
}
