import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { isExecutive } from "../lib/roleUtils";
import {
  checkSession,
  clearStoredAuthToken,
  establishWalletSession,
  getStoredAuthToken,
} from "../lib/authService";

const WALLET_DISCONNECTED_KEY = "walletDisconnected";
const WALLET_AUTO_CONNECT_BLOCKED_KEY = "walletAutoConnectBlocked";

export default function AppLayout({ children, wallet, setWallet, profile }) {
  const { pathname } = useLocation();
  const [notice, setNotice] = useState(null);

  const isExecutiveUser = isExecutive(profile?.role);

  const links = [
    { to: "/", label: "Workspace" },
    { to: "/create", label: "Create Task" },
    { to: "/submit", label: "Submit Work" },
    { to: "/feed", label: "Daily Votes" },
    ...(isExecutiveUser
      ? [{ to: "/admin/role-requests", label: "Role Requests" }]
      : []),
  ];

  const showNotice = (message, type = "error") => {
    setNotice({ message, type });
  };

  const restoreAuthenticatedWallet = useCallback(
    async (walletAddress) => {
      const token = getStoredAuthToken();
      if (!token) return false;

      try {
        const session = await checkSession();
        const sessionWallet = String(session?.data?.walletAddress || "")
          .toLowerCase()
          .trim();
        const normalizedWallet = String(walletAddress || "")
          .toLowerCase()
          .trim();

        if (!sessionWallet || sessionWallet !== normalizedWallet) {
          clearStoredAuthToken();
          setWallet(null);
          return false;
        }

        setWallet(walletAddress);
        return true;
      } catch {
        clearStoredAuthToken();
        setWallet(null);
        return false;
      }
    },
    [setWallet],
  );

  // Auto-reconnect wallet on page load
  useEffect(() => {
    if (!window.ethereum) return;

    const syncWalletState = async () => {
      if (
        localStorage.getItem(WALLET_DISCONNECTED_KEY) ||
        localStorage.getItem(WALLET_AUTO_CONNECT_BLOCKED_KEY)
      ) {
        return;
      }

      try {
        const [accs] = await Promise.all([
          window.ethereum.request({ method: "eth_accounts" }),
        ]);

        if (accs.length > 0) {
          await restoreAuthenticatedWallet(accs[0]);
        }
      } catch (err) {
        console.error("Wallet sync failed:", err);
      }
    };

    const handleAccountsChanged = (accounts) => {
      if (
        localStorage.getItem(WALLET_DISCONNECTED_KEY) ||
        localStorage.getItem(WALLET_AUTO_CONNECT_BLOCKED_KEY)
      ) {
        setWallet(null);
        return;
      }

      if (!accounts || accounts.length === 0) {
        clearStoredAuthToken();
        setWallet(null);
        return;
      }
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      restoreAuthenticatedWallet(accounts[0]);
    };

    const handleChainChanged = () => {
      syncWalletState();
    };

    syncWalletState();
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [restoreAuthenticatedWallet, setWallet]);

  useEffect(() => {
    const handleAppNotice = (event) => {
      const message = event?.detail?.message;
      const type = event?.detail?.type || "error";
      if (!message) return;
      setNotice({ message, type });
    };

    window.addEventListener("app:notice", handleAppNotice);
    return () => {
      window.removeEventListener("app:notice", handleAppNotice);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotice("Install MetaMask to continue.");
      return;
    }

    try {
      const accs = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const walletAddress = accs[0];
      await establishWalletSession(walletAddress);
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      localStorage.removeItem(WALLET_AUTO_CONNECT_BLOCKED_KEY);
      setWallet(walletAddress);
      setNotice(null);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      showNotice(err?.message || "Wallet connection failed. Please try again.");
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
    clearStoredAuthToken();
    setWallet(null);
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      {/* ─── NEO-BRUTALIST NAV ──────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full h-20 z-50 bg-[var(--color-yellow)] border-b-2 border-black flex items-center justify-between px-3 sm:px-6">
        {/* Left: Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src="/singularity_new_logo.png"
            alt="Singularity Ops logo"
            className="w-10 h-10 object-contain"
          />
          <span className="font-heading text-xl font-extrabold tracking-tight text-black hidden sm:block">
            SINGULARITY OPS
          </span>
        </Link>

        {/* Center: Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-[15px] font-bold transition-all border-b-2 ${
                pathname === link.to
                  ? "text-black border-black"
                  : "text-black/60 border-transparent hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Wallet CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/YUVRAJ-SINGH-3178"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rounded-md hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-push text-black"
            title="Open GitHub Profile"
            aria-label="Open GitHub Profile"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12C0.5 17.08 3.78 21.39 8.34 22.91C8.94 23.02 9.16 22.65 9.16 22.33C9.16 22.04 9.15 21.28 9.14 20.28C5.8 21.01 5.1 18.67 5.1 18.67C4.55 17.29 3.77 16.92 3.77 16.92C2.68 16.18 3.85 16.19 3.85 16.19C5.05 16.27 5.68 17.42 5.68 17.42C6.75 19.23 8.48 18.71 9.16 18.41C9.27 17.64 9.58 17.12 9.92 16.82C7.26 16.52 4.47 15.48 4.47 10.84C4.47 9.52 4.94 8.45 5.71 7.61C5.59 7.31 5.17 6.08 5.83 4.41C5.83 4.41 6.84 4.09 9.13 5.61C10.09 5.34 11.12 5.2 12.15 5.19C13.18 5.2 14.21 5.34 15.17 5.61C17.46 4.09 18.47 4.41 18.47 4.41C19.13 6.08 18.71 7.31 18.59 7.61C19.36 8.45 19.83 9.52 19.83 10.84C19.83 15.49 17.03 16.52 14.36 16.81C14.79 17.19 15.18 17.95 15.18 19.12C15.18 20.8 15.16 22.15 15.16 22.33C15.16 22.65 15.38 23.03 15.99 22.91C20.54 21.39 23.82 17.08 23.82 12C23.82 5.65 18.67 0.5 12.32 0.5H12Z" />
            </svg>
          </a>

          {wallet ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold text-sm text-black">
                <div className="w-2.5 h-2.5 bg-[#28c840] border-2 border-black rounded-full" />
                <span>
                  {wallet.slice(0, 5)}...{wallet.slice(-4)}
                </span>
              </div>
              <div className="sm:hidden flex items-center gap-2 px-2 py-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold text-[11px] text-black">
                <div className="w-2 h-2 bg-[#28c840] border border-black rounded-full" />
                <span>
                  {wallet.slice(0, 4)}...{wallet.slice(-2)}
                </span>
              </div>
              <Link
                to="/settings"
                className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rounded-md hover:bg-[var(--color-sage)] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-push font-black text-lg text-black"
                title="Settings"
              >
                ⚙
              </Link>
              <button
                onClick={disconnectWallet}
                className="w-10 h-10 border-2 border-black bg-[--color-white] flex items-center justify-center rounded-md hover:bg-[#ff5f57] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-push"
                title="Disconnect wallet"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} className="neo-btn translate-push">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="fixed top-20 left-0 w-full z-40 px-4 py-3">
          <div
            className={`mx-auto max-w-3xl border-2 border-black rounded-lg px-4 py-3 shadow-hard flex items-center justify-between ${
              notice.type === "success"
                ? "bg-[var(--color-sage)] text-black"
                : "bg-[#ff5f57] text-white"
            }`}
          >
            <p className="font-bold uppercase text-sm tracking-wide">
              {notice.message}
            </p>
            <button
              onClick={() => setNotice(null)}
              className="ml-4 w-8 h-8 border-2 border-black rounded-md bg-white text-black font-black"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* ─── MOBILE NAV (Neo-Brutalist Bottom Bar) ───────────────────── */}
      <nav
        className="fixed bottom-0 left-0 w-full h-16 bg-[var(--color-yellow)] border-t-2 border-black z-50 md:hidden flex items-center justify-around px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-2 border-2 ${
              pathname === link.to
                ? "bg-black text-[var(--color-yellow)] border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                : "text-black border-transparent"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ─── CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 w-full mx-auto pb-28 md:pb-12 bg-[var(--color-charcoal)]">
        <div key={pathname} className="anim-in">
          {children}
        </div>
      </main>
    </div>
  );
}
