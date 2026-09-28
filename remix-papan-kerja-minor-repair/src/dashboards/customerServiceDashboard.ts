/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Service Dashboard - Gerbang Awal Penerimaan & Distribusi Komplain
 */

import { DivisionId, DIVISIONS, getRecommendedDivision } from "../types/division";
import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
  distributeTicketFromCS,
  generateCaseId,
} from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { createTicketCommentFeed } from "../components/ticketCommentFeed";
import { isViewItemVisible } from "../services/dashboardVisibilityService";
import { createExecutiveAnalyticsView } from "../components/csExecutiveAnalyticsView";
import { mountThirtyDayMovingAverageCard } from "../components/ThirtyDayMovingAverageCard";

export function renderCustomerServiceDashboard(container: HTMLElement): () => void {
  let tickets: UnifiedTicket[] = loadAllUnifiedTickets();
  let filterDivision: "all" | DivisionId | "unassigned" | "selesai" = "all";
  let searchQuery = "";
  let formOpen = false;
  let activeCsTab: "analytics" | "moving_avg" | "operational" =
    (localStorage.getItem("aetra_cs_active_view") as any) || "analytics";

  // New ticket state
  let newCustomer = "";
  let newPhone = "";
  let newMeterId = "";
  let newAddress = "";
  let newArea = "Cikupa";
  let newCategory = "KBSM";
  let newDesc = "";
  let newUrgent = false;
  let newChannel: UnifiedTicket["intakeChannel"] = "WhatsApp CS";
  let newTargetDivision: DivisionId = "minor_repair";
  let newDistributionNotes = "";

  const AREAS = ["Cikupa", "Panongan", "Pasar Kemis", "Balaraja", "Curug", "Tigaraksa", "Rajeg"];

  const CATEGORY_CHOICES = [
    { key: "KBSM", label: "Bocor Sebelum Meter (Persil)", defaultDiv: "minor_repair" },
    { key: "KP", label: "Pipa Persil Bocor", defaultDiv: "minor_repair" },
    { key: "KKMR", label: "Kran Meter Rusak / Patah", defaultDiv: "minor_repair" },
    { key: "KPMR", label: "Meter Rusak / Mati Total", defaultDiv: "minor_repair" },
    { key: "KRPT", label: "Rekening Pembayaran Tinggi (Tagihan Melonjak)", defaultDiv: "sales_support" },
    { key: "KPKT", label: "Penyambungan Kembali Akibat Tunggakan", defaultDiv: "sales_support" },
    { key: "KPCT", label: "Pengajuan Cicilan Tagihan Rekening", defaultDiv: "sales_support" },
    { key: "KPGP", label: "Permohonan Balik Nama Pelanggan", defaultDiv: "sales_support" },
    { key: "BPPD", label: "Biaya Penambahan Pipa Dinas", defaultDiv: "sales_support" },
    { key: "KATMIND", label: "Air Tidak Mengalir Industri / Pabrik", defaultDiv: "key_account" },
    { key: "KATRIND", label: "Air Kotor / Keruh Industri", defaultDiv: "key_account" },
    { key: "KBSMIND", label: "Bocor Pipa Kawasan Industri (> 2 inch)", defaultDiv: "key_account" },
    { key: "KATR", label: "Air Keruh / Berbau Kawasan Domestik", defaultDiv: "technical_support" },
    { key: "TERAREQ", label: "Permohonan Uji Tera Akurasi Meter", defaultDiv: "technical_support" },
    { key: "KILL", label: "Dugaan Pemakaian Air Ilegal (Pencurian)", defaultDiv: "technical_support" },
    { key: "KTR", label: "Tekanan Air Rendah / Aliran Kecil", defaultDiv: "technical_support" },
  ];

  function refreshData() {
    tickets = loadAllUnifiedTickets();
    render();
  }

  function handleCategoryChange(catKey: string) {
    newCategory = catKey;
    newTargetDivision = getRecommendedDivision(catKey);
    render();
  }

  function submitNewComplaint() {
    if (!newCustomer.trim() || !newAddress.trim()) {
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "warning",
          title: "Lengkapi Data",
          text: "Nama pelanggan dan alamat kejadian wajib diisi.",
        });
      }
      return;
    }

    const newId = `WO-${Date.now().toString().slice(-6)}`;
    const newTicket: UnifiedTicket = {
      id: newId,
      caseId: generateCaseId(newId),
      customer: newCustomer.trim(),
      phone: newPhone.trim() || "081234567890",
      meterId: newMeterId.trim() || `MTR-${Math.floor(10000 + Math.random() * 90000)}`,
      address: newAddress.trim(),
      area: newArea,
      category: newCategory,
      desc: newDesc.trim() || "Keluhan awal diterima oleh Customer Service.",
      status: "baru",
      urgent: newUrgent,
      coords: "-6.2235, 106.5184",
      receivedAt: new Date().toISOString(),
      intakeChannel: newChannel,
      targetDivision: newTargetDivision,
      distributionStatus: "distributed",
      distributedAt: new Date().toISOString(),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: newDistributionNotes.trim() || `Komplain diteruskan ke ${DIVISIONS[newTargetDivision].name} untuk segera ditindaklanjuti.`,
    };

    saveSingleTicket(newTicket);
    tickets.unshift(newTicket);
    formOpen = false;

    // Reset fields
    newCustomer = "";
    newPhone = "";
    newMeterId = "";
    newAddress = "";
    newDesc = "";
    newUrgent = false;
    newDistributionNotes = "";

    // @ts-ignore
    if (window.Swal) {
      // @ts-ignore
      window.Swal.fire({
        icon: "success",
        title: "Komplain Berhasil Diterima & Didistribusikan! 🚀",
        html: `
          <div style="font-size:13px; line-height:1.5; color:#334155;">
            Tiket <b>${newTicket.id}</b> telah dicatat oleh Customer Service dan langsung diteruskan ke:<br/>
            <b style="color:${DIVISIONS[newTargetDivision].badgeColor}; font-size:14px;">${DIVISIONS[newTargetDivision].name}</b>
          </div>
        `,
        confirmButtonColor: "#0284C7",
      });
    }

    render();
  }

  function openRedistributeModal(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    let selectedDiv = ticket.targetDivision;
    let customNotes = ticket.distributionNotes || "";

    // @ts-ignore
    window.Swal.fire({
      title: `⚡ Alihkan / Distribusikan Tiket ${ticket.id}`,
      html: `
        <div style="text-align:left; font-size:12px; color:#334155; display:flex; flex-direction:column; gap:10px;">
          <div><b>Pelanggan:</b> ${ticket.customer} (${ticket.area})</div>
          <div><b>Kategori:</b> [${ticket.category}] ${ticket.desc || ""}</div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Pilih Divisi Tujuan Baru:</label>
            <select id="swal-select-div" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; font-weight:700; font-size:12px;">
              <option value="minor_repair" ${selectedDiv === "minor_repair" ? "selected" : ""}>🛠️ Divisi Minor Repair</option>
              <option value="sales_support" ${selectedDiv === "sales_support" ? "selected" : ""}>💼 Operasional Sales Support</option>
              <option value="key_account" ${selectedDiv === "key_account" ? "selected" : ""}>🏢 Technical Key Account</option>
              <option value="technical_support" ${selectedDiv === "technical_support" ? "selected" : ""}>🔬 Technical Support & Lab</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Catatan Arahan CS:</label>
            <textarea id="swal-input-notes" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; min-height:50px; font-size:12px;" placeholder="Instruksi untuk divisi tujuan...">${customNotes}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "🚀 Simpan & Distribusikan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0284C7",
      preConfirm: () => {
        const divEl = document.getElementById("swal-select-div") as HTMLSelectElement;
        const notesEl = document.getElementById("swal-input-notes") as HTMLTextAreaElement;
        return {
          newDiv: divEl.value as DivisionId,
          newNotes: notesEl.value,
        };
      },
    }).then(async (result: any) => {
      if (result.isConfirmed && result.value) {
        await distributeTicketFromCS(
          ticket.id,
          result.value.newDiv,
          result.value.newNotes,
          "Putri Delia (CS Dispatcher)"
        );
        refreshData();
        const targetMeta = DIVISIONS[result.value.newDiv as DivisionId];
        // @ts-ignore
        window.Swal.fire({
          icon: "success",
          title: "Tiket Berhasil Dialihkan!",
          text: `Tiket ${ticket.id} sekarang telah masuk ke antrean ${targetMeta ? targetMeta.name : "divisi terkait"}.`,
          timer: 1600,
          showConfirmButton: false,
        });
      }
    });
  }

  function openCommentsModal(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    const modalContainer = document.createElement("div");
    modalContainer.style.textAlign = "left";

    const feedWidget = createTicketCommentFeed({
      ticketId: ticket.id,
      ticketCustomer: ticket.customer,
      initialComments: ticket.comments || [],
      currentDivision: "customer_service",
      authorName: "Putri Delia (CS Dispatcher)",
      onCommentAdded: (_newCmt, allCmts) => {
        ticket.comments = allCmts;
        saveSingleTicket(ticket);
      },
    });
    modalContainer.appendChild(feedWidget);

    // @ts-ignore
    window.Swal.fire({
      title: `💬 Catatan Lintas Divisi: ${ticket.id}`,
      html: modalContainer,
      width: "700px",
      showConfirmButton: false,
      showCloseButton: true,
    }).then(() => {
      refreshData();
    });
  }

  function sendWhatsAppUpdateToCustomer(ticket: UnifiedTicket) {
    const rawPhone = (ticket.phone || "").replace(/\D/g, "");
    const phone = rawPhone.startsWith("0") ? "62" + rawPhone.slice(1) : rawPhone || "6281234567890";
    const targetDivName = DIVISIONS[ticket.targetDivision].name;

    const message =
      ticket.status === "selesai"
        ? `Yth. Pelanggan Aetra Air Tangerang Bapak/Ibu ${ticket.customer}, kami menginformasikan bahwa laporan komplain Anda dengan No. WO: ${ticket.id} telah SELESAI ditangani oleh tim teknis kami. Dokumen Berita Acara Penyelesaian (BAST) telah diterbitkan. Terima kasih.`
        : `Yth. Pelanggan Aetra Air Tangerang Bapak/Ibu ${ticket.customer}, laporan pengaduan Anda dengan No. WO: ${ticket.id} ([${ticket.category}]) telah diterima oleh Customer Service Aetra dan saat ini telah didistribusikan ke tim ${targetDivName} untuk penanganan segera.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function render() {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "max-width: 1520px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px;";

    const totalTickets = tickets.length;
    const mrCount = tickets.filter((t) => t.targetDivision === "minor_repair").length;
    const ossCount = tickets.filter((t) => t.targetDivision === "sales_support").length;
    const tkaCount = tickets.filter((t) => t.targetDivision === "key_account").length;
    const tsCount = tickets.filter((t) => t.targetDivision === "technical_support").length;
    const resolvedCount = tickets.filter((t) => t.status === "selesai").length;

    // View Navigation Bar: Executive Analytics (Power BI View) vs Operational Queue
    const viewTabNav = document.createElement("div");
    viewTabNav.className = "cs-view-tab-nav";
    viewTabNav.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 8px 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    `;

    const isAnalytics = activeCsTab === "analytics";
    const isMovingAvg = activeCsTab === "moving_avg";
    const isOperational = activeCsTab === "operational";

    const leftTabGroup = document.createElement("div");
    leftTabGroup.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

    const analyticsTabBtn = document.createElement("button");
    analyticsTabBtn.type = "button";
    analyticsTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isAnalytics ? "1px solid #0284C7" : "1px solid #E2E8F0"};
      background: ${isAnalytics ? "#0F172A" : "#F8FAFC"};
      color: ${isAnalytics ? "#38BDF8" : "#475569"};
      box-shadow: ${isAnalytics ? "0 2px 8px rgba(15,23,42,0.35)" : "none"};
      transition: all 0.15s ease;
    `;
    analyticsTabBtn.innerHTML = `
      <span style="font-size: 14px;">📊</span>
      <span>Executive Analytics BI</span>
      <span style="background: ${isAnalytics ? "#0284C7" : "#E2E8F0"}; color: ${isAnalytics ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        27.959 Tiket
      </span>
    `;
    analyticsTabBtn.onclick = () => {
      activeCsTab = "analytics";
      localStorage.setItem("aetra_cs_active_view", "analytics");
      render();
    };

    const movingAvgTabBtn = document.createElement("button");
    movingAvgTabBtn.type = "button";
    movingAvgTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isMovingAvg ? "1px solid #0284C7" : "1px solid #E2E8F0"};
      background: ${isMovingAvg ? "#0F172A" : "#F8FAFC"};
      color: ${isMovingAvg ? "#38BDF8" : "#475569"};
      box-shadow: ${isMovingAvg ? "0 2px 8px rgba(15,23,42,0.35)" : "none"};
      transition: all 0.15s ease;
    `;
    movingAvgTabBtn.innerHTML = `
      <span style="font-size: 14px;">📈</span>
      <span>30-Day Moving Avg Trend</span>
      <span style="background: ${isMovingAvg ? "#0284C7" : "#E2E8F0"}; color: ${isMovingAvg ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        Recharts
      </span>
    `;
    movingAvgTabBtn.onclick = () => {
      activeCsTab = "moving_avg";
      localStorage.setItem("aetra_cs_active_view", "moving_avg");
      render();
    };

    const operationalTabBtn = document.createElement("button");
    operationalTabBtn.type = "button";
    operationalTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isOperational ? "1px solid #0369A1" : "1px solid #E2E8F0"};
      background: ${isOperational ? "#0284C7" : "#F8FAFC"};
      color: ${isOperational ? "#FFFFFF" : "#475569"};
      box-shadow: ${isOperational ? "0 2px 8px rgba(2,132,199,0.3)" : "none"};
      transition: all 0.15s ease;
    `;
    operationalTabBtn.innerHTML = `
      <span style="font-size: 14px;">📋</span>
      <span>Input & Antrean Distribusi Tiket</span>
      <span style="background: ${isOperational ? "rgba(255,255,255,0.25)" : "#E2E8F0"}; color: ${isOperational ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        ${totalTickets} Tiket
      </span>
    `;
    operationalTabBtn.onclick = () => {
      activeCsTab = "operational";
      localStorage.setItem("aetra_cs_active_view", "operational");
      render();
    };

    leftTabGroup.appendChild(analyticsTabBtn);
    leftTabGroup.appendChild(movingAvgTabBtn);
    leftTabGroup.appendChild(operationalTabBtn);

    const rightTabInfo = document.createElement("div");
    rightTabInfo.style.cssText = "display: flex; align-items: center; gap: 8px;";
    rightTabInfo.innerHTML = `
      <span style="font-size: 11px; color: #64748B;">Tampilan Aktif:</span>
      <span style="font-size: 11px; font-weight: 800; color: ${isAnalytics || isMovingAvg ? "#0284C7" : "#059669"}; background: ${isAnalytics || isMovingAvg ? "#F0F9FF" : "#ECFDF5"}; border: 1px solid ${isAnalytics || isMovingAvg ? "#BAE6FD" : "#A7F3D0"}; padding: 3px 8px; border-radius: 6px;">
        ${isAnalytics ? "📊 Executive BI View" : isMovingAvg ? "📈 30-Day Moving Avg Trend" : "📋 Operasional Loket & CS"}
      </span>
    `;

    viewTabNav.appendChild(leftTabGroup);
    viewTabNav.appendChild(rightTabInfo);
    wrapper.appendChild(viewTabNav);

    // If Executive Analytics is active, render executive BI dashboard
    if (activeCsTab === "analytics") {
      const execView = createExecutiveAnalyticsView({
        tickets,
        onSwitchToOperational: () => {
          activeCsTab = "operational";
          localStorage.setItem("aetra_cs_active_view", "operational");
          render();
        },
      });
      wrapper.appendChild(execView);
      container.appendChild(wrapper);
      return;
    }

    // If Dedicated 30-Day Moving Average view is active
    if (activeCsTab === "moving_avg") {
      const maViewWrapper = document.createElement("div");
      maViewWrapper.className = "space-y-4 font-sans text-slate-100 p-4 rounded-xl";
      maViewWrapper.style.cssText = "background: #020617; min-height: 80vh;";

      const maRoot = mountThirtyDayMovingAverageCard(maViewWrapper, {
        initialTickets: tickets,
        onRefreshRequested: () => {
          tickets = loadAllUnifiedTickets();
          render();
        },
      });

      wrapper.appendChild(maViewWrapper);
      container.appendChild(wrapper);
      return;
    }

    // Stats Bar
    if (isViewItemVisible("customer_service", "cs_stats_cards")) {
      const statsRow = document.createElement("div");
      statsRow.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;";

      const statsData = [
        { label: "Total Komplain Masuk", count: totalTickets, icon: "📥", color: "#0284C7", bg: "#EFF6FF" },
        { label: "Ke Minor Repair", count: mrCount, icon: "🛠️", color: "#D97706", bg: "#FFFBEB" },
        { label: "Ke Sales Support", count: ossCount, icon: "💼", color: "#059669", bg: "#ECFDF5" },
        { label: "Ke Key Account (Industri)", count: tkaCount, icon: "🏢", color: "#7C3AED", bg: "#F5F3FF" },
        { label: "Ke Tech Support (Lab)", count: tsCount, icon: "🔬", color: "#DC2626", bg: "#FEF2F2" },
        { label: "Selesai (BAST Selesai)", count: resolvedCount, icon: "✅", color: "#10B981", bg: "#ECFDF5" },
      ];

      statsData.forEach((st) => {
        const card = document.createElement("div");
        card.style.cssText = `
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        `;
        card.innerHTML = `
          <div style="width: 40px; height: 40px; border-radius: 10px; background: ${st.bg}; color: ${st.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ${st.icon}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748B;">${st.label}</div>
            <div style="font-size: 20px; font-weight: 900; color: #0F172A;">${st.count}</div>
          </div>
        `;
        statsRow.appendChild(card);
      });

      wrapper.appendChild(statsRow);
    }

    // Top Gateway Action Bar
    if (isViewItemVisible("customer_service", "cs_gateway_banner")) {
      const actionBar = document.createElement("div");
      actionBar.style.cssText = `
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      `;

      const actionLeft = document.createElement("div");
      actionLeft.innerHTML = `
        <div style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase; letter-spacing: 0.5px;">
          🌟 GERBANG AWAL PENERIMA KOMPLAIN
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">
          Penerimaan Pengaduan Pelanggan & Distribusi Lintas Divisi
        </div>
      `;

      const actionBtnGroup = document.createElement("div");
      actionBtnGroup.style.cssText = "display: flex; align-items: center; gap: 8px;";

      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.style.cssText = `
        background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 10px 18px;
        font-size: 12.5px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 3px 10px rgba(2,132,199,0.3);
      `;
      createBtn.innerHTML = `<span>➕</span> <span>${formOpen ? "Tutup Form Input" : "Terima Komplain Baru"}</span>`;
      createBtn.onclick = () => {
        formOpen = !formOpen;
        render();
      };

      actionBtnGroup.appendChild(createBtn);

      actionBar.appendChild(actionLeft);
      actionBar.appendChild(actionBtnGroup);
      wrapper.appendChild(actionBar);
    }

    // Collapsible Intake Form
    if (formOpen && isViewItemVisible("customer_service", "cs_intake_form")) {
      const formCard = document.createElement("div");
      formCard.style.cssText = `
        background: #FFFFFF;
        border: 2px solid #BFDBFE;
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 10px 25px rgba(2,132,199,0.08);
      `;

      formCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0369A1;">
              📝 Form Input Penerimaan Pengaduan & Rekomendasi Routing Divisi
            </h3>
            <div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">
              Petugas CS mencatat identitas keluhan lalu sistem secara cerdas merekomendasikan divisi eksekusi terkait.
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 800; background: #ECFDF5; color: #059669; padding: 4px 10px; border-radius: 12px; border: 1px solid #A7F3D0;">
            Otomatis Tersinkronisasi
          </span>
        </div>
      `;

      // Inputs Grid
      const inputsGrid = document.createElement("div");
      inputsGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;";

      // 1. Channel & Sambungan
      const col1 = document.createElement("div");
      col1.style.cssText = "display: flex; flex-direction: column; gap: 10px;";
      col1.innerHTML = `
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Saluran Masuk Pengaduan:</label>
          <select id="cs-channel" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; margin-top: 4px;">
            <option value="WhatsApp CS" ${newChannel === "WhatsApp CS" ? "selected" : ""}>💬 WhatsApp Resmi CS</option>
            <option value="Call Center 24 Jam" ${newChannel === "Call Center 24 Jam" ? "selected" : ""}>☎️ Call Center 24 Jam (021-5989800)</option>
            <option value="Loket Kantor" ${newChannel === "Loket Kantor" ? "selected" : ""}>🏢 Loket Pelayanan Kantor Posko</option>
            <option value="Mobile App" ${newChannel === "Mobile App" ? "selected" : ""}>📱 Mobile App Pelanggan</option>
            <option value="Media Sosial" ${newChannel === "Media Sosial" ? "selected" : ""}>🌐 Media Sosial / Website</option>
          </select>
        </div>
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Nama Pelanggan:</label>
          <input id="cs-customer" type="text" placeholder="Contoh: Bpk. Bambang Wijaya" value="${newCustomer}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; margin-top: 4px;" />
        </div>
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">No. Telepon / WhatsApp:</label>
          <input id="cs-phone" type="text" placeholder="Contoh: 081299887766" value="${newPhone}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; margin-top: 4px;" />
        </div>
      `;

      // 2. Meter ID & Address
      const col2 = document.createElement("div");
      col2.style.cssText = "display: flex; flex-direction: column; gap: 10px;";
      col2.innerHTML = `
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">No. Sambungan / Meter Air:</label>
          <input id="cs-meter" type="text" placeholder="Contoh: MTR-98210" value="${newMeterId}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; margin-top: 4px; font-family: monospace;" />
        </div>
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Wilayah / Area Pelayanan:</label>
          <select id="cs-area" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; margin-top: 4px;">
            ${AREAS.map((a) => `<option value="${a}" ${newArea === a ? "selected" : ""}>${a}</option>`).join("")}
          </select>
        </div>
        <div>
          <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Alamat Kejadian / Lokasi:</label>
          <textarea id="cs-address" placeholder="Nama jalan, RT/RW, nomor rumah, patokan lokasi..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; min-height: 52px; margin-top: 4px;">${newAddress}</textarea>
        </div>
      `;

      // 3. Category & Target Division
      const col3 = document.createElement("div");
      col3.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

      const catSelectWrapper = document.createElement("div");
      catSelectWrapper.innerHTML = `
        <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Kategori Keluhan:</label>
        <select id="cs-category" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; margin-top: 4px; color: #0284C7;">
          ${CATEGORY_CHOICES.map(
            (c) => `<option value="${c.key}" ${newCategory === c.key ? "selected" : ""}>[${c.key}] ${c.label}</option>`
          ).join("")}
        </select>
      `;

      const routingCard = document.createElement("div");
      routingCard.style.cssText = `
        background: ${DIVISIONS[newTargetDivision].badgeBg};
        border: 1.5px solid ${DIVISIONS[newTargetDivision].borderColor};
        border-radius: 10px;
        padding: 10px;
      `;
      routingCard.innerHTML = `
        <div style="font-size: 10.5px; font-weight: 800; color: ${DIVISIONS[newTargetDivision].badgeColor}; text-transform: uppercase;">
          🎯 REKOMENDASI DIVISI TUJUAN:
        </div>
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 3px 0;">
          ${DIVISIONS[newTargetDivision].icon} ${DIVISIONS[newTargetDivision].name}
        </div>
        <div style="font-size: 11px; color: #475569;">
          ${DIVISIONS[newTargetDivision].tagline}
        </div>
      `;

      const targetDivSelector = document.createElement("div");
      targetDivSelector.innerHTML = `
        <label style="font-size: 11px; font-weight: 800; color: #1E293B; display: block; margin-bottom: 4px;">Ubah Divisi Tujuan (Jika Perlu):</label>
        <select id="cs-target-div" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700;">
          <option value="minor_repair" ${newTargetDivision === "minor_repair" ? "selected" : ""}>🛠️ Divisi Minor Repair</option>
          <option value="sales_support" ${newTargetDivision === "sales_support" ? "selected" : ""}>💼 Operasional Sales Support</option>
          <option value="key_account" ${newTargetDivision === "key_account" ? "selected" : ""}>🏢 Technical Key Account</option>
          <option value="technical_support" ${newTargetDivision === "technical_support" ? "selected" : ""}>🔬 Technical Support & Lab</option>
        </select>
      `;

      col3.appendChild(catSelectWrapper);
      col3.appendChild(routingCard);
      col3.appendChild(targetDivSelector);

      inputsGrid.appendChild(col1);
      inputsGrid.appendChild(col2);
      inputsGrid.appendChild(col3);
      formCard.appendChild(inputsGrid);

      // Bottom Instructions & Submit
      const bottomRow = document.createElement("div");
      bottomRow.style.cssText = "display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px; border-top: 1px solid #E2E8F0; padding-top: 14px;";

      const notesBox = document.createElement("div");
      notesBox.style.cssText = "flex: 1; min-width: 280px;";
      notesBox.innerHTML = `
        <label style="font-size: 11px; font-weight: 800; color: #1E293B;">Catatan / Instruksi Pengawalan CS untuk Divisi Tujuan:</label>
        <input id="cs-notes" type="text" placeholder="Contoh: Harap segera dicek karena ada genangan di jalan raya / berkas kwitansi lunas sudah diverifikasi" value="${newDistributionNotes}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; margin-top: 4px;" />
      `;

      const submitBtns = document.createElement("div");
      submitBtns.style.cssText = "display: flex; gap: 8px;";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.innerText = "Batal";
      cancelBtn.style.cssText = "padding: 10px 16px; border: 1px solid #CBD5E1; background: #F8FAFC; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;";
      cancelBtn.onclick = () => {
        formOpen = false;
        render();
      };

      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.style.cssText = "padding: 10px 20px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; border: none; border-radius: 10px; font-size: 12.5px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(16,185,129,0.3);";
      sendBtn.innerHTML = "<span>🚀 Simpan & Distribusikan Tiket</span>";

      sendBtn.onclick = () => {
        const custEl = document.getElementById("cs-customer") as HTMLInputElement;
        const phoneEl = document.getElementById("cs-phone") as HTMLInputElement;
        const meterEl = document.getElementById("cs-meter") as HTMLInputElement;
        const addrEl = document.getElementById("cs-address") as HTMLTextAreaElement;
        const areaEl = document.getElementById("cs-area") as HTMLSelectElement;
        const chanEl = document.getElementById("cs-channel") as HTMLSelectElement;
        const notesEl = document.getElementById("cs-notes") as HTMLInputElement;
        const divEl = document.getElementById("cs-target-div") as HTMLSelectElement;

        newCustomer = custEl.value;
        newPhone = phoneEl.value;
        newMeterId = meterEl.value;
        newAddress = addrEl.value;
        newArea = areaEl.value;
        newChannel = chanEl.value as any;
        newDistributionNotes = notesEl.value;
        newTargetDivision = divEl.value as DivisionId;

        submitNewComplaint();
      };

      submitBtns.appendChild(cancelBtn);
      submitBtns.appendChild(sendBtn);

      bottomRow.appendChild(notesBox);
      bottomRow.appendChild(submitBtns);
      formCard.appendChild(bottomRow);

      wrapper.appendChild(formCard);

      // Event listener for category selection change
      setTimeout(() => {
        const catSelect = document.getElementById("cs-category") as HTMLSelectElement;
        if (catSelect) {
          catSelect.onchange = (e: any) => handleCategoryChange(e.target.value);
        }
      }, 0);
    }

    // Monitoring Table Filters
    // Filter Bar & Search
    if (isViewItemVisible("customer_service", "cs_filter_tabs")) {
      const filterRow = document.createElement("div");
      filterRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";

      const tabGroup = document.createElement("div");
      tabGroup.style.cssText = "display: flex; gap: 4px; background: #FFFFFF; padding: 4px; border-radius: 10px; border: 1px solid #E2E8F0; overflow-x: auto;";

      const filterTabs: { id: typeof filterDivision; label: string; count: number }[] = [
        { id: "all", label: "Semua Komplain", count: totalTickets },
        { id: "minor_repair", label: "🛠️ Minor Repair", count: mrCount },
        { id: "sales_support", label: "💼 Sales Support", count: ossCount },
        { id: "key_account", label: "🏢 Key Account", count: tkaCount },
        { id: "technical_support", label: "🔬 Tech Support", count: tsCount },
        { id: "selesai", label: "✅ Selesai Ditangani", count: resolvedCount },
      ];

      filterTabs.forEach((tab) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const isActive = filterDivision === tab.id;
        btn.style.cssText = `
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          background: ${isActive ? "#0284C7" : "transparent"};
          color: ${isActive ? "#FFFFFF" : "#64748B"};
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        `;
        btn.innerHTML = `<span>${tab.label}</span> <span style="background: ${isActive ? "rgba(255,255,255,0.25)" : "#F1F5F9"}; padding: 1px 6px; border-radius: 10px; font-size: 10.5px;">${tab.count}</span>`;
        btn.onclick = () => {
          filterDivision = tab.id;
          render();
        };
        tabGroup.appendChild(btn);
      });

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Cari No WO, Pelanggan, Alamat, ID Meter...";
      searchInput.value = searchQuery;
      searchInput.style.cssText = "padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; width: 280px;";
      searchInput.oninput = (e: any) => {
        searchQuery = e.target.value;
        render();
      };

      filterRow.appendChild(tabGroup);
      filterRow.appendChild(searchInput);
      wrapper.appendChild(filterRow);
    }

    // Filter tickets
    let filtered = tickets;
    if (filterDivision === "selesai") {
      filtered = filtered.filter((t) => t.status === "selesai");
    } else if (filterDivision !== "all") {
      filtered = filtered.filter((t) => t.targetDivision === filterDivision);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.caseId && t.caseId.toLowerCase().includes(q)) ||
          t.customer.toLowerCase().includes(q) ||
          t.meterId.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q) ||
          t.area.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    // Tickets Table Card
    const tableCard = document.createElement("div");
    tableCard.style.cssText = "background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);";

    if (filtered.length === 0) {
      tableCard.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94A3B8;">
          <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
          <div style="font-size: 13px; font-weight: 700;">Tidak ada komplain yang cocok dengan filter.</div>
        </div>
      `;
    } else {
      const table = document.createElement("table");
      table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;";

      table.innerHTML = `
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px;">No. WO / Case ID</th>
            <th style="padding: 10px 14px;">Pelanggan & Lokasi</th>
            <th style="padding: 10px 14px;">Kategori & Keluhan</th>
            <th style="padding: 10px 14px;">Divisi Tujuan (Distribusi)</th>
            <th style="padding: 10px 14px;">Status Penanganan</th>
            <th style="padding: 10px 14px; text-align: right;">Aksi Customer Service</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody")!;

      filtered.forEach((t) => {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;";
        tr.onmouseenter = () => (tr.style.background = "#F8FAFC");
        tr.onmouseleave = () => (tr.style.background = "transparent");

        const divMeta = DIVISIONS[t.targetDivision] || DIVISIONS.minor_repair;

        const isDone = t.status === "selesai";
        const isProses = t.status === "proses";

        tr.innerHTML = `
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0284C7; font-family: monospace;">${t.id}</div>
            <div style="font-size: 10px; color: #64748B; font-family: monospace;">#${t.caseId || t.id}</div>
            <span style="font-size: 9.5px; background: #EFF6FF; color: #1D4ED8; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 3px;">
              ${t.intakeChannel || "WhatsApp CS"}
            </span>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0F172A;">${t.customer}</div>
            <div style="font-size: 10.5px; color: #64748B; font-family: monospace;">MTR: ${t.meterId}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 ${t.address} (${t.area})</div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; max-width: 260px;">
            <span style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; font-weight: 800; font-size: 10.5px; padding: 2px 6px; border-radius: 6px;">
              ${t.category}
            </span>
            <div style="font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.35;">
              "${t.desc || "-"}"
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="display: inline-flex; align-items: center; gap: 5px; background: ${divMeta.badgeBg}; color: ${divMeta.badgeColor}; border: 1px solid ${divMeta.borderColor}; padding: 3px 8px; border-radius: 8px; font-weight: 800; font-size: 11px;">
              <span>${divMeta.icon}</span>
              <span>${divMeta.shortName}</span>
            </div>
            ${
              t.distributionNotes
                ? `<div style="font-size: 10.5px; color: #64748B; margin-top: 4px; font-style: italic;">
                    "${t.distributionNotes}"
                  </div>`
                : ""
            }
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: inline-block; ${
              isDone
                ? "background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;"
                : isProses
                ? "background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;"
                : "background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;"
            }">
              ${isDone ? "✅ SELESAI" : isProses ? "⚙️ SEDANG DIKERJAKAN" : "⏳ BARU / MENUNGGU"}
            </span>
            <div style="font-size: 10.5px; color: #64748B; margin-top: 4px;">
              ${t.officer ? `👷 ${t.officer}` : t.divisionAssignee ? `👤 ${t.divisionAssignee}` : "Menunggu penugasan PIC"}
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
              <button class="btn-cs-comments" style="padding: 5px 8px; font-size: 11px; font-weight: 700; background: #F8FAFC; border: 1px solid #CBD5E1; color: #1E293B; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                💬 Feed ${t.comments && t.comments.length > 0 ? `<span style="background:#0284C7; color:#FFF; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:8px;">${t.comments.length}</span>` : ""}
              </button>
              <button class="btn-cs-wa" style="padding: 5px 9px; font-size: 11px; font-weight: 700; background: #25D366; color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                💬 Update WA
              </button>
              <button class="btn-cs-redist" style="padding: 5px 9px; font-size: 11px; font-weight: 700; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer;">
                ⚡ Alihkan Divisi
              </button>
              ${
                isDone
                  ? `<button class="btn-cs-report" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #0284C7, #0369A1); color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 5px rgba(2,132,199,0.25);">
                      📄 BAST PDF & Drive
                    </button>`
                  : ""
              }
            </div>
          </td>
        `;

        // Event bindings
        const cmtBtn = tr.querySelector(".btn-cs-comments") as HTMLButtonElement;
        if (cmtBtn) cmtBtn.onclick = () => openCommentsModal(t);

        const waBtn = tr.querySelector(".btn-cs-wa") as HTMLButtonElement;
        if (waBtn) waBtn.onclick = () => sendWhatsAppUpdateToCustomer(t);

        const redistBtn = tr.querySelector(".btn-cs-redist") as HTMLButtonElement;
        if (redistBtn) redistBtn.onclick = () => openRedistributeModal(t);

        const reportBtn = tr.querySelector(".btn-cs-report") as HTMLButtonElement;
        if (reportBtn) {
          reportBtn.onclick = () => {
            openReportPreviewModal({
              item: t as any,
              onUpdateItem: (upd) => {
                saveSingleTicket(upd as any);
                refreshData();
              },
            });
          };
        }

        tbody.appendChild(tr);
      });

      tableCard.appendChild(table);
    }

    if (isViewItemVisible("customer_service", "cs_table_tickets")) {
      wrapper.appendChild(tableCard);
    }
    container.appendChild(wrapper);
  }

  const onViewPrefChange = (e: any) => {
    if (!e.detail || e.detail.division === "customer_service" || e.detail.reset) {
      render();
    }
  };
  window.addEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);

  const onCsSwitchView = (e: any) => {
    if (e.detail?.view === "analytics" || e.detail?.view === "operational" || e.detail?.view === "moving_avg") {
      activeCsTab = e.detail.view;
      localStorage.setItem("aetra_cs_active_view", e.detail.view);
      render();
    }
  };
  window.addEventListener("aetra:cs_switch_view", onCsSwitchView);

  render();

  return () => {
    window.removeEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);
    window.removeEventListener("aetra:cs_switch_view", onCsSwitchView);
    container.innerHTML = "";
  };
}
