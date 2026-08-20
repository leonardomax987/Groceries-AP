import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LIST_ORDER = [
  { slug: "main", label: "Main (Shared)" },
  { slug: "marcos", label: "Marcos" },
  { slug: "leo", label: "Leo" },
  { slug: "rafa", label: "Rafa" },
  { slug: "alex", label: "Alex" },
  { slug: "igor", label: "Igor" },
];

const FOOD_BASE = [
  { baseKey: "arroz", namePT: "arroz", nameEN: "rice", variants: ["arroz", "rice"] },
  { baseKey: "massa", namePT: "massa", nameEN: "pasta", variants: ["massa", "massas", "macarrao", "macarrão", "pasta"] },
  { baseKey: "sal", namePT: "sal", nameEN: "salt", variants: ["sal", "salt"] },
  { baseKey: "azeite", namePT: "azeite", nameEN: "olive oil", variants: ["azeite", "olive oil", "oleo de oliva", "óleo de oliva", "oleo oliva"] },
  { baseKey: "cebola", namePT: "cebola", nameEN: "onion", variants: ["cebola", "onion", "onions"] },
  { baseKey: "tomate", namePT: "tomate", nameEN: "tomato", variants: ["tomate", "tomato", "tomatoes"] },
  { baseKey: "banana", namePT: "banana", nameEN: "banana", variants: ["banana", "bananas"] },
  { baseKey: "limao", namePT: "limão", nameEN: "lime / lemon", variants: ["limao", "limão", "lime", "lemon"] },
  { baseKey: "morango", namePT: "morango", nameEN: "strawberry", variants: ["morango", "strawberry", "strawberries"] },
  { baseKey: "uva", namePT: "uva", nameEN: "grape", variants: ["uva", "grape", "grapes"] },
  { baseKey: "pimentao", namePT: "pimentão", nameEN: "bell pepper", variants: ["pimentao", "pimentão", "bell pepper", "pepper", "peppers"] },
  { baseKey: "ovo", namePT: "ovo", nameEN: "egg", variants: ["ovo", "ovos", "egg", "eggs"] },
  { baseKey: "queijo", namePT: "queijo", nameEN: "cheese", variants: ["queijo", "cheese", "cheeses"] },
  { baseKey: "pao", namePT: "pão", nameEN: "bread", variants: ["pao", "pão", "bread", "breads"] },
  { baseKey: "manteiga", namePT: "manteiga", nameEN: "butter", variants: ["manteiga", "butter"] },
  { baseKey: "yogurte_grego", namePT: "iogurte grego", nameEN: "greek yogurt", variants: ["iogurte grego", "iogurte", "yogurte grego", "greek yogurt", "yogurt", "yogurt grego"] },
  { baseKey: "batata", namePT: "batata", nameEN: "potato", variants: ["batata", "potato", "potatoes"] },
  { baseKey: "cenoura", namePT: "cenoura", nameEN: "carrot", variants: ["cenoura", "carrot", "carrots"] },
];

function normalizeText(value) {
  return (value ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const variantMap = new Map();

for (const food of FOOD_BASE) {
  for (const variant of food.variants) {
    variantMap.set(normalizeText(variant), food);
  }
}

const els = {
  tabView: document.getElementById("tabView"),
  tabEdit: document.getElementById("tabEdit"),
  tabLog: document.getElementById("tabLog"),

  viewArea: document.getElementById("viewArea"),
  editArea: document.getElementById("editArea"),
  logArea: document.getElementById("logArea"),

  columnsGrid: document.getElementById("columnsGrid"),
  targetListSelect: document.getElementById("targetListSelect"),
  addInput: document.getElementById("addInput"),
  btnAdd: document.getElementById("btnAdd"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnRefreshLog: document.getElementById("btnRefreshLog"),
  logGrid: document.getElementById("logGrid"),
};

const STATE = {
  lists: [],
  listIdBySlug: new Map(),
  catalogByBaseKey: new Map(),
  itemsByListId: new Map(),
};

function setTab(tabName) {
  const tabMap = {
    view: { tab: els.tabView, area: els.viewArea },
    edit: { tab: els.tabEdit, area: els.editArea },
    log: { tab: els.tabLog, area: els.logArea },
  };

  for (const [name, entry] of Object.entries(tabMap)) {
    const active = name === tabName;
    entry.tab.setAttribute("aria-selected", String(active));
    entry.area.classList.toggle("active", active);
  }

  if (tabName === "log") {
    renderLogTab();
  }
}

els.tabView.addEventListener("click", () => setTab("view"));
els.tabEdit.addEventListener("click", () => setTab("edit"));
els.tabLog.addEventListener("click", () => setTab("log"));

els.btnRefresh.addEventListener("click", () => loadAll());
els.btnRefreshLog.addEventListener("click", () => renderLogTab());

document.addEventListener("click", () => {
  document.querySelectorAll(".moveMenu.open").forEach(menu => {
    menu.classList.remove("open");
  });
});

async function loadLists() {
  const { data, error } = await supabase
    .from("app_lists")
    .select("id, slug, display_name, kind")
    .order("created_at", { ascending: true });

  if (error) throw error;

  STATE.lists = data ?? [];
  STATE.listIdBySlug.clear();

  for (const list of STATE.lists) {
    STATE.listIdBySlug.set(list.slug, list.id);
  }
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from("app_food_catalog")
    .select("id, base_key, name_pt, name_en");

  if (error) throw error;

  STATE.catalogByBaseKey.clear();

  for (const item of data ?? []) {
    STATE.catalogByBaseKey.set(item.base_key, item);
  }
}

async function loadItemsWithState() {
  const listIds = STATE.lists.map(list => list.id);

  if (listIds.length === 0) {
    STATE.itemsByListId = new Map();
    return;
  }

  const { data, error } = await supabase
    .from("app_list_items")
    .select(`
      id,
      list_id,
      catalog_id,
      custom_text,
      app_food_catalog (
        base_key,
        name_pt,
        name_en
      ),
      app_list_item_state (
        checked,
        checked_at,
        updated_at
      )
    `)
    .in("list_id", listIds);

  if (error) throw error;

  const byList = new Map();

  for (const listId of listIds) {
    byList.set(listId, []);
  }

  for (const item of data ?? []) {
    byList.get(item.list_id)?.push(item);
  }

  STATE.itemsByListId = byList;
}

async function loadAll() {
  try {
    await loadLists();
    await loadCatalog();
    await loadItemsWithState();

    populateEditSelect();
    renderColumns();
  } catch (error) {
    console.error(error);
    alert("Could not load the grocery lists. Check your Supabase connection and policies.");
  }
}

function populateEditSelect() {
  const selectedValue = els.targetListSelect.value;

  els.targetListSelect.innerHTML = "";

  for (const list of STATE.lists) {
    const option = document.createElement("option");
    option.value = list.slug;
    option.textContent = list.display_name;
    els.targetListSelect.appendChild(option);
  }

  if ([...els.targetListSelect.options].some(option => option.value === selectedValue)) {
    els.targetListSelect.value = selectedValue;
  }
}

function itemDisplayName(item) {
  if (item.catalog_id) {
    return item.app_food_catalog?.name_pt ?? item.app_food_catalog?.base_key ?? "Item";
  }

  return item.custom_text ?? "Item";
}

function itemMetaText(item) {
  if (!item.catalog_id) return "custom item";

  const catalog = item.app_food_catalog;
  return `${catalog?.name_pt ?? ""} / ${catalog?.name_en ?? ""}`.trim();
}

function isArchivedToLog(item) {
  const state = item.app_list_item_state;

  if (!state?.checked || !state.checked_at) return false;

  const checkedDay = state.checked_at.slice(0, 10);
  return checkedDay < localDateString();
}

function sortedItems(items) {
  return [...items].sort((a, b) =>
    itemDisplayName(a).localeCompare(itemDisplayName(b), "pt-BR")
  );
}

function isListComplete(items) {
  return items.length > 0 && items.every(item => item.app_list_item_state?.checked);
}

function renderColumns() {
  els.columnsGrid.innerHTML = "";

  for (const column of LIST_ORDER) {
    const listId = STATE.listIdBySlug.get(column.slug);
    const allItems = STATE.itemsByListId.get(listId) ?? [];
    const visibleItems = sortedItems(allItems.filter(item => !isArchivedToLog(item)));

    const checkedCount = visibleItems.filter(item => item.app_list_item_state?.checked).length;
    const completed = isListComplete(visibleItems);

    const colEl = document.createElement("section");
    colEl.className = "col";

    colEl.innerHTML = `
      <div class="colHead">
        <div class="colName">
          <div>${escapeHtml(column.label)}</div>
          <div class="count">${checkedCount}/${visibleItems.length} checked</div>
        </div>

        <div class="seal ${completed ? "on" : ""}">
          <span>●</span>
          <span>${completed ? "Sealed ✓" : ""}</span>
        </div>
      </div>

      <div class="items"></div>
    `;

    const itemsContainer = colEl.querySelector(".items");

    if (visibleItems.length === 0) {
      itemsContainer.innerHTML = `
        <div class="empty">
          No active items. Add groceries in Edit / Add.
        </div>
      `;
    } else {
      for (const item of visibleItems) {
        itemsContainer.appendChild(createItemElement(item, column));
      }
    }

    els.columnsGrid.appendChild(colEl);
  }
}

function createItemElement(item, currentColumn) {
  const checked = Boolean(item.app_list_item_state?.checked);
  const name = itemDisplayName(item);
  const meta = itemMetaText(item);

  const itemEl = document.createElement("div");
  itemEl.className = `item ${checked ? "checked" : ""}`;

  itemEl.innerHTML = `
    <input class="check" type="checkbox" ${checked ? "checked" : ""} aria-label="Check ${escapeHtml(name)}" />

    <div class="itemLabel">
      <div class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="meta">${escapeHtml(meta)}</div>
    </div>

    <div class="moreMenu">
      <button class="moreBtn" type="button" title="Move item">⋮</button>
      <div class="moveMenu">
        <div class="moveMenuTitle">Move to list</div>
      </div>
    </div>

    <button class="deleteBtn" type="button" title="Remove item">×</button>
  `;

  const checkbox = itemEl.querySelector(".check");
  const deleteButton = itemEl.querySelector(".deleteBtn");
  const moreButton = itemEl.querySelector(".moreBtn");
  const moveMenu = itemEl.querySelector(".moveMenu");

  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;

    try {
      await setChecked(
        item.id,
        checkbox.checked,
        item.list_id,
        item.catalog_id,
        item.custom_text
      );

      await loadAll();
    } catch (error) {
      console.error(error);
      alert("Could not update this item.");
      checkbox.checked = !checkbox.checked;
    } finally {
      checkbox.disabled = false;
    }
  });

  deleteButton.addEventListener("click", async () => {
    const shouldDelete = confirm(`Remove "${name}" from ${currentColumn.label}?`);

    if (!shouldDelete) return;

    deleteButton.disabled = true;

    try {
      const { error } = await supabase
        .from("app_list_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      await loadAll();
    } catch (error) {
      console.error(error);
      alert("Could not remove this item. Confirm that you ran the Supabase policy update.");
    } finally {
      deleteButton.disabled = false;
    }
  });

  moreButton.addEventListener("click", event => {
    event.stopPropagation();

    document.querySelectorAll(".moveMenu.open").forEach(menu => {
      if (menu !== moveMenu) menu.classList.remove("open");
    });

    moveMenu.classList.toggle("open");
  });

  moveMenu.addEventListener("click", event => event.stopPropagation());

  for (const destination of LIST_ORDER) {
    if (destination.slug === currentColumn.slug) continue;

    const option = document.createElement("button");
    option.className = "moveOption";
    option.type = "button";
    option.textContent = destination.label;

    option.addEventListener("click", async () => {
      const destinationListId = STATE.listIdBySlug.get(destination.slug);

      if (!destinationListId) {
        alert("Destination list not found.");
        return;
      }

      moreButton.disabled = true;
      moveMenu.classList.remove("open");

      try {
        await moveItemToList(item, destinationListId, destination.label);
        await loadAll();
      } catch (error) {
        console.error(error);
        alert("Could not move the item.");
      } finally {
        moreButton.disabled = false;
      }
    });

    moveMenu.appendChild(option);
  }

  return itemEl;
}

async function setChecked(listItemId, checked, listId, catalogId, customText) {
  const now = new Date();

  const { error: stateError } = await supabase
    .from("app_list_item_state")
    .upsert({
      list_item_id: listItemId,
      checked,
      checked_at: checked ? now.toISOString() : null,
      updated_at: now.toISOString(),
    }, { onConflict: "list_item_id" });

  if (stateError) throw stateError;

  const { error: logError } = await supabase
    .from("app_list_item_log")
    .insert({
      list_item_id: listItemId,
      list_id: listId,
      catalog_id: catalogId ?? null,
      custom_text: catalogId ? null : customText,
      event_type: checked ? "checked" : "unchecked",
      event_at: localDateString(now),
    });

  if (logError) throw logError;
}

async function ensureStateRow(listItemId) {
  const { data, error } = await supabase
    .from("app_list_item_state")
    .select("list_item_id")
    .eq("list_item_id", listItemId)
    .maybeSingle();

  if (error) throw error;
  if (data?.list_item_id) return;

  const { error: insertError } = await supabase
    .from("app_list_item_state")
    .insert({
      list_item_id: listItemId,
      checked: false,
      checked_at: null,
    });

  if (insertError) throw insertError;
}

async function moveItemToList(item, destinationListId, destinationLabel) {
  const itemName = itemDisplayName(item);
  const shouldMove = confirm(`Move "${itemName}" to ${destinationLabel}?`);

  if (!shouldMove) return;

  let duplicateQuery = supabase
    .from("app_list_items")
    .select("id")
    .eq("list_id", destinationListId);

  if (item.catalog_id) {
    duplicateQuery = duplicateQuery.eq("catalog_id", item.catalog_id);
  } else {
    duplicateQuery = duplicateQuery.eq("custom_text", item.custom_text);
  }

  const { data: existingItem, error: duplicateError } = await duplicateQuery.maybeSingle();

  if (duplicateError) throw duplicateError;

  if (existingItem?.id && existingItem.id !== item.id) {
    await ensureStateRow(existingItem.id);

    const { error: logMoveError } = await supabase
      .from("app_list_item_log")
      .update({
        list_item_id: existingItem.id,
        list_id: destinationListId,
      })
      .eq("list_item_id", item.id);

    if (logMoveError) throw logMoveError;

    if (item.app_list_item_state?.checked) {
      const { error: stateMergeError } = await supabase
        .from("app_list_item_state")
        .upsert({
          list_item_id: existingItem.id,
          checked: true,
          checked_at: item.app_list_item_state.checked_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "list_item_id" });

      if (stateMergeError) throw stateMergeError;
    }

    const { error: deleteError } = await supabase
      .from("app_list_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) throw deleteError;

    return;
  }

  const { error: moveError } = await supabase
    .from("app_list_items")
    .update({
      list_id: destinationListId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id);

  if (moveError) throw moveError;

  const { error: logListUpdateError } = await supabase
    .from("app_list_item_log")
    .update({ list_id: destinationListId })
    .eq("list_item_id", item.id);

  if (logListUpdateError) throw logListUpdateError;
}

async function findOrCreateCatalogItem(listId, catalogId) {
  const { data: existing, error: lookupError } = await supabase
    .from("app_list_items")
    .select("id")
    .eq("list_id", listId)
    .eq("catalog_id", catalogId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    await ensureStateRow(existing.id);
    return { id: existing.id, merged: true };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("app_list_items")
    .insert({
      list_id: listId,
      catalog_id: catalogId,
      custom_text: null,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  await ensureStateRow(inserted.id);
  return { id: inserted.id, merged: false };
}

async function findOrCreateCustomItem(listId, normalizedText) {
  const { data: existing, error: lookupError } = await supabase
    .from("app_list_items")
    .select("id")
    .eq("list_id", listId)
    .eq("custom_text", normalizedText)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.id) {
    await ensureStateRow(existing.id);
    return { id: existing.id, merged: true };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("app_list_items")
    .insert({
      list_id: listId,
      catalog_id: null,
      custom_text: normalizedText,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  await ensureStateRow(inserted.id);
  return { id: inserted.id, merged: false };
}

async function addItems() {
  const rawText = els.addInput.value.trim();

  if (!rawText) {
    alert("Type at least one grocery item first.");
    return;
  }

  const chosenSlug = els.targetListSelect.value;
  const chosenListId = STATE.listIdBySlug.get(chosenSlug);

  if (!chosenListId) {
    alert("Selected list not found.");
    return;
  }

  const uniqueEntries = [...new Set(
    rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  )];

  let addedCount = 0;
  let mergedCount = 0;
  const failures = [];

  els.btnAdd.disabled = true;
  els.btnAdd.textContent = "Adding...";

  for (const rawEntry of uniqueEntries) {
    try {
      const normalized = normalizeText(rawEntry);
      const matchedFood = variantMap.get(normalized);
      let finalListId = chosenListId;

      if (matchedFood && chosenSlug !== "main") {
        const chosenListName = STATE.lists.find(list => list.slug === chosenSlug)?.display_name ?? chosenSlug;

        const addToMain = confirm(
          `"${matchedFood.namePT} / ${matchedFood.nameEN}" is a shared-base food.\n\n` +
          `Add it to Main (Shared)?\n\n` +
          `OK = Main (Shared)\n` +
          `Cancel = Keep in ${chosenListName}`
        );

        if (addToMain) {
          finalListId = STATE.listIdBySlug.get("main");
        }
      }

      let result;

      if (matchedFood) {
        const catalogRow = STATE.catalogByBaseKey.get(matchedFood.baseKey);

        if (!catalogRow) {
          throw new Error(`Catalog row missing for ${matchedFood.baseKey}`);
        }

        result = await findOrCreateCatalogItem(finalListId, catalogRow.id);
      } else {
        result = await findOrCreateCustomItem(finalListId, normalized);
      }

      if (result.merged) {
        mergedCount++;
      } else {
        addedCount++;
      }
    } catch (error) {
      console.error(`Could not add "${rawEntry}"`, error);
      failures.push(rawEntry);
    }
  }

  els.addInput.value = "";

  await loadAll();

  if ([...els.targetListSelect.options].some(option => option.value === chosenSlug)) {
    els.targetListSelect.value = chosenSlug;
  }

  setTab("edit");

  els.btnAdd.disabled = false;
  els.btnAdd.textContent = "Add items";

  let message = `${addedCount} item${addedCount === 1 ? "" : "s"} added.`;

  if (mergedCount > 0) {
    message += ` ${mergedCount} duplicate${mergedCount === 1 ? "" : "s"} merged.`;
  }

  if (failures.length > 0) {
    message += ` Could not add: ${failures.join(", ")}.`;
  }

  alert(message);
}

els.btnAdd.addEventListener("click", async () => {
  try {
    await addItems();
  } catch (error) {
    console.error(error);
    els.btnAdd.disabled = false;
    els.btnAdd.textContent = "Add items";
    alert("Could not add the grocery items.");
  }
});

async function renderLogTab() {
  els.logGrid.innerHTML = `<div class="smallHint">Loading log...</div>`;

  if (STATE.lists.length === 0) {
    await loadLists();
  }

  const listIds = STATE.lists.map(list => list.id);

  if (listIds.length === 0) {
    els.logGrid.innerHTML = `<div class="empty">No lists found.</div>`;
    return;
  }

  const { data: logs, error } = await supabase
    .from("app_list_item_log")
    .select(`
      id,
      list_id,
      catalog_id,
      custom_text,
      event_type,
      event_at,
      created_at,
      app_food_catalog (
        name_pt,
        name_en
      )
    `)
    .in("list_id", listIds)
    .order("event_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    els.logGrid.innerHTML = `<div class="empty">Could not load the log.</div>`;
    return;
  }

  const logsBySlug = new Map();

  for (const column of LIST_ORDER) {
    logsBySlug.set(column.slug, []);
  }

  for (const log of logs ?? []) {
    const list = STATE.lists.find(item => item.id === log.list_id);

    if (list) {
      logsBySlug.get(list.slug)?.push(log);
    }
  }

  els.logGrid.innerHTML = "";

  for (const column of LIST_ORDER) {
    const entries = logsBySlug.get(column.slug) ?? [];

    const logColumn = document.createElement("section");
    logColumn.className = "logCol";
    logColumn.innerHTML = `
      <h3>${escapeHtml(column.label)}</h3>
      <div class="logScroll"></div>
    `;

    const scroll = logColumn.querySelector(".logScroll");

    if (entries.length === 0) {
      scroll.innerHTML = `<div class="empty">No log entries yet.</div>`;
    } else {
      for (const entry of entries) {
        const name = entry.catalog_id
          ? (entry.app_food_catalog?.name_pt ?? "Item")
          : (entry.custom_text ?? "Item");

        const action = entry.event_type === "checked" ? "✓ Checked" : "↩ Unchecked";

        const line = document.createElement("div");
        line.className = "logLine";
        line.innerHTML = `
          <span class="logItemName" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
          <span class="tag ${entry.event_type}">${action} · ${escapeHtml(entry.event_at)}</span>
        `;

        scroll.appendChild(line);
      }
    }

    els.logGrid.appendChild(logColumn);
  }
}

loadAll();
