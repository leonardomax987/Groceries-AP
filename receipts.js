import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Inject modal + table styles ────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  .calcOverlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(20, 30, 20, .55);
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .calcOverlay.open {
    display: flex;
  }
  .calcModal {
    background: #fbf7ea;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,.22);
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .calcModalHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .calcModalTitle {
    font-size: 16px;
    font-weight: 850;
    color: #1f2a1f;
    line-height: 1.3;
  }
  .calcModalClose {
    border: none;
    background: transparent;
    font-size: 22px;
    cursor: pointer;
    color: #5b6a5b;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 8px;
  }
  .calcModalClose:hover { background: rgba(31,42,31,.08); color: #1f2a1f; }
  .calcReceiptImg {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    border-radius: 12px;
    border: 1px solid rgba(31,42,31,.12);
    background: #e7e0d0;
  }
  .calcModeRow {
    display: flex;
    gap: 10px;
  }
  .calcModeBtn {
    flex: 1;
    padding: 10px;
    border-radius: 12px;
    border: 2px solid rgba(31,42,31,.14);
    background: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: .15s;
    color: #1f2a1f;
  }
  .calcModeBtn.active {
    border-color: #2b6b45;
    background: rgba(43,107,69,.10);
    color: #1f5a3a;
  }
  .calcSection {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .calcLabel {
    font-size: 13px;
    font-weight: 750;
    color: #1f2a1f;
    margin-bottom: 2px;
  }
  .calcNameGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .calcNameBtn {
    padding: 8px 6px;
    border-radius: 10px;
    border: 1px solid rgba(31,42,31,.14);
    background: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    color: #1f2a1f;
    transition: .15s;
  }
  .calcNameBtn.selected {
    border-color: #2b6b45;
    background: rgba(43,107,69,.12);
    color: #1f5a3a;
  }
  .calcInput {
    border: 1px solid rgba(31,42,31,.18);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    background: #fff;
    color: #1f2a1f;
    width: 100%;
  }
  .calcResult {
    background: rgba(31,107,70,.08);
    border: 1px solid rgba(31,107,70,.20);
    border-radius: 12px;
    padding: 12px;
    font-size: 13px;
    color: #1f5a3a;
    font-weight: 700;
    min-height: 44px;
  }
  .calcActions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .calcBtn {
    padding: 10px 16px;
    border-radius: 12px;
    border: 1px solid rgba(31,42,31,.14);
    background: #fbf7ea;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    color: #1f2a1f;
    box-shadow: 0 4px 12px rgba(0,0,0,.06);
  }
  .calcBtn.primary {
    border-color: rgba(31,90,58,.35);
    background: linear-gradient(180deg, rgba(43,107,69,.22), rgba(43,107,69,.10));
    color: #1f5a3a;
  }
  .calcBtn:disabled { opacity: .6; cursor: wait; }
  .calcDivider {
    border: none;
    border-top: 1px dashed rgba(31,42,31,.16);
    margin: 4px 0;
  }
  .calcHistoryTitle {
    font-size: 13px;
    font-weight: 800;
    color: #5b6a5b;
  }
  .calcHistoryItem {
    font-size: 12px;
    color: #5b6a5b;
    padding: 6px 0;
    border-bottom: 1px solid rgba(31,42,31,.07);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .calcHistoryDelete {
    border: none;
    background: transparent;
    color: #b03a2e;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 6px;
  }
  .calcHistoryDelete:hover { background: rgba(176,58,46,.08); }
  .oweSummaryTable {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-top: 10px;
  }
  .oweSummaryTable th {
    text-align: left;
    padding: 7px 9px;
    background: rgba(31,107,70,.08);
    color: #1f5a3a;
    font-weight: 800;
    border-radius: 6px;
  }
  .oweSummaryTable td {
    padding: 7px 9px;
    border-bottom: 1px solid rgba(31,42,31,.08);
    color: #1f2a1f;
  }
  .oweSummaryTable tr:last-child td { border-bottom: none; }
  .calcNoteInput {
    border: 1px solid rgba(31,42,31,.18);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    background: #fff;
    color: #1f2a1f;
    width: 100%;
    resize: none;
    min-height: 56px;
  }
`;
document.head.appendChild(style);

// ─── Constants ───────────────────────────────────────────────────────────────
const ROOMMATES = ["Marcos", "Leo", "Rafa", "Alex", "Igor"];

// ─── DOM refs ────────────────────────────────────────────────────────────────
const els = {
  tabReceipts:        document.getElementById("tabReceipts"),
  tabView:            document.getElementById("tabView"),
  tabEdit:            document.getElementById("tabEdit"),
  tabLog:             document.getElementById("tabLog"),
  receiptArea:        document.getElementById("receiptArea"),
  viewArea:           document.getElementById("viewArea"),
  editArea:           document.getElementById("editArea"),
  logArea:            document.getElementById("logArea"),
  receiptBuyer:       document.getElementById("receiptBuyer"),
  receiptImageInput:  document.getElementById("receiptImageInput"),
  receiptListChoices: document.getElementById("receiptListChoices"),
  receiptNote:        document.getElementById("receiptNote"),
  btnUploadReceipt:   document.getElementById("btnUploadReceipt"),
  btnRefreshReceipts: document.getElementById("btnRefreshReceipts"),
  receiptGallery:     document.getElementById("receiptGallery"),
};

let lists = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function formatDate(d) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(d));
}

function formatMoney(n) {
  return "$" + Number(n).toFixed(2);
}

// ─── Tab management ──────────────────────────────────────────────────────────
function hideReceiptTab() {
  els.receiptArea.classList.remove("active");
  els.tabReceipts.setAttribute("aria-selected", "false");
}

function openReceiptTab() {
  ["viewArea","editArea","logArea"].forEach(k => els[k].classList.remove("active"));
  ["tabView","tabEdit","tabLog"].forEach(k =>
    els[k].setAttribute("aria-selected","false")
  );
  els.receiptArea.classList.add("active");
  els.tabReceipts.setAttribute("aria-selected","true");
  loadReceipts();
}

// ─── Load lists ───────────────────────────────────────────────────────────────
async function loadLists() {
  const { data, error } = await supabase
    .from("app_lists")
    .select("id, slug, display_name")
    .order("created_at", { ascending: true });
  if (error) throw error;
  lists = data ?? [];
  renderListChoices();
}

function renderListChoices() {
  els.receiptListChoices.innerHTML = "";
  for (const list of lists) {
    const label = document.createElement("label");
    label.className = "receiptChoice";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(list.id)}" />
      <span>${escapeHtml(list.display_name)}</span>
    `;
    els.receiptListChoices.appendChild(label);
  }
}

function selectedListIds() {
  return [...els.receiptListChoices.querySelectorAll("input:checked")]
    .map(i => i.value);
}

function clearReceiptForm() {
  els.receiptBuyer.value = "";
  els.receiptImageInput.value = "";
  els.receiptNote.value = "";
  els.receiptListChoices.querySelectorAll("input:checked")
    .forEach(i => { i.checked = false; });
}

// ─── Upload ───────────────────────────────────────────────────────────────────
async function uploadReceipt() {
  const buyer     = els.receiptBuyer.value;
  const imageFile = els.receiptImageInput.files?.[0];
  const listIds   = selectedListIds();
  const note      = els.receiptNote.value.trim();

  if (!buyer)            { alert("Choose who bought the groceries."); return; }
  if (!imageFile)        { alert("Choose a receipt image first."); return; }
  if (!listIds.length)   { alert("Choose at least one list."); return; }

  const allowed = ["image/jpeg","image/png","image/webp","image/heic"];
  if (!allowed.includes(imageFile.type)) {
    alert("Use a JPG, PNG, WEBP, or HEIC image."); return;
  }
  if (imageFile.size > 10 * 1024 * 1024) {
    alert("Image must be smaller than 10 MB."); return;
  }

  const ext  = ["jpg","jpeg","png","webp","heic"]
    .includes(imageFile.name.split(".").pop()?.toLowerCase())
    ? imageFile.name.split(".").pop().toLowerCase() : "jpg";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  els.btnUploadReceipt.disabled = true;
  els.btnUploadReceipt.textContent = "Uploading...";

  try {
    const { error: upErr } = await supabase.storage
      .from("receipts").upload(path, imageFile, { contentType: imageFile.type, upsert: false });
    if (upErr) throw upErr;

    const { error: recErr } = await supabase.from("app_receipts").insert({
      buyer, list_ids: listIds,
      image_path: path, original_filename: imageFile.name,
      note: note || null,
    });
    if (recErr) {
      await supabase.storage.from("receipts").remove([path]);
      throw recErr;
    }

    clearReceiptForm();
    await loadReceipts();
    alert("Receipt uploaded successfully.");
  } catch (e) {
    console.error(e);
    alert("Could not upload the receipt. Please try again.");
  } finally {
    els.btnUploadReceipt.disabled = false;
    els.btnUploadReceipt.textContent = "Upload receipt";
  }
}

// ─── Delete receipt ───────────────────────────────────────────────────────────
async function deleteReceipt(receipt, btn) {
  if (!confirm(`Delete ${receipt.buyer}'s receipt from ${formatDate(receipt.created_at)}?\n\nThis cannot be undone.`)) return;
  btn.disabled = true;
  btn.textContent = "Deleting...";
  try {
    const { error: dbErr } = await supabase.from("app_receipts")
      .delete().eq("id", receipt.id);
    if (dbErr) throw dbErr;
    await supabase.storage.from("receipts").remove([receipt.image_path]);
    await loadReceipts();
  } catch (e) {
    console.error(e);
    alert("Could not delete this receipt.");
    btn.disabled = false;
    btn.textContent = "Delete receipt";
  }
}

// ─── Calculations modal ───────────────────────────────────────────────────────
function buildCalcModal(receipt, imageUrl) {
  const overlay = document.createElement("div");
  overlay.className = "calcOverlay";

  let mode = "split";
  let selectedSplitNames = [];
  let selectedOweName = "";

  overlay.innerHTML = `
    <div class="calcModal">
      <div class="calcModalHeader">
        <div class="calcModalTitle">
          💰 Calculations — ${escapeHtml(receipt.buyer)}'s receipt
        </div>
        <button class="calcModalClose" type="button">✕</button>
      </div>

      <img class="calcReceiptImg"
        src="${escapeHtml(imageUrl)}"
        alt="Receipt"
      />

      <div class="calcModeRow">
        <button class="calcModeBtn active" id="cmSplit" type="button">
          ÷ Split between people
        </button>
        <button class="calcModeBtn" id="cmOwe" type="button">
          → Someone owes
        </button>
      </div>

      <div class="calcSection" id="cmSplitSection">
        <div class="calcLabel">Who is splitting? (select all involved)</div>
        <div class="calcNameGrid" id="cmSplitNames"></div>
        <div class="calcLabel" style="margin-top:4px;">
          Total amount to split ($)
        </div>
        <input class="calcInput" id="cmSplitAmount" type="number"
          min="0.01" step="0.01" placeholder="e.g. 45.00" />
        <div class="calcLabel">Optional note</div>
        <textarea class="calcNoteInput" id="cmSplitNote"
          placeholder="e.g. chicken + rice + bread"></textarea>
        <div class="calcResult" id="cmSplitResult">
          Select people and enter an amount to see the split.
        </div>
      </div>

      <div class="calcSection" id="cmOweSection" style="display:none;">
        <div class="calcLabel">Who owes ${escapeHtml(receipt.buyer)}?</div>
        <div class="calcNameGrid" id="cmOweNames"></div>
        <div class="calcLabel" style="margin-top:4px;">Amount owed ($)</div>
        <input class="calcInput" id="cmOweAmount" type="number"
          min="0.01" step="0.01" placeholder="e.g. 18.00" />
        <div class="calcLabel">Optional note</div>
        <textarea class="calcNoteInput" id="cmOweNote"
          placeholder="e.g. half the cheese"></textarea>
        <div class="calcResult" id="cmOweResult">
          Select a person and enter an amount.
        </div>
      </div>

      <hr class="calcDivider" />

      <div class="calcHistoryTitle">Saved calculations for this receipt</div>
      <div id="cmHistory"></div>

      <hr class="calcDivider" />

      <div class="calcActions">
        <button class="calcBtn" id="cmCancel" type="button">Close</button>
        <button class="calcBtn primary" id="cmSave" type="button">Save calculation</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  function close() {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
    loadReceipts();
  }

  overlay.querySelector(".calcModalClose").addEventListener("click", close);
  overlay.querySelector("#cmCancel").addEventListener("click", close);
  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  // ── Mode buttons ──────────────────────────────────────────────────────────
  const btnSplit   = overlay.querySelector("#cmSplit");
  const btnOwe     = overlay.querySelector("#cmOwe");
  const splitSec   = overlay.querySelector("#cmSplitSection");
  const oweSec     = overlay.querySelector("#cmOweSection");

  btnSplit.addEventListener("click", () => {
    mode = "split";
    btnSplit.classList.add("active");
    btnOwe.classList.remove("active");
    splitSec.style.display = "";
    oweSec.style.display = "none";
  });

  btnOwe.addEventListener("click", () => {
    mode = "owe";
    btnOwe.classList.add("active");
    btnSplit.classList.remove("active");
    oweSec.style.display = "";
    splitSec.style.display = "none";
  });

  // ── Split name buttons ─────────────────────────────────────────────────────
  const splitNamesGrid = overlay.querySelector("#cmSplitNames");
  for (const name of ROOMMATES) {
    const btn = document.createElement("button");
    btn.className = "calcNameBtn";
    btn.type = "button";
    btn.textContent = name;
    btn.addEventListener("click", () => {
      if (selectedSplitNames.includes(name)) {
        selectedSplitNames = selectedSplitNames.filter(n => n !== name);
        btn.classList.remove("selected");
      } else {
        selectedSplitNames.push(name);
        btn.classList.add("selected");
      }
      updateSplitResult();
    });
    splitNamesGrid.appendChild(btn);
  }

  const splitAmountInput = overlay.querySelector("#cmSplitAmount");
  splitAmountInput.addEventListener("input", updateSplitResult);

  function updateSplitResult() {
    const amt = parseFloat(splitAmountInput.value);
    const res = overlay.querySelector("#cmSplitResult");
    const names = selectedSplitNames;

    if (!names.length || isNaN(amt) || amt <= 0) {
      res.textContent = "Select people and enter an amount to see the split.";
      return;
    }

    const perPerson = amt / names.length;
    const others = names.filter(n => n !== receipt.buyer);

    if (!others.length) {
      res.textContent = `${receipt.buyer} paid ${formatMoney(amt)} — no one else selected.`;
      return;
    }

    res.innerHTML = others
      .map(n => `<div>${escapeHtml(n)} owes ${escapeHtml(receipt.buyer)} <strong>${formatMoney(perPerson)}</strong></div>`)
      .join("");
  }

  // ── Owe name buttons ───────────────────────────────────────────────────────
  const oweNamesGrid = overlay.querySelector("#cmOweNames");
  for (const name of ROOMMATES.filter(n => n !== receipt.buyer)) {
    const btn = document.createElement("button");
    btn.className = "calcNameBtn";
    btn.type = "button";
    btn.textContent = name;
    btn.addEventListener("click", () => {
      if (selectedOweName === name) {
        selectedOweName = "";
        btn.classList.remove("selected");
      } else {
        selectedOweName = name;
        oweNamesGrid.querySelectorAll(".calcNameBtn")
          .forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      }
      updateOweResult();
    });
    oweNamesGrid.appendChild(btn);
  }

  const oweAmountInput = overlay.querySelector("#cmOweAmount");
  oweAmountInput.addEventListener("input", updateOweResult);

  function updateOweResult() {
    const amt = parseFloat(oweAmountInput.value);
    const res = overlay.querySelector("#cmOweResult");
    if (!selectedOweName || isNaN(amt) || amt <= 0) {
      res.textContent = "Select a person and enter an amount.";
      return;
    }
    res.innerHTML = `<div>${escapeHtml(selectedOweName)} owes ${escapeHtml(receipt.buyer)} <strong>${formatMoney(amt)}</strong></div>`;
  }

  // ── Save calculation ───────────────────────────────────────────────────────
  overlay.querySelector("#cmSave").addEventListener("click", async () => {
    const saveBtn = overlay.querySelector("#cmSave");

    if (mode === "split") {
      const amt   = parseFloat(splitAmountInput.value);
      const names = selectedSplitNames;
      const note  = overlay.querySelector("#cmSplitNote").value.trim();

      if (!names.length) { alert("Select at least one person for the split."); return; }
      if (isNaN(amt) || amt <= 0) { alert("Enter a valid amount."); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        const { error } = await supabase
          .from("app_receipt_calculations")
          .insert({
            receipt_id:   receipt.id,
            mode:         "split",
            split_names:  names,
            owe_name:     null,
            amount:       amt,
            note:         note || null,
          });
        if (error) throw error;
        splitAmountInput.value = "";
        overlay.querySelector("#cmSplitNote").value = "";
        selectedSplitNames = [];
        splitNamesGrid.querySelectorAll(".calcNameBtn")
          .forEach(b => b.classList.remove("selected"));
        updateSplitResult();
        await renderHistory();
        alert("Split saved.");
      } catch (e) {
        console.error(e);
        alert("Could not save. Try again.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save calculation";
      }

    } else {
      const amt  = parseFloat(oweAmountInput.value);
      const name = selectedOweName;
      const note = overlay.querySelector("#cmOweNote").value.trim();

      if (!name) { alert("Select who owes."); return; }
      if (isNaN(amt) || amt <= 0) { alert("Enter a valid amount."); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        const { error } = await supabase
          .from("app_receipt_calculations")
          .insert({
            receipt_id:  receipt.id,
            mode:        "owe",
            split_names: null,
            owe_name:    name,
            amount:      amt,
            note:        note || null,
          });
        if (error) throw error;
        oweAmountInput.value = "";
        overlay.querySelector("#cmOweNote").value = "";
        selectedOweName = "";
        oweNamesGrid.querySelectorAll(".calcNameBtn")
          .forEach(b => b.classList.remove("selected"));
        updateOweResult();
        await renderHistory();
        alert("Owe entry saved.");
      } catch (e) {
        console.error(e);
        alert("Could not save. Try again.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save calculation";
      }
    }
  });

  // ── History ────────────────────────────────────────────────────────────────
  async function renderHistory() {
    const histDiv = overlay.querySelector("#cmHistory");
    histDiv.innerHTML = `<div style="font-size:12px;color:#5b6a5b;">Loading...</div>`;

    const { data: calcs, error } = await supabase
      .from("app_receipt_calculations")
      .select("*")
      .eq("receipt_id", receipt.id)
      .order("created_at", { ascending: true });

    if (error) {
      histDiv.innerHTML = `<div style="font-size:12px;color:#b03a2e;">Could not load calculations.</div>`;
      return;
    }

    if (!calcs?.length) {
      histDiv.innerHTML = `<div style="font-size:12px;color:#5b6a5b;">No calculations saved yet.</div>`;
      return;
    }

    histDiv.innerHTML = "";
    for (const calc of calcs) {
      const row = document.createElement("div");
      row.className = "calcHistoryItem";

      let desc = "";
      if (calc.mode === "split") {
        const perPerson = (calc.amount / calc.split_names.length).toFixed(2);
        const others = calc.split_names.filter(n => n !== receipt.buyer);
        desc = `Split ${formatMoney(calc.amount)} among ${calc.split_names.join(", ")} → each owes ${formatMoney(perPerson)}${others.length ? ` (${others.join(", ")} → ${receipt.buyer})` : ""}`;
      } else {
        desc = `${calc.owe_name} owes ${receipt.buyer} ${formatMoney(calc.amount)}`;
      }

      if (calc.note) desc += ` — ${calc.note}`;

      row.innerHTML = `
        <span>${escapeHtml(desc)}</span>
        <button class="calcHistoryDelete" type="button" title="Delete">✕</button>
      `;

      row.querySelector(".calcHistoryDelete").addEventListener("click", async () => {
        if (!confirm("Delete this calculation entry?")) return;
        const { error: delErr } = await supabase
          .from("app_receipt_calculations")
          .delete()
          .eq("id", calc.id);
        if (delErr) { alert("Could not delete."); return; }
        await renderHistory();
      });

      histDiv.appendChild(row);
    }
  }

  renderHistory();
}

// ─── Build owe summary table ──────────────────────────────────────────────────
function buildOweSummary(calcs, buyer) {
  const totals = new Map();

  for (const calc of calcs) {
    if (calc.mode === "split") {
      const perPerson = calc.amount / calc.split_names.length;
      for (const name of calc.split_names) {
        if (name === buyer) continue;
        totals.set(name, (totals.get(name) ?? 0) + perPerson);
      }
    } else {
      totals.set(calc.owe_name, (totals.get(calc.owe_name) ?? 0) + calc.amount);
    }
  }

  if (!totals.size) return null;

  const table = document.createElement("table");
  table.className = "oweSummaryTable";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Person</th>
        <th>Owes</th>
        <th>To</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  for (const [name, amount] of [...totals.entries()].sort()) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(name)}</td>
      <td><strong>${formatMoney(amount)}</strong></td>
      <td>${escapeHtml(buyer)}</td>
    `;
    tbody.appendChild(tr);
  }

  return table;
}

// ─── Load + render receipts ───────────────────────────────────────────────────
async function loadReceipts() {
  els.receiptGallery.innerHTML = `<div class="smallHint">Loading receipts...</div>`;

  const { data: receipts, error } = await supabase
    .from("app_receipts")
    .select("id, buyer, list_ids, image_path, original_filename, note, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    els.receiptGallery.innerHTML = `<div class="empty">Could not load receipts.</div>`;
    return;
  }

  if (!receipts?.length) {
    els.receiptGallery.innerHTML = `
      <div class="empty">No receipts uploaded yet.</div>
    `;
    return;
  }

  const listNameById = new Map(lists.map(l => [l.id, l.display_name]));

  const calcsByReceipt = new Map();
  const receiptIds = receipts.map(r => r.id);
  const { data: allCalcs } = await supabase
    .from("app_receipt_calculations")
    .select("*")
    .in("receipt_id", receiptIds);

  for (const calc of allCalcs ?? []) {
    if (!calcsByReceipt.has(calc.receipt_id)) {
      calcsByReceipt.set(calc.receipt_id, []);
    }
    calcsByReceipt.get(calc.receipt_id).push(calc);
  }

  els.receiptGallery.innerHTML = "";

  for (const receipt of receipts) {
    const { data: urlData } = supabase.storage
      .from("receipts").getPublicUrl(receipt.image_path);
    const imageUrl = urlData.publicUrl;

    const listTags = (receipt.list_ids ?? [])
      .map(id => listNameById.get(id) ?? "?")
      .map(n => `<span class="receiptListTag">${escapeHtml(n)}</span>`)
      .join("");

    const card = document.createElement("article");
    card.className = "receiptCard";

    card.innerHTML = `
      <a class="receiptImageLink"
        href="${escapeHtml(imageUrl)}"
        target="_blank" rel="noopener noreferrer"
        title="Open full-size receipt">
        <img class="receiptImage"
          src="${escapeHtml(imageUrl)}"
          alt="Receipt by ${escapeHtml(receipt.buyer)}"
          loading="lazy" />
      </a>

      <div class="receiptInfo">
        <div class="receiptTitle">${escapeHtml(receipt.buyer)}'s receipt</div>
        <div class="receiptMeta">Uploaded ${escapeHtml(formatDate(receipt.created_at))}</div>
        ${receipt.note ? `<div class="receiptMeta" style="margin-top:6px;">${escapeHtml(receipt.note)}</div>` : ""}
        <div class="receiptLists" style="margin-top:8px;">${listTags}</div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="calcBtn" type="button" data-calc>
            💰 Calculations
          </button>
          <button class="calcBtn" type="button"
            style="color:#b03a2e;" data-delete>
            Delete receipt
          </button>
        </div>

        <div class="calcOweSummary" style="margin-top:10px;"></div>
      </div>
    `;

    // Calculations modal button
    card.querySelector("[data-calc]").addEventListener("click", () => {
      buildCalcModal(receipt, imageUrl);
    });

    // Delete button
    const delBtn = card.querySelector("[data-delete]");
    delBtn.addEventListener("click", () => deleteReceipt(receipt, delBtn));

    // Owe summary table
    const calcs = calcsByReceipt.get(receipt.id) ?? [];
    const summaryContainer = card.querySelector(".calcOweSummary");
    if (calcs.length) {
      const table = buildOweSummary(calcs, receipt.buyer);
      if (table) {
        const title = document.createElement("div");
        title.style.cssText = "font-size:12px;font-weight:800;color:#5b6a5b;margin-bottom:6px;";
        title.textContent = "What everyone owes";
        summaryContainer.appendChild(title);
        summaryContainer.appendChild(table);
      }
    }

    els.receiptGallery.appendChild(card);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
els.tabReceipts.addEventListener("click", openReceiptTab);
[els.tabView, els.tabEdit, els.tabLog].forEach(tab => {
  tab.addEventListener("click", hideReceiptTab);
});
els.btnUploadReceipt.addEventListener("click", uploadReceipt);
els.btnRefreshReceipts.addEventListener("click", loadReceipts);

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try { await loadLists(); } catch (e) { console.error(e); }
}

init();
