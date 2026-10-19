import { profile, personalPlaces, tracks, photos } from "../config.js";
import { h, icon, on, store, copy, external, safeURL } from "../ui.js";
import {
  searchPlaces,
  mapURL,
  placeURL,
  allPlaces,
  validCoordinates,
} from "../places.js";

export function mountMaps(ctx) {
  const { root, signal } = ctx;
  let selected = null,
    results = [],
    view = "search",
    category = "全部",
    status = "",
    busy = false,
    request = 0;
  ctx.setTitle("地图");
  root.innerHTML = `<div class="app-toolbar maps-toolbar"><button class="icon-button" data-map="sidebar" aria-label="显示或隐藏地点列表">${icon("sidebar", 20)}</button><b>地图</b><span class="spacer"></span><button class="icon-button" data-map="locate" aria-label="使用当前位置">${icon("pin", 19)}</button><button class="mac-button" data-map="center">回到选中地点</button><button class="icon-button" data-map="external" aria-label="在完整地图中查看">${icon("external", 18)}</button></div><div class="maps-app"><aside class="maps-sidebar"><form class="maps-search"><label class="search-field">${icon("search", 16)}<input name="query" aria-label="搜索地图地点" placeholder="搜索城市、街道或地点" minlength="2" maxlength="160" required></label><button type="submit" aria-label="搜索地点">${icon("forward", 17)}</button></form><div class="maps-tabs segmented"><button data-map-view="search" class="active">搜索</button><button data-map-view="favorites">收藏</button><button data-map-view="personal">我的地点</button></div><div class="maps-sidebar-content"></div><footer><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a><span>地点查询：Photon</span></footer></aside><main class="maps-main"><iframe title="交互地图，可拖动与缩放" src="${mapURL(null)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="maps-welcome"><span>${icon("globe", 24)}</span><div><b>喜欢的地方，值得收藏。</b><p>搜索一个地点，或选择自己的收藏。</p></div></div><div class="map-place-card" hidden></div><div class="map-recovery"><button data-map="reload">地图未显示？重新载入</button><button data-map="external">在完整地图中打开 ↗</button></div></main></div>`;
  function favorites() {
    return store.get("mapFavorites", []);
  }
  function recents() {
    return store.get("mapRecents", []);
  }
  function choose(place, remember = true) {
    if (!place || !validCoordinates(place.lat, place.lon)) return;
    selected = { ...place };
    root.querySelector("iframe").src = mapURL(selected);
    root.querySelector(".maps-welcome").hidden = true;
    if (remember)
      store.set(
        "mapRecents",
        [selected, ...recents().filter((p) => p.id !== selected.id)].slice(
          0,
          12,
        ),
      );
    renderCard();
    renderList();
  }
  function renderList() {
    root
      .querySelectorAll("[data-map-view]")
      .forEach((b) => b.classList.toggle("active", b.dataset.mapView === view));
    const el = root.querySelector(".maps-sidebar-content");
    let entries =
      view === "favorites"
        ? favorites().filter(
            (p) => category === "全部" || p.category === category,
          )
        : view === "personal"
          ? personalPlaces.map((p) => ({ ...p, public: true }))
          : results.length
            ? results
            : recents();
    el.innerHTML = `${status ? `<div class="maps-status ${busy ? "" : "error"}">${h(status)}</div>` : ""}${view === "favorites" ? `<select class="maps-category" aria-label="收藏分类"><option>全部</option>${["收藏", "散步", "想去", "旅行"].map((c) => `<option ${category === c ? "selected" : ""}>${c}</option>`).join("")}</select>` : ""}<h3>${view === "favorites" ? "我的收藏" : view === "personal" ? `${profile.name} 公开的地点` : results.length ? "搜索结果" : "最近查看"}</h3>${entries.length ? entries.map((p) => `<button class="map-result ${selected?.id === p.id ? "selected" : ""}" data-place="${h(p.id)}" data-place-source="${view}"><span class="map-pin-dot">${icon("pin", 17)}</span><div><b>${h(p.name)}</b><small>${h(p.address || "")}</small></div>${favorites().some((f) => f.id === p.id) ? icon("star", 13) : ""}</button>`).join("") : `<div class="maps-empty">${view === "personal" ? "主人愿意公开的散步清单和旅行回忆，会放在这里。" : view === "favorites" ? "把喜欢的地点收进来，附上一段自己的故事。" : "输入城市或地点名称，按回车开始搜索。"}</div>`}${view === "search" && recents().length ? '<button class="link-button maps-clear" data-map="clear-recents">清除最近查看</button>' : ""}`;
  }
  function renderCard() {
    if (!selected) return;
    const favorite = favorites().find((p) => p.id === selected.id),
      place = favorite || selected,
      card = root.querySelector(".map-place-card");
    card.hidden = false;
    card.innerHTML = `<header><span class="map-pin-dot">${icon("pin", 20)}</span><div><h2>${h(place.name)}</h2><p>${h(place.address || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`)}</p></div><button class="icon-button" data-map="close-card" aria-label="关闭地点详情">${icon("close", 16)}</button></header>${place.story ? `<p class="map-place-story">${h(place.story)}</p>` : ""}<div class="map-card-actions"><button data-map="favorite">${icon(favorite ? "star" : "plus", 17)}${favorite ? "编辑收藏" : "收藏地点"}</button><button data-map="directions">${icon("forward", 17)}路线</button><button data-map="copy">${icon("copy", 16)}复制</button><button data-map="note">${icon("file", 16)}记一笔</button></div>${place.trackId ? `<button class="map-story-link" data-track="${h(place.trackId)}">${icon("music", 16)}听听与这个地点相关的歌</button>` : ""}${place.photoId ? `<button class="map-story-link" data-photo="${h(place.photoId)}">${icon("image", 16)}看看这里的照片</button>` : ""}${favorite ? '<small class="map-local-label">此收藏只保存在当前浏览器</small>' : ""}`;
  }
  function editFavorite() {
    if (!selected) return;
    const old = favorites().find((p) => p.id === selected.id),
      place = old || selected;
    ctx.dialog({
      title: old ? "编辑地点收藏" : "收藏这个地点",
      width: 460,
      body: `<label class="form-field">名称<input name="name" value="${h(place.name)}" maxlength="150" required></label><label class="form-field">分类<select name="category">${["收藏", "散步", "想去", "旅行"].map((c) => `<option ${place.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="form-field">地点故事<textarea name="story" rows="3" maxlength="1500" placeholder="为什么喜欢这里？">${h(place.story || "")}</textarea></label><label class="form-field">关联歌曲<select name="track"><option value="">不关联</option>${tracks.map((t) => `<option value="${t.id}" ${t.id === place.trackId ? "selected" : ""}>${h(t.title)}</option>`).join("")}</select></label>${photos.length ? `<label class="form-field">关联照片<select name="photo"><option value="">不关联</option>${photos.map((p) => `<option value="${h(p.id)}" ${p.id === place.photoId ? "selected" : ""}>${h(p.title)}</option>`).join("")}</select></label>` : ""}<div class="form-error"></div>`,
      buttons: [
        { id: "cancel", label: "取消" },
        ...(old ? [{ id: "delete", label: "取消收藏" }] : []),
        { id: "save", label: "保存", primary: true },
      ],
      onAction: (action, dialog) => {
        if (action === "delete") {
          store.set(
            "mapFavorites",
            favorites().filter((p) => p.id !== place.id),
          );
          renderCard();
          renderList();
          return true;
        }
        if (action !== "save") return true;
        const get = (name) =>
          dialog.querySelector(`[name=${name}]`)?.value || "";
        if (!get("name").trim()) {
          dialog.querySelector(".form-error").textContent = "请填写地点名称";
          return false;
        }
        const next = {
          ...place,
          name: get("name").trim(),
          category: get("category"),
          story: get("story").trim(),
          trackId: get("track"),
          photoId: get("photo"),
          public: false,
        };
        if (
          !store.set("mapFavorites", [
            next,
            ...favorites().filter((p) => p.id !== place.id),
          ])
        ) {
          dialog.querySelector(".form-error").textContent =
            "浏览器未能保存，请稍后重试。";
          return false;
        }
        selected = next;
        renderCard();
        renderList();
        return true;
      },
    });
  }
  async function search(query) {
    const generation = ++request;
    busy = true;
    status = "正在查找地点…";
    renderList();
    try {
      const found = await searchPlaces(query, signal);
      if (signal.aborted || generation !== request) return;
      results = found;
      view = "search";
      status = results.length ? "" : "没有找到地点，试试更完整的名称。";
    } catch (error) {
      if (signal.aborted || generation !== request) return;
      status =
        error.name === "TimeoutError"
          ? "查询超时，请稍后重试。"
          : error.message;
    } finally {
      if (!signal.aborted && generation === request) {
        busy = false;
        renderList();
      }
    }
  }
  root.querySelector("form").addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      if (!busy) search(e.target.elements.query.value);
    },
    { signal },
  );
  on(
    root,
    "click",
    "[data-map-view]",
    (e, b) => {
      view = b.dataset.mapView;
      renderList();
    },
    signal,
  );
  on(
    root,
    "change",
    ".maps-category",
    (e, b) => {
      category = b.value;
      renderList();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-place]",
    (e, b) => {
      const place = [...results, ...recents(), ...allPlaces()].find(
        (p) => String(p.id) === b.dataset.place,
      );
      choose(place);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-track]",
    (e, b) => ctx.open("vscode", { track: b.dataset.track, play: true }),
    signal,
  );
  on(
    root,
    "click",
    "[data-photo]",
    (e, b) => ctx.open("photos", { photo: b.dataset.photo }),
    signal,
  );
  on(
    root,
    "click",
    "[data-map]",
    async (e, b) => {
      const action = b.dataset.map;
      if (action === "sidebar")
        root.querySelector("aside").hidden =
          !root.querySelector("aside").hidden;
      if (action === "center" || action === "reload")
        root.querySelector("iframe").src = mapURL(selected);
      if (action === "external")
        external(
          selected ? placeURL(selected) : "https://www.openstreetmap.org",
        );
      if (action === "close-card")
        root.querySelector(".map-place-card").hidden = true;
      if (action === "clear-recents") {
        store.set("mapRecents", []);
        renderList();
      }
      if (action === "favorite") editFavorite();
      if (action === "copy" && selected) {
        await copy(
          `${selected.name}\n${selected.address || ""}\n${placeURL(selected)}`,
        );
        ctx.toast("地点信息已复制");
      }
      if (action === "note" && selected) {
        if (!favorites().some((p) => p.id === selected.id))
          store.set("mapFavorites", [selected, ...favorites()]);
        ctx.open("notes", {
          create: {
            title: selected.name,
            body: `${selected.address || ""}\n\n${selected.story || ""}`,
            links: [{ app: "maps", id: selected.id, label: selected.name }],
          },
        });
      }
      if (action === "directions" && selected)
        ctx.dialog({
          title: "查看路线",
          body: `<label class="form-field">起点<input name="from" placeholder="城市、街道或地点" maxlength="160"></label><p>终点：${h(selected.name)}</p><p class="muted">在完整地图服务中查看实际路线。</p>`,
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "go", label: "打开路线 ↗", primary: true },
          ],
          onAction: (id, dialog) => {
            if (id === "go") {
              const url = new URL("https://www.google.com/maps/dir/");
              url.search = new URLSearchParams({
                api: "1",
                origin: dialog.querySelector("input").value,
                destination: `${selected.lat},${selected.lon}`,
              });
              external(url.href);
            }
            return true;
          },
        });
      if (action === "locate") {
        if (!navigator.geolocation) {
          ctx.toast("浏览器不支持定位", "仍可搜索城市与地点。");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (signal.aborted) return;
            choose(
              {
                id: "current-location",
                name: "当前位置",
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                address: "你主动选择的位置",
                category: "收藏",
              },
              false,
            );
          },
          () => {
            if (!signal.aborted)
              ctx.toast("未取得位置", "可以继续手动搜索地点。");
          },
          { timeout: 10000, maximumAge: 60000 },
        );
      }
    },
    signal,
  );
  function receive(data) {
    const place =
      data.place ||
      allPlaces().find((p) => String(p.id) === String(data.placeId));
    if (place) choose(place);
    else if (data.placeId)
      ctx.toast("这个地点不在收藏中了", "可以重新搜索它。");
    if (data.query) {
      root.querySelector("input").value = data.query;
      search(data.query);
    }
  }
  renderList();
  receive(ctx.data);
  return { receive };
}
