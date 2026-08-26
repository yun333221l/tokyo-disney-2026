"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShoppingBag,
  Sparkles,
  Camera,
  Image as ImageIcon,
  PlusCircle,
  Save,
  Trash2,
  X,
  Check,
  Edit3,
  ExternalLink,
  RefreshCw,
  Settings2,
  Eye,
  Banknote,
  Receipt,
  BedDouble,
} from "lucide-react";

// ==========================================
// Supabase 配置
// ==========================================
const supabaseUrl = "https://nmgefatxcgevedzrmylv.supabase.co";
const supabaseAnonKey = "sb_publishable_n-wRGhSPOYbfzG3wX9KQgg_MuH3w-kA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 這份行程資料在 trip 資料表裡的固定 id（單一列存整份 JSON）
const tripId = "tokyo-disney-2026";

// Supabase 免費方案資料庫總容量 500MB，這裡抓一個安全上限，
// 並維持圖片壓縮的好習慣，避免流量與容量超支。
const MAX_DOC_BYTES = 8 * 1024 * 1024; // 安全上限 8MB
const MAX_IMAGE_LONG_EDGE = 1280; // px，壓縮後圖片長邊上限
const IMAGE_QUALITY = 0.75; // JPEG 壓縮品質

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const getUsageInfo = (data) => {
  if (!data) return { bytes: 0, percent: 0, remainingBytes: MAX_DOC_BYTES };
  const bytes = new Blob([JSON.stringify(data)]).size;
  const percent = Math.min(100, Math.round((bytes / MAX_DOC_BYTES) * 100));
  const remainingBytes = Math.max(0, MAX_DOC_BYTES - bytes);
  return { bytes, percent, remainingBytes };
};

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
};

const compressImageFile = (file, maxEdge = MAX_IMAGE_LONG_EDGE, quality = IMAGE_QUALITY) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.onload = (event) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("圖片解析失敗"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxEdge || height > maxEdge) {
          if (width >= height) {
            height = Math.round((height / width) * maxEdge);
            width = maxEdge;
          } else {
            width = Math.round((width / height) * maxEdge);
            height = maxEdge;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

// ==========================================
// 預設（雛形）資料 —— 之後可直接把實際景點貼進來取代
// ==========================================
const DEFAULT_MEMBERS = [
  { id: "a", name: "甲", color: "#e8703a", startDay: 1, endDay: 6 },
  { id: "b", name: "乙", color: "#4472ad", startDay: 1, endDay: 6 },
  { id: "c", name: "丙", color: "#4f9d69", startDay: 1, endDay: 6 },
];

const ALL = ["a", "b", "c"];

const fallbackData = {
  meta: {
    tripName: "東京迪士尼煙火大會",
    startDate: "2026-12-03",
    endDate: "2026-12-08",
    members: DEFAULT_MEMBERS,
  },
  itinerary: [
    {
      day: 1,
      date: "12/3",
      week: "四",
      theme: "海洋迪士尼",
      weather: "",
      hotel: "",
      spots: [
        { time: "", title: "東京迪士尼海洋 DisneySea", type: "景點", note: "", mapUrl: "", attendees: ALL },
      ],
    },
    {
      day: 2,
      date: "12/4",
      week: "五",
      theme: "陸地迪士尼",
      weather: "",
      hotel: "",
      spots: [
        { time: "", title: "東京迪士尼樂園 Disneyland", type: "景點", note: "", mapUrl: "", attendees: ALL },
      ],
    },
    {
      day: 3,
      date: "12/5",
      week: "六",
      theme: "外苑銀杏・表參道・六本木・東京鐵塔",
      weather: "",
      hotel: "",
      spots: [
        { time: "", title: "外苑銀杏並木", type: "景點", note: "", mapUrl: "", attendees: ALL },
        { time: "", title: "表參道買包", type: "購物", note: "", mapUrl: "", attendees: ALL },
        { time: "", title: "六本木點燈", type: "景點", note: "", mapUrl: "", attendees: ALL },
        { time: "", title: "東京鐵塔喝酒", type: "美食", note: "", mapUrl: "", attendees: ALL },
      ],
    },
    {
      day: 4,
      date: "12/6",
      week: "日",
      theme: "熱海煙火",
      weather: "",
      hotel: "",
      spots: [
        { time: "", title: "熱海海上煙火大會", type: "景點", note: "記得確認當年度開始時間與施放地點。", mapUrl: "", attendees: ALL },
      ],
    },
    {
      day: 5,
      date: "12/7",
      week: "一",
      theme: "尚未安排",
      weather: "",
      hotel: "",
      spots: [],
    },
    {
      day: 6,
      date: "12/8",
      week: "二",
      theme: "尚未安排",
      weather: "",
      hotel: "",
      spots: [],
    },
  ],
  shopping: [
    { id: "s1", name: "東京香蕉伴手禮", note: "機場、車站都買得到", price: "1500", currency: "JPY", checked: false, photo: "" },
    { id: "s2", name: "藥妝清單", note: "BB乳、眼藥水、暖暖包", price: "", currency: "JPY", checked: false, photo: "" },
    { id: "s3", name: "迪士尼周邊玩偶", note: "現場限定款", price: "3000", currency: "JPY", checked: false, photo: "" },
  ],
  expenses: [],
};

const TYPE_STYLE = {
  交通: { bg: "#eef0f4", text: "#5b6472", dot: "#8891a0" },
  景點: { bg: "#fdf1e6", text: "#c05a26", dot: "#e8703a" },
  美食: { bg: "#fbeceA", text: "#a53a2f", dot: "#c14a3c" },
  住宿: { bg: "#eaedf6", text: "#324370", dot: "#4472ad" },
  購物: { bg: "#faf1de", text: "#96721f", dot: "#d9a441" },
};
const TYPE_OPTIONS = Object.keys(TYPE_STYLE);

const uid = () => Math.random().toString(36).slice(2, 9);

// 容量使用進度條
const CapacityBar = ({ usage }) => {
  const barColor = usage.percent >= 90 ? "bg-red-500" : usage.percent >= 70 ? "bg-[#d9a441]" : "bg-[#7fa06f]";
  const textColor = usage.percent >= 90 ? "text-red-500" : usage.percent >= 70 ? "text-[#d9a441]" : "text-[#8b7f6a]";
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-bold text-[#8b7f6a] tracking-widest uppercase">雲端容量使用</span>
        <span className={`text-[9px] font-bold ${textColor}`}>
          {formatBytes(usage.bytes)} / {formatBytes(MAX_DOC_BYTES)}（{usage.percent}%）
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#ecdfc0] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${usage.percent}%` }}></div>
      </div>
      {usage.percent >= 70 && (
        <p className="text-[9px] font-bold text-[#d9a441] mt-1">⚠️ 容量快滿了，建議刪除幾張舊照片，避免之後存檔失敗。</p>
      )}
    </div>
  );
};

const MemberDot = ({ member, size = 18 }) => (
  <div
    className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
    style={{ width: size, height: size, background: member.color, fontSize: size * 0.5 }}
    title={member.name}
  >
    {member.name?.[0] || "?"}
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState("itinerary"); // itinerary | shopping | members
  const [tripData, setTripData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [dayDraft, setDayDraft] = useState({ theme: "", hotel: "" });
  const [memberNameDrafts, setMemberNameDrafts] = useState({});
  const [daysLeft, setDaysLeft] = useState(0);
  const [editingSpotKey, setEditingSpotKey] = useState(null); // `${day}-${idx}` or 'new'
  const [spotDraft, setSpotDraft] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [isUploadingShopPhoto, setIsUploadingShopPhoto] = useState(null); // item id currently uploading
  const [showAddShop, setShowAddShop] = useState(false);
  const [shopDraft, setShopDraft] = useState({ name: "", note: "", price: "", currency: "JPY", photo: "" });
  const shopPhotoInputRef = useRef(null);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({ item: "", amount: "", currency: "JPY", payer: "a", splitAmong: ALL, photo: "" });
  const [isUploadingExpensePhoto, setIsUploadingExpensePhoto] = useState(false);

  // 注入日系手繪風字體
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Zen+Maru+Gothic:wght@400;500;700;900&family=Noto+Sans+TC:wght@300;400;500;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // 倒數天數（2026-12-03 出發）
  useEffect(() => {
    const targetDate = new Date("2026-12-03T00:00:00+09:00");
    const today = new Date();
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    setDaysLeft(diffDays > 0 ? diffDays : 0);
  }, []);

  // 只在「切換日期」或「資料第一次載入」時，把主題/住宿同步進本地暫存欄位，
  // 打字過程中絕對不會被雲端資料蓋掉，避免中斷注音輸入。
  useEffect(() => {
    if (!tripData) return;
    const d = tripData.itinerary.find((x) => x.day === selectedDay);
    setDayDraft({ theme: d?.theme || "", hotel: d?.hotel || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, !!tripData]);

  // 成員名字也是同樣道理，只在第一次資料載入時同步一次
  useEffect(() => {
    if (!tripData) return;
    setMemberNameDrafts(Object.fromEntries(tripData.meta.members.map((m) => [m.id, m.name])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!tripData]);

  // ==========================================
  // Supabase 資料讀取、即時同步與安全初始化
  // ==========================================
  useEffect(() => {
    const normalizeData = (data) => {
      const safe = { ...data };
      if (!safe.meta) safe.meta = fallbackData.meta;
      if (!safe.meta.members || !safe.meta.members.length) safe.meta.members = DEFAULT_MEMBERS;
      if (!safe.itinerary) safe.itinerary = fallbackData.itinerary;
      if (!safe.shopping) safe.shopping = [];
      if (!safe.expenses) safe.expenses = [];
      safe.itinerary.forEach((day) => {
        if (typeof day.hotel !== "string") day.hotel = "";
        if (day.spots && Array.isArray(day.spots)) {
          day.spots.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
          day.spots.forEach((s) => {
            if (!Array.isArray(s.attendees)) s.attendees = ALL;
          });
        } else {
          day.spots = [];
        }
      });
      return safe;
    };

    let isMounted = true;

    const init = async () => {
      try {
        const { data: row, error } = await supabase.from("trip").select("data").eq("id", tripId).maybeSingle();
        if (error) throw error;
        if (!isMounted) return;

        if (row && row.data) {
          setTripData(normalizeData(row.data));
        } else {
          setTripData(fallbackData);
          const { error: upsertError } = await supabase.from("trip").upsert({ id: tripId, data: fallbackData });
          if (upsertError) throw upsertError;
        }
      } catch (err) {
        console.error("Supabase 讀取或初始化失敗，已啟用本地資料防護：", err);
        if (isMounted) setTripData(fallbackData);
      }
    };

    init();

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip", filter: `id=eq.${tripId}` },
        (payload) => {
          if (payload.new && payload.new.data) setTripData(normalizeData(payload.new.data));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const updateCloud = async (newData) => {
    try {
      const { error } = await supabase.from("trip").upsert({ id: tripId, data: newData, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { ok: true, code: null, message: null };
    } catch (e) {
      console.error("資料上傳雲端失敗：", e);
      return { ok: false, code: e?.code || "unknown", message: e?.message || String(e) };
    }
  };

  const commitUpdate = async (newData, { silent = false } = {}) => {
    const previousData = tripData;
    setTripData(newData);

    const usage = getUsageInfo(newData);
    if (usage.bytes > MAX_DOC_BYTES) {
      setTripData(previousData);
      if (!silent) {
        alert(`這筆變更會讓資料超過安全容量（還剩 ${formatBytes(getUsageInfo(previousData).remainingBytes)} 可用），已自動取消，請先刪除幾張舊照片再試一次。`);
      }
      return false;
    }

    const result = await updateCloud(newData);
    if (!result.ok) {
      setTripData(previousData);
      if (!silent) {
        alert(
          "雲端同步失敗，這筆變更已自動復原、不會保留。\n\n" +
            `錯誤代碼：${result.code}\n錯誤訊息：${result.message}\n\n請把上面這段錯誤代碼截圖給協助你的人看。`
        );
      }
      return false;
    }
    return true;
  };

  if (!tripData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6efdc] gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#e8703a]" />
        <p className="text-[#8b7f6a] text-sm">連接雲端資料中…</p>
      </div>
    );
  }

  const members = tripData.meta.members;
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const usage = getUsageInfo(tripData);
  const currentDay = tripData.itinerary.find((d) => d.day === selectedDay);
  const membersPresentToday = members.filter((m) => selectedDay >= m.startDay && selectedDay <= m.endDay);

  // ---------- 行程 CRUD ----------
  const openNewSpotForm = () => {
    setSpotDraft({
      time: "",
      title: "",
      type: "景點",
      note: "",
      mapUrl: "",
      attendees: membersPresentToday.map((m) => m.id),
    });
    setEditingSpotKey("new");
  };

  const openEditSpotForm = (idx) => {
    setSpotDraft({ ...currentDay.spots[idx] });
    setEditingSpotKey(`${selectedDay}-${idx}`);
  };

  const closeSpotForm = () => {
    setEditingSpotKey(null);
    setSpotDraft(null);
  };

  const toggleDraftAttendee = (id) => {
    setSpotDraft((d) => {
      const has = d.attendees.includes(id);
      return { ...d, attendees: has ? d.attendees.filter((x) => x !== id) : [...d.attendees, id] };
    });
  };

  const saveSpotDraft = async () => {
    if (!spotDraft.title.trim()) {
      alert("請至少填寫景點名稱。");
      return;
    }
    const newData = deepClone(tripData);
    const day = newData.itinerary.find((d) => d.day === selectedDay);
    if (editingSpotKey === "new") {
      day.spots.push({ ...spotDraft });
    } else {
      const idx = Number(editingSpotKey.split("-")[1]);
      day.spots[idx] = { ...spotDraft };
    }
    day.spots.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const ok = await commitUpdate(newData);
    if (ok) closeSpotForm();
  };

  const deleteSpot = async (idx) => {
    if (!window.confirm("確定要刪除這個行程項目嗎？")) return;
    const newData = deepClone(tripData);
    const day = newData.itinerary.find((d) => d.day === selectedDay);
    day.spots.splice(idx, 1);
    await commitUpdate(newData);
  };

  const updateDayField = async (field, value) => {
    const newData = deepClone(tripData);
    const day = newData.itinerary.find((d) => d.day === selectedDay);
    day[field] = value;
    await commitUpdate(newData);
  };

  // ---------- 成員 ----------
  const updateMember = async (id, field, value) => {
    const newData = deepClone(tripData);
    const m = newData.meta.members.find((x) => x.id === id);
    m[field] = field === "startDay" || field === "endDay" ? Number(value) : value;
    await commitUpdate(newData);
  };

  // ---------- 購物清單 ----------
  const handleAddShopItem = async () => {
    if (!shopDraft.name.trim()) {
      alert("請至少填寫品項名稱。");
      return;
    }
    const newData = deepClone(tripData);
    newData.shopping.push({ id: uid(), checked: false, ...shopDraft });
    const ok = await commitUpdate(newData);
    if (ok) {
      setShopDraft({ name: "", note: "", price: "", currency: "JPY", photo: "" });
      setShowAddShop(false);
    }
  };

  const toggleShopChecked = async (id) => {
    const newData = deepClone(tripData);
    const item = newData.shopping.find((x) => x.id === id);
    item.checked = !item.checked;
    await commitUpdate(newData);
  };

  const deleteShopItem = async (id) => {
    if (!window.confirm("確定要刪除這個購物項目嗎？")) return;
    const newData = deepClone(tripData);
    newData.shopping = newData.shopping.filter((x) => x.id !== id);
    await commitUpdate(newData);
  };

  const handleShopPhotoChange = async (e, itemId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingShopPhoto(itemId);
    try {
      const compressed = await compressImageFile(file);
      const newData = deepClone(tripData);
      const item = newData.shopping.find((x) => x.id === itemId);
      item.photo = compressed;
      await commitUpdate(newData);
    } catch (err) {
      alert("圖片處理失敗：" + err.message);
    } finally {
      setIsUploadingShopPhoto(null);
      e.target.value = "";
    }
  };

  const handleNewShopPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingShopPhoto("new");
    try {
      const compressed = await compressImageFile(file);
      setShopDraft((d) => ({ ...d, photo: compressed }));
    } catch (err) {
      alert("圖片處理失敗：" + err.message);
    } finally {
      setIsUploadingShopPhoto(null);
      e.target.value = "";
    }
  };

  // ---------- 分帳 ----------
  const toggleDraftSplitMember = (id) => {
    setExpenseDraft((d) => {
      const has = d.splitAmong.includes(id);
      return { ...d, splitAmong: has ? d.splitAmong.filter((x) => x !== id) : [...d.splitAmong, id] };
    });
  };

  const handleAddExpense = async () => {
    if (!expenseDraft.item.trim() || !expenseDraft.amount || Number(expenseDraft.amount) <= 0) {
      alert("請填寫項目名稱與金額。");
      return;
    }
    if (expenseDraft.splitAmong.length === 0) {
      alert("請至少選一位分攤的人。");
      return;
    }
    const newData = deepClone(tripData);
    newData.expenses.unshift({
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      ...expenseDraft,
      amount: Number(expenseDraft.amount),
    });
    const ok = await commitUpdate(newData);
    if (ok) {
      setExpenseDraft({ item: "", amount: "", currency: "JPY", payer: expenseDraft.payer, splitAmong: ALL, photo: "" });
      setShowAddExpense(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("確定要刪除這筆支出嗎？")) return;
    const newData = deepClone(tripData);
    newData.expenses = newData.expenses.filter((x) => x.id !== id);
    await commitUpdate(newData);
  };

  const handleExpensePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingExpensePhoto(true);
    try {
      const compressed = await compressImageFile(file);
      setExpenseDraft((d) => ({ ...d, photo: compressed }));
    } catch (err) {
      alert("圖片處理失敗：" + err.message);
    } finally {
      setIsUploadingExpensePhoto(false);
      e.target.value = "";
    }
  };

  // 依「誰付的」與「分攤對象」計算每人淨額（正值＝該收回、負值＝該付出）
  const computeBalances = () => {
    const balances = Object.fromEntries(members.map((m) => [m.id, 0]));
    (tripData.expenses || []).forEach((exp) => {
      const among = exp.splitAmong && exp.splitAmong.length ? exp.splitAmong : ALL;
      const share = exp.amount / among.length;
      if (balances[exp.payer] !== undefined) balances[exp.payer] += exp.amount;
      among.forEach((id) => {
        if (balances[id] !== undefined) balances[id] -= share;
      });
    });
    return balances;
  };
  const balances = computeBalances();
  const totalExpense = (tripData.expenses || []).reduce((sum, e) => sum + e.amount, 0);

  // 債務簡化：把「應收/應付」兩兩配對，算出最少轉帳次數的建議
  const computeSettlements = (balanceMap) => {
    const creditors = [];
    const debtors = [];
    Object.entries(balanceMap).forEach(([id, amt]) => {
      const rounded = Math.round(amt);
      if (rounded > 0) creditors.push({ id, amt: rounded });
      else if (rounded < 0) debtors.push({ id, amt: -rounded });
    });
    creditors.sort((a, b) => b.amt - a.amt);
    debtors.sort((a, b) => b.amt - a.amt);
    const result = [];
    let ci = 0,
      di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const pay = Math.min(creditors[ci].amt, debtors[di].amt);
      if (pay > 0) result.push({ from: debtors[di].id, to: creditors[ci].id, amount: pay });
      creditors[ci].amt -= pay;
      debtors[di].amt -= pay;
      if (creditors[ci].amt === 0) ci++;
      if (debtors[di].amt === 0) di++;
    }
    return result;
  };
  const settlements = computeSettlements(balances);

  // ---------- Google 地圖：查看 / 交通路線（減少轉乘時間誤差） ----------
  const buildMapSearchUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const buildDirectionsUrl = (originQuery, destQuery) =>
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}&travelmode=transit`;

  // 取得某個景點的「上一站」文字：同一天內用前一個景點；當天第一個景點則用前一晚住宿
  const getOriginForSpot = (day, idx) => {
    if (idx > 0) return day.spots[idx - 1].title;
    const prevDay = tripData.itinerary.find((d) => d.day === day.day - 1);
    return prevDay && prevDay.hotel ? prevDay.hotel : null;
  };

  return (
    <div className="min-h-screen bg-[#f6efdc] pb-28" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* ---------------- HEADER ---------------- */}
      <div
        className="relative overflow-hidden px-5 pt-8 pb-7"
        style={{ background: "linear-gradient(160deg,#1f2a4a 0%,#324370 55%,#5a5f95 100%)" }}
      >
        <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle,rgba(232,112,58,0.35),transparent 70%)" }} />

        {/* 手繪風煙火 */}
        <svg className="absolute top-1 left-6 w-16 h-16 opacity-90" viewBox="0 0 100 100" style={{ animation: "fwPulse 3.2s ease-in-out infinite" }}>
          <g stroke="#f4a35c" strokeWidth="3" strokeLinecap="round">
            <line x1="50" y1="50" x2="50" y2="10" /><line x1="50" y1="50" x2="76" y2="24" />
            <line x1="50" y1="50" x2="90" y2="50" /><line x1="50" y1="50" x2="76" y2="76" />
            <line x1="50" y1="50" x2="50" y2="90" /><line x1="50" y1="50" x2="24" y2="76" />
            <line x1="50" y1="50" x2="10" y2="50" /><line x1="50" y1="50" x2="24" y2="24" />
          </g>
          <g fill="#d9a441">
            <circle cx="50" cy="10" r="3" /><circle cx="76" cy="24" r="3" /><circle cx="90" cy="50" r="3" /><circle cx="76" cy="76" r="3" />
            <circle cx="50" cy="90" r="3" /><circle cx="24" cy="76" r="3" /><circle cx="10" cy="50" r="3" /><circle cx="24" cy="24" r="3" />
          </g>
        </svg>
        <svg className="absolute top-4 right-16 w-12 h-12 opacity-80" viewBox="0 0 100 100" style={{ animation: "fwPulse 3.2s ease-in-out infinite 1.1s" }}>
          <g stroke="#e8703a" strokeWidth="3" strokeLinecap="round">
            <line x1="50" y1="50" x2="50" y2="10" /><line x1="50" y1="50" x2="76" y2="24" />
            <line x1="50" y1="50" x2="90" y2="50" /><line x1="50" y1="50" x2="76" y2="76" />
            <line x1="50" y1="50" x2="50" y2="90" /><line x1="50" y1="50" x2="24" y2="76" />
            <line x1="50" y1="50" x2="10" y2="50" /><line x1="50" y1="50" x2="24" y2="24" />
          </g>
        </svg>
        <style>{`@keyframes fwPulse{0%,100%{opacity:0.15;transform:scale(0.8);}45%{opacity:1;transform:scale(1);}}`}</style>

        {/* 童話城堡剪影（示意，非特定品牌造型） */}
        <svg className="absolute bottom-0 right-3 w-24 opacity-90" viewBox="0 0 220 170" style={{ height: "auto" }}>
          <g fill="#141c38">
            <rect x="30" y="90" width="160" height="70" />
            <rect x="10" y="60" width="34" height="100" /><polygon points="10,60 27,30 44,60" />
            <rect x="176" y="60" width="34" height="100" /><polygon points="176,60 193,30 210,60" />
            <rect x="70" y="45" width="26" height="115" /><polygon points="70,45 83,15 96,45" />
            <rect x="124" y="45" width="26" height="115" /><polygon points="124,45 137,15 150,45" />
            <rect x="96" y="20" width="28" height="140" /><polygon points="96,20 110,-10 124,20" />
          </g>
          <g fill="#f4e3b8" opacity="0.8">
            <rect x="105" y="105" width="10" height="16" /><rect x="60" y="100" width="8" height="12" />
            <rect x="150" y="100" width="8" height="12" /><rect x="20" y="80" width="8" height="10" /><rect x="190" y="80" width="8" height="10" />
          </g>
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-[#d9a441] text-[11px] tracking-[0.25em] mb-1" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
            <Sparkles className="w-3.5 h-3.5" /> TOKYO DISNEY RESORT
          </div>
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: "'LXGW WenKai TC',serif" }}>
            {tripData.meta.tripName}
          </h1>
          <p className="text-[#e7e0cf] text-xs mt-1" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
            2026.12.03 － 2026.12.08 ・出發倒數 {daysLeft} 天
          </p>
          <div className="flex gap-1.5 mt-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-1 bg-white/10 rounded-full pl-1 pr-2.5 py-1">
                <MemberDot member={m} size={16} />
                <span className="text-white text-[11px]">{m.name}・D{m.startDay}-{m.endDay}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-10">
        <div className="bg-[#f6efdc] rounded-2xl border border-[#ecdfc0] shadow-sm p-4">
          <CapacityBar usage={usage} />
        </div>
      </div>

      {/* ---------------- TABS ---------------- */}
      <div className="px-5 mt-5 grid grid-cols-4 gap-1.5">
        {[
          { id: "itinerary", label: "行程", icon: Calendar },
          { id: "expenses", label: "分帳", icon: Banknote },
          { id: "shopping", label: "購物", icon: ShoppingBag },
          { id: "members", label: "成員", icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition ${
              activeTab === t.id ? "bg-[#e8703a] text-white shadow" : "bg-white text-[#8b7f6a] border border-[#ecdfc0]"
            }`}
            style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- ITINERARY TAB ---------------- */}
      {activeTab === "itinerary" && (
        <div className="px-5 mt-5">
          {/* day selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {tripData.itinerary.map((d) => {
              const present = members.filter((m) => d.day >= m.startDay && d.day <= m.endDay);
              const active = d.day === selectedDay;
              return (
                <button
                  key={d.day}
                  onClick={() => setSelectedDay(d.day)}
                  className={`shrink-0 rounded-xl px-3 py-2 border text-left ${
                    active ? "bg-[#1f2a4a] border-[#1f2a4a]" : "bg-white border-[#ecdfc0]"
                  }`}
                >
                  <div className={`text-[10px] ${active ? "text-[#d9a441]" : "text-[#8b7f6a]"}`} style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
                    Day {d.day}
                  </div>
                  <div className={`text-sm font-bold ${active ? "text-white" : "text-[#3a3226]"}`}>
                    {d.date}（{d.week}）
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {present.map((m) => (
                      <MemberDot key={m.id} member={m} size={12} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* day theme */}
          {currentDay && (
            <div className="mt-4">
              <input
                value={dayDraft.theme}
                onChange={(e) => setDayDraft((d) => ({ ...d, theme: e.target.value }))}
                onBlur={() => updateDayField("theme", dayDraft.theme)}
                placeholder="這天的主題"
                className="text-lg font-bold bg-transparent border-b border-dashed border-[#d9a441]/50 focus:outline-none w-full py-1"
                style={{ fontFamily: "'LXGW WenKai TC',serif" }}
              />
              <div className="flex items-center gap-1.5 mt-2">
                <BedDouble className="w-3.5 h-3.5 text-[#8b7f6a] shrink-0" />
                <input
                  value={dayDraft.hotel}
                  onChange={(e) => setDayDraft((d) => ({ ...d, hotel: e.target.value }))}
                  onBlur={() => updateDayField("hotel", dayDraft.hotel)}
                  placeholder="今晚住宿（飯店名稱 / 地址，選填）"
                  className="text-xs text-[#5b5344] bg-transparent border-b border-dashed border-[#ecdfc0] focus:outline-none focus:border-[#d9a441] w-full py-1"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-[#8b7f6a]" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
                  今天在場：
                </span>
                {membersPresentToday.map((m) => (
                  <div key={m.id} className="flex items-center gap-1 bg-white rounded-full pl-1 pr-2 py-0.5 border border-[#ecdfc0]">
                    <MemberDot member={m} size={14} />
                    <span className="text-[11px]">{m.name}</span>
                  </div>
                ))}
                {membersPresentToday.length === 0 && <span className="text-[11px] text-[#c14a3c]">目前沒有人設定在這一天喔，請到「成員設定」調整</span>}
              </div>

              {/* spots */}
              <div className="mt-4 space-y-3">
                {currentDay.spots.map((spot, idx) => {
                  const style = TYPE_STYLE[spot.type] || TYPE_STYLE["景點"];
                  const isEditing = editingSpotKey === `${selectedDay}-${idx}`;
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-[#ecdfc0] p-4 relative">
                      {!isEditing ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#3a3226] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#8b7f6a]" /> {spot.time || "--:--"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: style.bg, color: style.text }}>
                                {spot.type}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => openEditSpotForm(idx)} className="p-1.5 rounded-lg hover:bg-[#f6efdc]">
                                <Edit3 className="w-3.5 h-3.5 text-[#8b7f6a]" />
                              </button>
                              <button onClick={() => deleteSpot(idx)} className="p-1.5 rounded-lg hover:bg-[#fbeceA]">
                                <Trash2 className="w-3.5 h-3.5 text-[#c14a3c]" />
                              </button>
                            </div>
                          </div>
                          <h3 className="font-bold text-[#3a3226] mt-1.5">{spot.title}</h3>
                          {spot.note && <p className="text-xs text-[#8b7f6a] mt-1 leading-relaxed">{spot.note}</p>}
                          <div className="flex items-center gap-3 flex-wrap mt-1.5">
                            <a
                              href={spot.mapUrl || buildMapSearchUrl(spot.title)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#4472ad]"
                            >
                              <MapPin className="w-3 h-3" /> 在地圖上查看 <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            {(() => {
                              const origin = getOriginForSpot(currentDay, idx);
                              if (!origin) return null;
                              return (
                                <a
                                  href={buildDirectionsUrl(origin, spot.title)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-[#c05a26]"
                                  title={`從「${origin}」出發的交通路線`}
                                >
                                  🚉 交通路線 <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              );
                            })()}
                          </div>
                          <div className="flex gap-1 mt-2.5">
                            {(spot.attendees || []).map((id) => memberById[id] && <MemberDot key={id} member={memberById[id]} size={16} />)}
                          </div>
                        </>
                      ) : (
                        <SpotForm draft={spotDraft} setDraft={setSpotDraft} members={members} toggleAttendee={toggleDraftAttendee} onSave={saveSpotDraft} onCancel={closeSpotForm} />
                      )}
                    </div>
                  );
                })}

                {editingSpotKey === "new" ? (
                  <div className="bg-white rounded-2xl border border-[#e8703a] p-4">
                    <SpotForm draft={spotDraft} setDraft={setSpotDraft} members={members} toggleAttendee={toggleDraftAttendee} onSave={saveSpotDraft} onCancel={closeSpotForm} />
                  </div>
                ) : (
                  <button
                    onClick={openNewSpotForm}
                    className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border-2 border-dashed border-[#d9a441]/60 text-[#c05a26] text-sm font-bold"
                    style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}
                  >
                    <PlusCircle className="w-4 h-4" /> 新增行程項目
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- EXPENSES / SPLIT-BILL TAB ---------------- */}
      {activeTab === "expenses" && (
        <div className="px-5 mt-5">
          <div className="bg-white rounded-2xl border border-[#ecdfc0] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#3a3226] flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-[#7fa06f]" /> 目前結算
              </h3>
              <span className="text-[11px] text-[#8b7f6a]">總支出 ¥{totalExpense.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {members.map((m) => {
                const b = Math.round(balances[m.id]);
                const positive = b > 0;
                const zero = b === 0;
                return (
                  <div key={m.id} className="rounded-xl bg-[#f6efdc] p-2.5 text-center">
                    <div className="flex justify-center mb-1">
                      <MemberDot member={m} size={20} />
                    </div>
                    <div className="text-[11px] text-[#8b7f6a]">{m.name}</div>
                    <div className={`text-xs font-bold mt-0.5 ${zero ? "text-[#8b7f6a]" : positive ? "text-[#4f9d69]" : "text-[#c14a3c]"}`}>
                      {zero ? "打平" : positive ? `應收 ¥${b.toLocaleString()}` : `應付 ¥${Math.abs(b).toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[#8b7f6a] mt-2.5 leading-relaxed" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
              「應收」表示這個人先墊了比較多錢，其他人之後要補給他；「應付」則反過來。
            </p>
          </div>

          {settlements.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#ecdfc0] p-4 mt-3">
              <h3 className="text-sm font-bold text-[#3a3226] flex items-center gap-1.5 mb-2.5">
                <Banknote className="w-4 h-4 text-[#d9a441]" /> 建議轉帳（最少次數結清）
              </h3>
              <div className="space-y-2">
                {settlements.map((s, i) => {
                  const from = memberById[s.from];
                  const to = memberById[s.to];
                  return (
                    <div key={i} className="flex items-center gap-2 bg-[#f6efdc] rounded-xl px-3 py-2 text-xs">
                      {from && <MemberDot member={from} size={16} />}
                      <span className="font-bold text-[#3a3226]">{from?.name}</span>
                      <span className="text-[#8b7f6a]">付給</span>
                      {to && <MemberDot member={to} size={16} />}
                      <span className="font-bold text-[#3a3226]">{to?.name}</span>
                      <span className="ml-auto font-bold text-[#c05a26]">¥{s.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {(tripData.expenses || []).map((exp) => {
              const payer = memberById[exp.payer];
              return (
                <div key={exp.id} className="bg-white rounded-2xl border border-[#ecdfc0] p-4 flex items-start gap-3">
                  <div className="p-2 bg-[#f6efdc] rounded-xl shrink-0">
                    <Receipt className="w-4 h-4 text-[#8b7f6a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#3a3226] text-sm">{exp.item}</span>
                      <span className="font-bold text-[#c05a26] text-sm">¥{exp.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8b7f6a]">
                      {payer && <MemberDot member={payer} size={14} />}
                      <span>{payer ? payer.name : "未指定"} 墊付</span>
                      <span>・{exp.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[10px] text-[#8b7f6a]">分攤：</span>
                      {(exp.splitAmong || []).map((id) => memberById[id] && <MemberDot key={id} member={memberById[id]} size={13} />)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {exp.photo && (
                        <button onClick={() => setPreviewImageUrl(exp.photo)} className="flex items-center gap-1 text-[11px] text-[#4472ad]">
                          <ImageIcon className="w-3.5 h-3.5" /> 查看收據
                        </button>
                      )}
                      <button onClick={() => deleteExpense(exp.id)} className="flex items-center gap-1 text-[11px] text-[#c14a3c] ml-auto">
                        <Trash2 className="w-3 h-3" /> 刪除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {(tripData.expenses || []).length === 0 && (
              <div className="text-center py-8 text-[#8b7f6a] text-xs border-2 border-dashed border-[#ecdfc0] rounded-2xl">目前還沒有任何支出紀錄</div>
            )}
          </div>

          {showAddExpense ? (
            <div className="bg-white rounded-2xl border border-[#e8703a] p-4 mt-3 space-y-2">
              <input
                value={expenseDraft.item}
                onChange={(e) => setExpenseDraft((d) => ({ ...d, item: e.target.value }))}
                placeholder="項目名稱（例如：飯店住宿費）"
                className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
              />
              <input
                value={expenseDraft.amount}
                onChange={(e) => setExpenseDraft((d) => ({ ...d, amount: e.target.value }))}
                placeholder="金額（日幣）"
                type="number"
                className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
              />
              <div>
                <div className="text-[11px] text-[#8b7f6a] mb-1.5">誰墊付的？</div>
                <div className="flex gap-2">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setExpenseDraft((d) => ({ ...d, payer: m.id }))}
                      className={`flex items-center gap-1 rounded-full pl-1 pr-2.5 py-1 border ${expenseDraft.payer === m.id ? "border-transparent" : "border-[#ecdfc0] opacity-40"}`}
                      style={{ background: expenseDraft.payer === m.id ? m.color + "22" : "white" }}
                    >
                      <MemberDot member={m} size={16} />
                      <span className="text-[11px]">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8b7f6a] mb-1.5">要分攤給誰？</div>
                <div className="flex gap-2">
                  {members.map((m) => {
                    const active = expenseDraft.splitAmong.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleDraftSplitMember(m.id)}
                        className={`flex items-center gap-1 rounded-full pl-1 pr-2.5 py-1 border ${active ? "border-transparent" : "border-[#ecdfc0] opacity-40"}`}
                        style={{ background: active ? m.color + "22" : "white" }}
                      >
                        <MemberDot member={m} size={16} />
                        <span className="text-[11px]">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-[#4472ad] cursor-pointer">
                  <Camera className="w-4 h-4" /> {expenseDraft.photo ? "已加入收據照片" : "拍下收據（選填）"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleExpensePhotoChange} />
                </label>
                {isUploadingExpensePhoto && <RefreshCw className="w-3 h-3 animate-spin text-[#8b7f6a]" />}
                {expenseDraft.photo && <img src={expenseDraft.photo} alt="" className="w-10 h-10 object-cover rounded-lg" />}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddExpense} className="flex-1 bg-[#e8703a] text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                  <Save className="w-3.5 h-3.5" /> 記錄這筆支出
                </button>
                <button onClick={() => setShowAddExpense(false)} className="px-4 bg-[#f6efdc] text-[#8b7f6a] text-sm font-bold py-2 rounded-lg">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddExpense(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3 mt-3 rounded-2xl border-2 border-dashed border-[#d9a441]/60 text-[#c05a26] text-sm font-bold"
              style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}
            >
              <PlusCircle className="w-4 h-4" /> 新增支出
            </button>
          )}
        </div>
      )}

      {/* ---------------- SHOPPING TAB ---------------- */}
      {activeTab === "shopping" && (
        <div className="px-5 mt-5">
          <div className="space-y-3">
            {tripData.shopping.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#ecdfc0] p-4 flex gap-3">
                <button
                  onClick={() => toggleShopChecked(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    item.checked ? "bg-[#7fa06f] border-[#7fa06f]" : "border-[#d9a441]"
                  }`}
                >
                  {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold ${item.checked ? "line-through text-[#8b7f6a]" : "text-[#3a3226]"}`}>{item.name}</div>
                  {item.note && <p className="text-xs text-[#8b7f6a] mt-0.5">{item.note}</p>}
                  {item.price && (
                    <p className="text-xs text-[#c05a26] mt-0.5 font-bold">
                      ¥{item.price} {item.currency !== "JPY" && item.currency}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-1 text-[11px] text-[#4472ad] cursor-pointer">
                      <Camera className="w-3.5 h-3.5" /> {item.photo ? "更換照片" : "新增照片"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleShopPhotoChange(e, item.id)} />
                    </label>
                    {isUploadingShopPhoto === item.id && <RefreshCw className="w-3 h-3 animate-spin text-[#8b7f6a]" />}
                    <button onClick={() => deleteShopItem(item.id)} className="text-[11px] text-[#c14a3c] flex items-center gap-0.5 ml-auto">
                      <Trash2 className="w-3 h-3" /> 刪除
                    </button>
                  </div>
                </div>
                {item.photo && (
                  <button onClick={() => setPreviewImageUrl(item.photo)} className="shrink-0">
                    <img src={item.photo} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-[#ecdfc0]" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {showAddShop ? (
            <div className="bg-white rounded-2xl border border-[#e8703a] p-4 mt-3 space-y-2">
              <input
                value={shopDraft.name}
                onChange={(e) => setShopDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="品項名稱"
                className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
              />
              <input
                value={shopDraft.note}
                onChange={(e) => setShopDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="備註（例如：藥妝、伴手禮）"
                className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
              />
              <input
                value={shopDraft.price}
                onChange={(e) => setShopDraft((d) => ({ ...d, price: e.target.value }))}
                placeholder="預算金額（日幣，可留空）"
                className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-[#4472ad] cursor-pointer">
                  <Camera className="w-4 h-4" /> {shopDraft.photo ? "已加入照片" : "加入參考照片"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleNewShopPhotoChange} />
                </label>
                {isUploadingShopPhoto === "new" && <RefreshCw className="w-3 h-3 animate-spin text-[#8b7f6a]" />}
                {shopDraft.photo && <img src={shopDraft.photo} alt="" className="w-10 h-10 object-cover rounded-lg" />}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddShopItem} className="flex-1 bg-[#e8703a] text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                  <Save className="w-3.5 h-3.5" /> 加入清單
                </button>
                <button
                  onClick={() => {
                    setShowAddShop(false);
                    setShopDraft({ name: "", note: "", price: "", currency: "JPY", photo: "" });
                  }}
                  className="px-4 bg-[#f6efdc] text-[#8b7f6a] text-sm font-bold py-2 rounded-lg"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddShop(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3 mt-3 rounded-2xl border-2 border-dashed border-[#d9a441]/60 text-[#c05a26] text-sm font-bold"
              style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}
            >
              <PlusCircle className="w-4 h-4" /> 新增購物項目
            </button>
          )}
        </div>
      )}

      {/* ---------------- MEMBERS TAB ---------------- */}
      {activeTab === "members" && (
        <div className="px-5 mt-5 space-y-3">
          <p className="text-xs text-[#8b7f6a] leading-relaxed" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
            設定每個人在東京的天數區間（Day1 = 12/3），新增行程時會自動預設當天在場的人，之後仍可在每個景點上自行調整參與者。
          </p>
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#ecdfc0] p-4">
              <div className="flex items-center gap-2 mb-3">
                <MemberDot member={m} size={28} />
                <input
                  value={memberNameDrafts[m.id] ?? m.name}
                  onChange={(e) => setMemberNameDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                  onBlur={() => updateMember(m.id, "name", memberNameDrafts[m.id] ?? m.name)}
                  className="font-bold text-[#3a3226] border-b border-dashed border-[#d9a441]/50 focus:outline-none flex-1"
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-[#8b7f6a]">
                <label className="flex items-center gap-1.5">
                  第
                  <select value={m.startDay} onChange={(e) => updateMember(m.id, "startDay", e.target.value)} className="border border-[#ecdfc0] rounded-lg px-1.5 py-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  天 抵達
                </label>
                <label className="flex items-center gap-1.5">
                  第
                  <select value={m.endDay} onChange={(e) => updateMember(m.id, "endDay", e.target.value)} className="border border-[#ecdfc0] rounded-lg px-1.5 py-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  天 離開
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- IMAGE PREVIEW MODAL ---------------- */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setPreviewImageUrl(null)}>
          <img src={previewImageUrl} alt="preview" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-6 right-6 text-white bg-white/10 rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

// 行程項目編輯表單（新增／編輯共用）
const SpotForm = ({ draft, setDraft, members, toggleAttendee, onSave, onCancel }) => {
  if (!draft) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="time"
          value={draft.time}
          onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          className="w-28 text-sm border border-[#ecdfc0] rounded-lg px-2 py-1.5"
        />
        <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} className="text-sm border border-[#ecdfc0] rounded-lg px-2 py-1.5">
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <input
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder="景點 / 項目名稱"
        className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
      />
      <textarea
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder="備註"
        rows={2}
        className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2 resize-none"
      />
      <input
        value={draft.mapUrl}
        onChange={(e) => setDraft((d) => ({ ...d, mapUrl: e.target.value }))}
        placeholder="Google 地圖連結（選填，不填會自動用名稱搜尋）"
        className="w-full text-sm border border-[#ecdfc0] rounded-lg px-3 py-2"
      />
      <div>
        <div className="text-[11px] text-[#8b7f6a] mb-1.5" style={{ fontFamily: "'Zen Maru Gothic',sans-serif" }}>
          參與的人
        </div>
        <div className="flex gap-2">
          {members.map((m) => {
            const active = draft.attendees.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleAttendee(m.id)}
                className={`flex items-center gap-1 rounded-full pl-1 pr-2.5 py-1 border ${active ? "border-transparent" : "border-[#ecdfc0] opacity-40"}`}
                style={{ background: active ? m.color + "22" : "white" }}
              >
                <MemberDot member={m} size={16} />
                <span className="text-[11px]">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex-1 bg-[#e8703a] text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1">
          <Save className="w-3.5 h-3.5" /> 儲存
        </button>
        <button onClick={onCancel} className="px-4 bg-[#f6efdc] text-[#8b7f6a] text-sm font-bold py-2 rounded-lg">
          取消
        </button>
      </div>
    </div>
  );
};

export default App;
