import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  tabReceipts: document.getElementById("tabReceipts"),
  tabView: document.getElementById("tabView"),
  tabEdit: document.getElementById("tabEdit"),
  tabLog: document.getElementById("tabLog"),

  receiptArea: document.getElementById("receiptArea"),
  viewArea: document.getElementById("viewArea"),
  editArea: document.getElementById("editArea"),
  logArea: document.getElementById("logArea"),

  receiptBuyer: document.getElementById("receiptBuyer"),
  receiptImageInput: document.getElementById("receiptImageInput"),
  receiptListChoices: document.getElementById("receiptListChoices"),
  receiptNote: document.getElementById("receiptNote"),
  btnUploadReceipt: document.getElementById("btnUploadReceipt"),
  btnRefreshReceipts: document.getElementById("btnRefreshReceipts"),
  receiptGallery: document.getElementById("receiptGallery"),
};

let lists = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateValue));
}

function hideReceiptTab() {
  els.receiptArea.classList.remove("active");
  els.tabReceipts.setAttribute("aria-selected", "false");
}

function openReceiptTab() {
  els.viewArea.classList.remove("active");
  els.editArea.classList.remove("active");
  els.logArea.classList.remove("active");

  els.tabView.setAttribute("aria-selected", "false");
  els.tabEdit.setAttribute("aria-selected", "false");
  els.tabLog.setAttribute("aria-selected", "false");

  els.receiptArea.classList.add("active");
  els.tabReceipts.setAttribute("aria-selected", "true");

  loadReceipts();
}

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
    .map(input => input.value);
}

function clearReceiptForm() {
  els.receiptBuyer.value = "";
  els.receiptImageInput.value = "";
  els.receiptNote.value = "";

  els.receiptListChoices.querySelectorAll("input:checked")
    .forEach(input => {
      input.checked = false;
    });
}

async function uploadReceipt() {
  const buyer = els.receiptBuyer.value;
  const imageFile = els.receiptImageInput.files?.[0];
  const listIds = selectedListIds();
  const note = els.receiptNote.value.trim();

  if (!buyer) {
    alert("Choose who bought the groceries.");
    return;
  }

  if (!imageFile) {
    alert("Choose a receipt image first.");
    return;
  }

  if (listIds.length === 0) {
    alert("Choose at least one list that was bought.");
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ];

  if (!allowedTypes.includes(imageFile.type)) {
    alert("Use a JPG, PNG, WEBP, or HEIC image.");
    return;
  }

  if (imageFile.size > 10 * 1024 * 1024) {
    alert("The receipt image must be smaller than 10 MB.");
    return;
  }

  const originalExtension = imageFile.name.includes(".")
    ? imageFile.name.split(".").pop().toLowerCase()
    : "jpg";

  const safeExtension = ["jpg", "jpeg", "png", "webp", "heic"]
    .includes(originalExtension)
    ? originalExtension
    : "jpg";

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${safeExtension}`;

  els.btnUploadReceipt.disabled = true;
  els.btnUploadReceipt.textContent = "Uploading...";

  try {
    const { error: uploadError } = await supabase
      .storage
      .from("receipts")
      .upload(path, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: receiptError } = await supabase
      .from("app_receipts")
      .insert({
        buyer,
        list_ids: listIds,
        image_path: path,
        original_filename: imageFile.name,
        note: note || null,
      });

    if (receiptError) throw receiptError;

    clearReceiptForm();
    await loadReceipts();

    alert("Receipt uploaded successfully.");
  } catch (error) {
    console.error(error);
    alert("Could not upload the receipt. Please try again.");
  } finally {
    els.btnUploadReceipt.disabled = false;
    els.btnUploadReceipt.textContent = "Upload receipt";
  }
}

async function loadReceipts() {
  els.receiptGallery.innerHTML = `<div class="smallHint">Loading receipts...</div>`;

  const { data: receipts, error } = await supabase
    .from("app_receipts")
    .select("id, buyer, list_ids, image_path, original_filename, note, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    els.receiptGallery.innerHTML = `
      <div class="empty">Could not load receipts. Refresh and try again.</div>
    `;
    return;
  }

  if (!receipts?.length) {
    els.receiptGallery.innerHTML = `
      <div class="empty">
        No receipts uploaded yet. Upload the first grocery receipt above.
      </div>
    `;
    return;
  }

  const listNameById = new Map(
    lists.map(list => [list.id, list.display_name])
  );

  els.receiptGallery.innerHTML = "";

  for (const receipt of receipts) {
    const { data: publicUrlData } = supabase
      .storage
      .from("receipts")
      .getPublicUrl(receipt.image_path);

    const imageUrl = publicUrlData.publicUrl;

    const listTags = (receipt.list_ids ?? [])
      .map(id => listNameById.get(id) ?? "Unknown list")
      .map(name => `<span class="receiptListTag">${escapeHtml(name)}</span>`)
      .join("");

    const card = document.createElement("article");
    card.className = "receiptCard";

    card.innerHTML = `
      <a
        class="receiptImageLink"
        href="${escapeHtml(imageUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        title="Open full-size receipt"
      >
        <img
          class="receiptImage"
          src="${escapeHtml(imageUrl)}"
          alt="Receipt uploaded by ${escapeHtml(receipt.buyer)}"
          loading="lazy"
        />
      </a>

      <div class="receiptInfo">
        <div class="receiptTitle">${escapeHtml(receipt.buyer)}'s receipt</div>

        <div class="receiptMeta">
          Uploaded ${escapeHtml(formatDate(receipt.created_at))}
        </div>

        ${receipt.note ? `
          <div class="receiptMeta" style="margin-top: 8px;">
            ${escapeHtml(receipt.note)}
          </div>
        ` : ""}

        <div class="receiptLists">${listTags}</div>
      </div>
    `;

    els.receiptGallery.appendChild(card);
  }
}

els.tabReceipts.addEventListener("click", openReceiptTab);

[els.tabView, els.tabEdit, els.tabLog].forEach(tab => {
  tab.addEventListener("click", hideReceiptTab);
});

els.btnUploadReceipt.addEventListener("click", uploadReceipt);
els.btnRefreshReceipts.addEventListener("click", loadReceipts);

async function init() {
  try {
    await loadLists();
  } catch (error) {
    console.error(error);
  }
}

init();
