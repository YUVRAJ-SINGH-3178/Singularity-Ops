import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import StartupLoader from "./components/StartupLoader";
import Dashboard from "./pages/Dashboard";
import CreateCommitment from "./pages/CreateCommitment";
import SubmitProof from "./pages/SubmitProof";
import ProofFeed from "./pages/ProofFeed";
import Settings from "./pages/Settings";
import AdminRoleRequests from "./pages/AdminRoleRequests";

const STARTUP_VISIBLE_MS = 1300;
const STARTUP_SHATTER_MS = 520;

function App() {
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [startupPhase, setStartupPhase] = useState("visible");

  const setWalletState = (nextWallet) => {
    setWallet(nextWallet);
    if (!nextWallet) {
      setProfile(null);
      return;
    }

    const cacheKey = `profile:${String(nextWallet).toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      setProfile(null);
      return;
    }

    try {
      setProfile(JSON.parse(cached));
    } catch {
      localStorage.removeItem(cacheKey);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (!wallet || !profile) return;
    localStorage.setItem(
      `profile:${wallet.toLowerCase()}`,
      JSON.stringify(profile),
    );
  }, [wallet, profile]);

  useEffect(() => {
    if (startupPhase === "hidden") {
      return undefined;
    }

    if (startupPhase === "visible") {
      const shatterLoader = window.setTimeout(() => {
        setStartupPhase("shattering");
      }, STARTUP_VISIBLE_MS);

      return () => {
        window.clearTimeout(shatterLoader);
      };
    }

    const hideLoader = window.setTimeout(() => {
      setStartupPhase("hidden");
    }, STARTUP_SHATTER_MS);

    return () => {
      window.clearTimeout(hideLoader);
    };
  }, [startupPhase]);

  return (
    <BrowserRouter>
      {startupPhase !== "hidden" && <StartupLoader phase={startupPhase} />}
      <AppLayout
        wallet={wallet}
        setWallet={setWalletState}
        profile={profile}
        setProfile={setProfile}
      >
        <Routes>
          <Route
            path="/"
            element={<Dashboard wallet={wallet} setWallet={setWalletState} />}
          />
          <Route
            path="/create"
            element={<CreateCommitment wallet={wallet} />}
          />
          <Route path="/submit" element={<SubmitProof wallet={wallet} />} />
          <Route path="/feed" element={<ProofFeed wallet={wallet} />} />
          <Route
            path="/settings"
            element={
              <Settings
                wallet={wallet}
                setWallet={setWalletState}
                setProfile={setProfile}
              />
            }
          />
          <Route
            path="/admin/role-requests"
            element={<AdminRoleRequests wallet={wallet} profile={profile} />}
          />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
