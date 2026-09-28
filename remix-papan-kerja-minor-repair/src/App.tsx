/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Divisional Application Root - PT Aetra Air Tangerang
 */

import { useEffect, useRef, useState } from "react";
import { initMinorRepairApp } from "./minorRepairApp";
import { initMobileOfficerApp } from "./mobileApp";
import { renderPortalLogin } from "./auth/portalLogin";
import { createDivisionHeader } from "./components/divisionHeader";
import { renderCustomerServiceDashboard } from "./dashboards/customerServiceDashboard";
import { renderSalesSupportDashboard } from "./dashboards/salesSupportDashboard";
import { renderKeyAccountDashboard } from "./dashboards/keyAccountDashboard";
import { renderTechnicalSupportDashboard } from "./dashboards/technicalSupportDashboard";
import {
  getActiveDivisionSession,
  setActiveDivisionSession,
  clearActiveDivisionSession,
} from "./services/divisionTicketService";
import { DivisionId, DivisionUserSession, DIVISIONS } from "./types/division";
import { DIVISION_ACCOUNTS } from "./auth/divisionAuthService";
import { initWorkOrderToastListener } from "./components/workOrderNotificationToast";
import { createWorkOrderNotificationBanner } from "./components/workOrderNotificationBanner";

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.location.pathname.includes("mobile") ||
      window.location.pathname.includes("petugas") ||
      window.location.search.includes("mode=mobile") ||
      window.location.search.includes("mode=phone") ||
      window.location.hash === "#mobile" ||
      window.location.hash === "#handphone"
    );
  });

  const [session, setSession] = useState<DivisionUserSession | null>(() => {
    return getActiveDivisionSession();
  });

  // Listen to route changes
  useEffect(() => {
    const checkRoute = () => {
      const mobileActive =
        window.location.pathname.includes("mobile") ||
        window.location.pathname.includes("petugas") ||
        window.location.search.includes("mode=mobile") ||
        window.location.search.includes("mode=phone") ||
        window.location.hash === "#mobile" ||
        window.location.hash === "#handphone";
      setIsMobile(mobileActive);
    };

    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);
    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
    };
  }, []);

  // Main UI Lifecycle
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    container.innerHTML = "";

    // 1. Mobile Officer View
    if (isMobile) {
      container.className = "";
      const cleanup = initMobileOfficerApp(container);
      return () => {
        cleanup();
      };
    }

    // 2. Multi-Division Portal Login Screen (if not logged in)
    if (!session) {
      container.className = "portal-mode";
      const loginView = renderPortalLogin({
        onLoginSuccess: (newSession) => {
          setActiveDivisionSession(newSession);
          setSession(newSession);
        },
      });
      container.appendChild(loginView);
      return () => {
        container.innerHTML = "";
      };
    }

    // 3. Authenticated Multi-Division Dashboard
    container.className = "division-mode";

    let cleanupDashboard: (() => void) | null = null;

    // Initialize floating toast notification system
    const cleanupToast = initWorkOrderToastListener();

    const switchDivision = (
      targetDivision: DivisionId,
      authorizedSession?: DivisionUserSession
    ) => {
      if (authorizedSession) {
        setActiveDivisionSession(authorizedSession);
        setSession(authorizedSession);
      } else {
        const acc = DIVISION_ACCOUNTS[targetDivision];
        const updatedSession: DivisionUserSession = {
          divisionId: targetDivision,
          name: acc ? acc.officerName : DIVISIONS[targetDivision].defaultAdminName,
          email: acc ? acc.email : DIVISIONS[targetDivision].defaultAdminEmail,
          role: "admin",
          loginAt: new Date().toISOString(),
          username: acc ? acc.displayUsername : undefined,
        };
        setActiveDivisionSession(updatedSession);
        setSession(updatedSession);
      }
    };

    const header = createDivisionHeader({
      currentDivision: session.divisionId,
      session,
      onSwitchDivision: switchDivision,
      onLogout: () => {
        clearActiveDivisionSession();
        setSession(null);
      },
      onRefresh: () => {
        // Trigger re-mount
        setSession({ ...session });
      },
    });

    container.appendChild(header);

    // Mount real-time alert banner right below header
    const banner = createWorkOrderNotificationBanner({
      currentDivision: session.divisionId,
      onSwitchDivision: (target) => switchDivision(target),
    });
    container.appendChild(banner.element);

    const mainContentEl = document.createElement("main");
    mainContentEl.className = "division-main-content";
    mainContentEl.style.cssText = "flex: 1; display: flex; flex-direction: column; width: 100%; box-sizing: border-box;";
    container.appendChild(mainContentEl);

    // Global listener for division switch requests (from toast or banner)
    const handleDivisionSwitchRequest = (e: any) => {
      if (e.detail?.divisionId) {
        switchDivision(e.detail.divisionId);
      }
    };
    window.addEventListener("aetra:switch_division_requested", handleDivisionSwitchRequest);

    // Mount specific division dashboard
    if (session.divisionId === "customer_service") {
      cleanupDashboard = renderCustomerServiceDashboard(mainContentEl);
    } else if (session.divisionId === "minor_repair") {
      cleanupDashboard = initMinorRepairApp(mainContentEl);
    } else if (session.divisionId === "sales_support") {
      cleanupDashboard = renderSalesSupportDashboard(mainContentEl);
    } else if (session.divisionId === "key_account") {
      cleanupDashboard = renderKeyAccountDashboard(mainContentEl);
    } else if (session.divisionId === "technical_support") {
      cleanupDashboard = renderTechnicalSupportDashboard(mainContentEl);
    }

    return () => {
      window.removeEventListener("aetra:switch_division_requested", handleDivisionSwitchRequest);
      cleanupToast();
      banner.cleanup();
      if (cleanupDashboard) {
        cleanupDashboard();
      }
      container.innerHTML = "";
    };
  }, [isMobile, session]);

  return <div id="app-root" ref={rootRef} />;
}
