import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LIST_ORDER = [
  { slug: "main",   label: "Main (Shared)" },
  { slug: "marcos", label: "Marcos" },
  { slug: "leo",    label: "Leo" },
  { slug: "rafa",   label: "Rafa" },
  { slug: "alex",   label: "Alex" },
  { slug: "igor",   label: "Igor" },
];

const FOOD_BASE = [
  { baseKey:"arroz",        namePT:"arroz",         nameEN:"rice",         variants:["arroz","rice"] },
  { baseKey:"massa",        namePT:"massa",         nameEN:"pasta",        variants:["massa","massas","pasta"] },
  { baseKey:"sal",          namePT:"sal",           nameEN:"salt",         variants:["sal","salt"] },
  { baseKey:"azeite",       namePT:"azeite",        nameEN:"olive oil",    variants:["azeite","olive oil","oleo de oliva","oleo oliva"] },
  { baseKey:"cebola",       namePT:"cebola",        nameEN:"onion",        variants:["cebola","onion","onions"] },
  { baseKey:"tomate",       namePT:"tomate",        nameEN:"tomato",       variants:["tomate","tomato","tomatoes"] },
  { baseKey:"banana",       namePT:"banana",        nameEN:"banana",       variants:["banana","bananas"] },
  { baseKey:"limao",        namePT:"limao",         nameEN:"lime / lemon", variants:["limao","limão","lime","lemon"] },
  { baseKey:"morango",      namePT:"morango",       nameEN:"strawberry",   variants:["morango","strawberry","strawberries"] },
  { baseKey:"uva",          namePT:"uva",           nameEN:"grape",        variants:["uva","grape","grapes"] },
  { baseKey:"pimentao",     namePT:"pimentao",      nameEN:"bell pepper",  variants:["pimentao","pimentão","bell pepper","pepper","peppers"] },
  { baseKey:"ovo",          namePT:"ovo",           nameEN:"egg",          variants:["ovo","ovos","egg","eggs"] },
  { baseKey:"queijo",       namePT:"queijo",        nameEN:"cheese",       variants:["queijo","cheese","cheeses"] },
  { baseKey:"pao",          namePT:"pão",           nameEN:"bread",        variants:["pao","pão","bread","breads"] },
  { baseKey:"manteiga",     namePT:"manteiga",      nameEN:"butter",       variants:["manteiga","butter"] },
  { baseKey:"yogurte_grego",namePT:"iogurte grego", nameEN:"greek yogurt", variants:["iogurte grego","iogurte","yogurte grego","greek yogurt","yogurt","yogurt grego"] },
  { baseKey:"batata",       namePT:"batata",        nameEN:"potato",       variants:["batata","potato","potatoes"] },
  { baseKey:"cenoura",      namePT:"cenoura",       nameEN:"carrot",       variants:["cenoura","carrot","carrots"] },
];

function normalizeText(s){
  return (s ?? "").toString().trim().toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g," ");
}

const variantMap = new Map();
for (const item of FOOD_BASE){
  for (const v of item.variants){
    variantMap.set(normalizeText(v), item);
  }
}

const els = {
  tabView:          document.getElementById("tabView"),
  tabEdit:          document.getElementById("tabEdit"),
  viewArea:         document.getElementById("viewArea"),
  editArea:         document.getElementById("editArea"),
  columnsGrid:      document.getElementById("columnsGrid"),
  btnRefresh:       document.getElementById("btnRefresh"),
  targetListSelect: document.getElementById("targetListSelect"),
  addInput:         document.getElementById("addInput"),
  btnAdd:           document.getElementById("btnAdd"),
  logMeta:          document.getElementById("logMeta"),
  logScroll:        document.getElementById("logScroll"),
};

function setTab(which){
  const view = which === "view";
  els.tabView.setAttribute("aria-selected", String(view));
  els.tabEdit.setAttribute("aria-selected", String(!view));
  els.viewArea.classList.toggle("active", view);
  els.editArea.classList.toggle("active", !view);
}
els.tabView.addEventListener("click", () => setTab("view"));
els.tabEdit.addEventListener("click", () => setTab("edit"));
els.btnRefresh.addEventListener("click", () => loadAll());

const STATE = {
  lists: [],
  catalogByBaseKey: new Map(),
  itemsByListId: new Map(),
  listIdBySlug: new Map(),
};

async function loadCatalog(){
  const { data, error } = await supabase
    .from("app_food_catalog")
    .select("id, base_key, name_pt, name_en");
  if (error) throw error;
  STATE.catalogByBaseKey.clear();
  for (const c of data) STATE.catalogByBaseKey.set(c.base_key, c);
}

async function loadLists(){
  const { data, error } = await supabase
    .from("app_lists")
    .select("id, slug, display_name, kind")
    .order("created_at", { ascending: true });
  if (error) throw error;
  STATE.lists = data;
  STATE.listIdBySlug.clear();
  for (const l of data) STATE.listIdBySlug.set(l.slug, l.id);
}

async function loadItemsWithState(){
  const listIds = STATE.lists.map(l => l.id);
  const { data, error } = await supabase
    .from("app_list_items")
    .select(`
      id, list_id, custom_text, catalog_id,
      app_food_catalog ( base_key, name_pt, name_en ),
      app_list_item_state ( checked, checked_at )
    `)
    .in("list_id", listIds);
  if (error) throw error;

  const byList = new Map();
  for (const id of listIds) byList.set(id, []);
  for (const it of data ?? []) byList.get(it.list_id).push(it);
  STATE.itemsByListId = byList;
}

async function loadAll(){
  try{
    await loadLists();
    await loadCatalog();
    await loadItemsWithState();
    renderColumns();
    populateEditSelect();
  }catch(e){
    console.error(e);
    alert("Failed to load. Check your Supabase connection.");
  }
}

function itemDisplayName(it){
  if (it.catalog_id){
    const c = it.app_food_catalog;
    return c?.name_pt ?? c?.base_key ?? "Item";
  }
  return it.custom_text;
}

function itemMetaText(it){
  if (it.catalog_id){
    const c = it.app_food_catalog;
    return `${c?.name_pt ?? ""} / ${c?.name_en ?? ""}`;
  }
  return "custom item";
}

function sortItems(items){
  return items.slice().sort((a,b) => {
    const na = itemDisplayName(a), nb = itemDisplayName(b);
    return na.localeCompare(nb);
  });
}

function computeSeal(items){
  if (!items || items.length === 0) return false;
  return items.every(it => !!it.app_list_item_state?.checked);
}

function renderColumns(){
  els.columnsGrid.innerHTML = "";
  for (const col of LIST_ORDER){
    const listId = STATE.listIdBySlug.get(col.slug);
    const listItems = STATE.itemsByListId.get(listId) ?? [];
    const sorted = sortItems(listItems);
    const sealOn = computeSeal(sorted);
    const checkedCount = sorted.filter(x => !!x.app_list_item_state?.checked).length;

    const colEl = document.createElement("div");
    colEl.className = "col";
    colEl.innerHTML = `
      <div class="colHead">
        <div class="colName">
          <div>${col.label}</div>
          <div style="color:var(--muted);font-weight:700;font-size:12px;">
            ${checkedCount}/${sorted.length} checked
          </div>
        </div>
        <div class="seal ${sealOn ? "on" : ""}" title="All items checked">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--seal);"></span>
          ${sealOn ? "Sealed ✓" : "—"}
        </div>
      </div>
      <div class="items"></div>
    `;

    const itemsWrap = colEl.querySelector(".items");
    if (sorted.length === 0){
      itemsWrap.innerHTML = `<div class="empty">No items yet. Go to Edit / Add to add groceries.</div>`;
    } else {
      for (const it of sorted){
        const checked = !!it.app_list_item_state?.checked;
        const name = itemDisplayName(it);
        const meta = itemMetaText(it);

        const itemEl = document.createElement("div");
        itemEl.className = `item ${checked ? "checked" : ""}`;
        itemEl.innerHTML = `
          <input class="check" type="checkbox" ${checked ? "checked" : ""} />
          <div class="itemLabel">
            <div class="name" title="${name}">${name}</div>
            <div class="meta">${meta}</div>
          </div>
          <button class="deleteBtn" title="Remove item">✕</button>
        `;

        const checkbox = itemEl.querySelector(".check");
        const deleteBtn = itemEl.querySelector(".deleteBtn");

        checkbox.addEventListener("change", async () => {
          checkbox.disabled = true;
          try {
            await setChecked(it.id, checkbox.checked, it.list_id, it.catalog_id, it.custom_text);
            await loadAll();
          } catch(e){
            console.error(e);
            alert("Failed to update item.");
            checkbox.checked = !checkbox.checked;
          } finally {
            checkbox.disabled = false;
          }
        });

        deleteBtn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          if (!confirm(`Remove "${name}" from ${col.label}?`)) return;
          try {
            await supabase.from("app_list_items").delete().eq("id", it.id);
            await loadAll();
          } catch(e){
            console.error(e);
            alert("Failed to delete item.");
          }
        });

        itemEl.addEventListener("click", (ev) => {
          if (ev.target === checkbox || ev.target === deleteBtn) return;
          openLog(it.id, it.list_id);
          setTab("edit");
        });

        itemsWrap.appendChild(itemEl);
      }
    }

    els.columnsGrid.appendChild(colEl);
  }
}

async function setChecked(listItemId, shouldCheck, listId, catalogId, customText){
  const now = new Date();
  const { error: stErr } = await supabase
    .from("app_list_item_state")
    .upsert({
      list_item_id: listItemId,
      checked: shouldCheck,
      checked_at: shouldCheck ? now.toISOString() : null,
      updated_at: now.toISOString(),
    }, { onConflict: "list_item_id" });
  if (stErr) throw stErr;

  const { error: logErr } = await supabase
    .from("app_list_item_log")
    .insert({
      list_item_id: listItemId,
      list_id: listId,
      catalog_id: catalogId ?? null,
      custom_text: catalogId ? null : (customText ?? null),
      event_type: shouldCheck ? "checked" : "unchecked",
      event_at: now.toISOString().slice(0,10),
    });
  if (logErr) throw logErr;
}

async function openLog(listItemId, listId){
  const { data: li } = await supabase
    .from("app_list_items")
    .select("id, catalog_id, custom_text, app_food_catalog(name_pt)")
    .eq("id", listItemId)
    .single();

  const name = li?.catalog_id ? li.app_food_catalog?.name_pt : li?.custom_text;
  const listName = STATE.lists.find(l => l.id === listId)?.display_name ?? "?";
  els.logMeta.textContent = `Item: ${name} • List: ${listName}`;

  const { data: logs } = await supabase
    .from("app_list_item_log")
    .select("event_type, event_at")
    .eq("list_item_id", listItemId)
    .order("created_at", { ascending: false });

  els.logScroll.innerHTML = "";
  if (!logs || logs.length === 0){
    els.logScroll.innerHTML = `<div class="empty">No log events yet.</div>`;
    return;
  }
  for (const lg of logs){
    const line = document.createElement("div");
    line.className = "logLine";
    line.innerHTML = `
      <span style="font-weight:800;color:var(--ink);">${lg.event_type === "checked" ? "CHECKED" : "UNCHECKED"}</span>
      <span class="tag ${lg.event_type}">${lg.event_at}</span>
    `;
    els.logScroll.appendChild(line);
  }
}

function populateEditSelect(){
  els.targetListSelect.innerHTML = "";
  for (const l of STATE.lists){
    const opt = document.createElement("option");
    opt.value = l.slug;
    opt.textContent = l.display_name;
    els.targetListSelect.appendChild(opt);
  }
}

async function ensureStateRow(listItemId){
  const { data } = await supabase
    .from("app_list_item_state")
    .select("list_item_id")
    .eq("list_item_id", listItemId);
  if (data && data.length > 0) return;
  await supabase.from("app_list_item_state")
    .insert({ list_item_id: listItemId, checked: false, checked_at: null });
}

async function addItem(){
  const raw = els.addInput.value;
  const norm = normalizeText(raw);
  if (!norm){ alert("Type a grocery name first."); return; }

  const matched = variantMap.get(norm) ?? null;
  const targetSlug = els.targetListSelect.value;
  let finalListId = STATE.listIdBySlug.get(targetSlug);
  if (!finalListId){ alert("List not found."); return; }

  // If it's a known catalog food and user isn't already targeting Main, prompt them
  if (matched && targetSlug !== "main"){
    const goToMain = confirm(
      `"${matched.namePT} / ${matched.nameEN}" is a shared-base food.\n\nAdd to Main (Shared) instead of "${STATE.lists.find(l=>l.slug===targetSlug)?.display_name}"?\n\nOK = Add to Main   Cancel = Keep in personal list`
    );
    if (goToMain) finalListId = STATE.listIdBySlug.get("main");
  }

  if (matched){
    const catalog = STATE.catalogByBaseKey.get(matched.baseKey);
    if (!catalog){ alert("Catalog entry missing — re-run supabase.sql."); return; }

    const { data: existing } = await supabase
      .from("app_list_items")
      .select("id")
      .eq("list_id", finalListId)
      .eq("catalog_id", catalog.id)
      .maybeSingle();

    const listItemId = existing?.id ?? (await supabase
      .from("app_list_items")
      .insert({ list_id: finalListId, catalog_id: catalog.id, custom_text: null })
      .select("id").single()).data?.id;

    if (listItemId) await ensureStateRow(listItemId);
  } else {
    const { data: existing } = await supabase
      .from("app_list_items")
      .select("id")
      .eq("list_id", finalListId)
      .eq("custom_text", norm)
      .maybeSingle();

    const listItemId = existing?.id ?? (await supabase
      .from("app_list_items")
      .insert({ list_id: finalListId, catalog_id: null, custom_text: norm })
      .select("id").single()).data?.id;

    if (listItemId) await ensureStateRow(listItemId);
  }

  els.addInput.value = "";
  await loadAll();
  setTab("view");
}

els.btnAdd.addEventListener("click", async () => {
  try { await addItem(); }
  catch(e){ console.error(e); alert("Failed to add item. Check Supabase policies/schema."); }
});

els.addInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter"){ ev.preventDefault(); els.btnAdd.click(); }
});

loadAll();
