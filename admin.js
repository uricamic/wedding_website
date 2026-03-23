const adminFeedback = document.getElementById("adminFeedback");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const statTotal = document.getElementById("statTotal");
const statComing = document.getElementById("statComing");
const statAccommodation = document.getElementById("statAccommodation");
const adminStats = document.getElementById("adminStats");
const adminFilters = document.getElementById("adminFilters");
const filterSearch = document.getElementById("filterSearch");
const filterAttendance = document.getElementById("filterAttendance");
const filterAccommodation = document.getElementById("filterAccommodation");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const tableWrap = document.getElementById("tableWrap");
const rsvpRows = document.getElementById("rsvpRows");
const seatingEditor = document.getElementById("seatingEditor");
const seatingForm = document.getElementById("seatingForm");
const seatingFeedback = document.getElementById("seatingFeedback");
const seatingBoard = document.getElementById("seatingBoard");
const seatGuest = document.getElementById("seatGuest");
const seatTable = document.getElementById("seatTable");
const seatLabel = document.getElementById("seatLabel");
const seatNotes = document.getElementById("seatNotes");

const config = window.WEDDING_CONFIG || {};
const canUseSupabase =
  typeof window.supabase !== "undefined" &&
  Boolean(config.supabaseUrl) &&
  Boolean(config.supabaseAnonKey);

let allRows = [];
let visibleRows = [];
let seatingRows = [];

function getAuthRedirectUrl() {
  if (config.adminRedirectUrl) {
    return String(config.adminRedirectUrl).trim();
  }

  if (config.publicSiteUrl) {
    const base = String(config.publicSiteUrl).trim().replace(/\/$/, "");
    if (base) {
      return `${base}/admin.html`;
    }
  }

  const { protocol, hostname } = window.location;
  const isLocal =
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (isLocal) {
    // Let Supabase use configured SITE_URL when running locally.
    return "";
  }

  return `${window.location.origin}${window.location.pathname}`;
}

if (!canUseSupabase) {
  adminFeedback.textContent =
    "Doplňte Supabase údaje do config.js, pak se admin dashboard automaticky aktivuje.";
} else {
  const supabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminFeedback.textContent = "Posílám magic link...";

    const redirectUrl = getAuthRedirectUrl();
    const options = redirectUrl ? { emailRedirectTo: redirectUrl } : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: adminEmail.value,
      options
    });

    if (error) {
      adminFeedback.textContent = "Nepodařilo se odeslat přihlašovací odkaz.";
      return;
    }

    adminFeedback.textContent =
      "Odkaz byl odeslán. Po otevření e-mailu se stránka přihlásí automaticky.";
  });

  [filterSearch, filterAttendance, filterAccommodation].forEach((control) => {
    control.addEventListener("input", applyFilters);
    control.addEventListener("change", applyFilters);
  });

  exportCsvBtn.addEventListener("click", () => {
    if (visibleRows.length === 0) {
      adminFeedback.textContent = "Není co exportovat. Nejprve načtěte nebo upravte filtry.";
      return;
    }
    exportCsv(visibleRows);
    adminFeedback.textContent = `Export hotov: ${visibleRows.length} řádků.`;
  });

  seatingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selectedId = Number(seatGuest.value);
    if (!selectedId) {
      seatingFeedback.textContent = "Vyberte hosta.";
      return;
    }

    seatingFeedback.textContent = "Ukládám přiřazení...";
    const payload = {
      rsvp_id: selectedId,
      table_name: seatTable.value.trim(),
      seat_label: seatLabel.value.trim(),
      notes: seatNotes.value.trim()
    };

    const { error } = await supabase
      .from("seating_assignments")
      .upsert(payload, { onConflict: "rsvp_id" });

    if (error) {
      seatingFeedback.textContent = "Nepodařilo se uložit přiřazení.";
      return;
    }

    seatingForm.reset();
    seatingFeedback.textContent = "Přiřazení uloženo.";
    await loadSeatingAssignments();
  });

  seatingBoard.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-seat-delete]");
    if (!button) {
      return;
    }

    const id = Number(button.dataset.seatDelete);
    if (!id) {
      return;
    }

    seatingFeedback.textContent = "Mažu přiřazení...";
    const { error } = await supabase
      .from("seating_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      seatingFeedback.textContent = "Mazání se nepodařilo.";
      return;
    }

    seatingFeedback.textContent = "Přiřazení smazáno.";
    await loadSeatingAssignments();
  });

  async function verifyAllowlist(session) {
    const email = session?.user?.email || "";
    if (!email) {
      return false;
    }

    const normalizedEmail = email.toLowerCase();
    const { data, error } = await supabase
      .from("admin_allowlist")
      .select("email")
      .eq("email", normalizedEmail)
      .limit(1);

    if (error) {
      return false;
    }

    return Boolean(data?.length);
  }

  async function loadRows() {
    const { data, error } = await supabase
      .from("rsvps")
      .select("id,created_at,name,email,phone,attendance,guests,accommodation,food,message")
      .order("created_at", { ascending: false });

    if (error) {
      adminFeedback.textContent = "Nepodařilo se načíst RSVP data.";
      return;
    }

    allRows = data || [];
    const coming = allRows.filter((row) => row.attendance === "yes").length;
    const accommodation = allRows.filter((row) => row.accommodation === "yes").length;

    statTotal.textContent = String(allRows.length);
    statComing.textContent = String(coming);
    statAccommodation.textContent = String(accommodation);
    adminStats.hidden = false;
    adminFilters.hidden = false;
    tableWrap.hidden = false;

    hydrateGuestSelect();
    applyFilters();
  }

  async function loadSeatingAssignments() {
    const { data, error } = await supabase
      .from("seating_assignments")
      .select("id,rsvp_id,table_name,seat_label,notes,rsvps(name,email)")
      .order("table_name", { ascending: true });

    if (error) {
      seatingFeedback.textContent = "Nepodařilo se načíst zasedací plán.";
      return;
    }

    seatingRows = data || [];
    seatingEditor.hidden = false;
    renderSeatingBoard();
  }

  function hydrateGuestSelect() {
    const comingRows = allRows.filter((row) => row.attendance === "yes");
    const options = [
      '<option value="">Vyberte hosta</option>',
      ...comingRows.map(
        (row) =>
          `<option value="${row.id}">${escapeHtml(row.name || "")}${row.email ? ` (${escapeHtml(row.email)})` : ""}</option>`
      )
    ];
    seatGuest.innerHTML = options.join("");
  }

  function applyFilters() {
    const query = filterSearch.value.trim().toLowerCase();
    const attendance = filterAttendance.value;
    const accommodation = filterAccommodation.value;

    visibleRows = allRows.filter((row) => {
      const haystack = `${row.name || ""} ${row.email || ""}`.toLowerCase();
      const matchSearch = query ? haystack.includes(query) : true;
      const matchAttendance = attendance === "all" ? true : row.attendance === attendance;
      const matchAccommodation = accommodation === "all" ? true : row.accommodation === accommodation;
      return matchSearch && matchAttendance && matchAccommodation;
    });

    renderRsvpTable(visibleRows);
  }

  function renderRsvpTable(rows) {
    rsvpRows.innerHTML = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(String(row.id || ""))}</td>
            <td>${escapeHtml(row.name || "")}</td>
            <td>${escapeHtml(row.email || "")}</td>
            <td>${escapeHtml(row.attendance || "")}</td>
            <td>${escapeHtml(String(row.guests || ""))}</td>
            <td>${escapeHtml(row.accommodation || "")}</td>
            <td>${escapeHtml(row.phone || "")}</td>
            <td>${escapeHtml(row.food || "")}</td>
            <td>${escapeHtml(row.message || "")}</td>
          </tr>`
      )
      .join("");
  }

  function renderSeatingBoard() {
    if (seatingRows.length === 0) {
      seatingBoard.innerHTML = "<p>Zatím nejsou uložena žádná přiřazení.</p>";
      return;
    }

    const grouped = new Map();
    seatingRows.forEach((row) => {
      const tableKey = row.table_name || "Nezařazeno";
      if (!grouped.has(tableKey)) {
        grouped.set(tableKey, []);
      }
      grouped.get(tableKey).push(row);
    });

    const cards = [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "cs"))
      .map(([tableName, entries]) => {
        const content = entries
          .map((entry) => {
            const guestName = entry.rsvps?.name || "Host";
            const guestEmail = entry.rsvps?.email || "";
            const seat = entry.seat_label || "-";
            const notes = entry.notes ? `<p>Pozn.: ${escapeHtml(entry.notes)}</p>` : "";

            return `<div class="seat-entry">
              <div>
                <p><strong>${escapeHtml(guestName)}</strong> (${escapeHtml(seat)})</p>
                <p>${escapeHtml(guestEmail)}</p>
                ${notes}
              </div>
              <button type="button" class="seat-remove" data-seat-delete="${entry.id}">Smazat</button>
            </div>`;
          })
          .join("");

        return `<article class="seat-table-card"><h3>${escapeHtml(tableName)}</h3>${content}</article>`;
      })
      .join("");

    seatingBoard.innerHTML = cards;
  }

  function exportCsv(rows) {
    const headers = [
      "id",
      "created_at",
      "name",
      "email",
      "phone",
      "attendance",
      "guests",
      "accommodation",
      "food",
      "message"
    ];

    const lines = [headers.join(",")];
    rows.forEach((row) => {
      const values = headers.map((header) => {
        const raw = row[header] ?? "";
        const escaped = String(raw).replaceAll('"', '""');
        return `"${escaped}"`;
      });
      lines.push(values.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rsvp-export.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function initAdmin() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      adminFeedback.textContent = "Přihlaste se e-mailem, poté se data načtou.";
      return;
    }

    const allowed = await verifyAllowlist(data.session);
    if (!allowed) {
      adminFeedback.textContent = "Tento účet není v admin allowlistu. Požádejte o přidání e-mailu.";
      return;
    }

    adminFeedback.textContent = "Načítám RSVP data...";
    await loadRows();
    await loadSeatingAssignments();
    adminFeedback.textContent = "Data načtena.";
  }

  initAdmin();
}
