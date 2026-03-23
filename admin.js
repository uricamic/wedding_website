const adminFeedback = document.getElementById("adminFeedback");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const statTotal = document.getElementById("statTotal");
const statComing = document.getElementById("statComing");
const statAccommodation = document.getElementById("statAccommodation");
const adminStats = document.getElementById("adminStats");
const tableWrap = document.getElementById("tableWrap");
const rsvpRows = document.getElementById("rsvpRows");

const config = window.WEDDING_CONFIG || {};
const canUseSupabase =
  typeof window.supabase !== "undefined" &&
  Boolean(config.supabaseUrl) &&
  Boolean(config.supabaseAnonKey);

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

    const { error } = await supabase.auth.signInWithOtp({
      email: adminEmail.value,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });

    if (error) {
      adminFeedback.textContent = "Nepodařilo se odeslat přihlašovací odkaz.";
      return;
    }

    adminFeedback.textContent =
      "Odkaz byl odeslán. Po otevření e-mailu se stránka přihlásí automaticky.";
  });

  async function loadRows() {
    const { data, error } = await supabase
      .from("rsvps")
      .select("name,email,attendance,guests,accommodation,accommodation_nights,seating_preference")
      .order("created_at", { ascending: false });

    if (error) {
      adminFeedback.textContent = "Nepodařilo se načíst RSVP data.";
      return;
    }

    const rows = data || [];
    const coming = rows.filter((row) => row.attendance === "yes").length;
    const accommodation = rows.filter((row) => row.accommodation === "yes").length;

    statTotal.textContent = String(rows.length);
    statComing.textContent = String(coming);
    statAccommodation.textContent = String(accommodation);
    adminStats.hidden = false;
    tableWrap.hidden = false;

    rsvpRows.innerHTML = rows
      .map(
        (row) =>
          `<tr>
            <td>${escapeHtml(row.name || "")}</td>
            <td>${escapeHtml(row.email || "")}</td>
            <td>${escapeHtml(row.attendance || "")}</td>
            <td>${escapeHtml(String(row.guests || ""))}</td>
            <td>${escapeHtml(row.accommodation || "")}</td>
            <td>${escapeHtml(String(row.accommodation_nights || ""))}</td>
            <td>${escapeHtml(row.seating_preference || "")}</td>
          </tr>`
      )
      .join("");
  }

  function escapeHtml(value) {
    return value
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

    adminFeedback.textContent = "Načítám RSVP data...";
    await loadRows();
    adminFeedback.textContent = "Data načtena.";
  }

  initAdmin();
}
