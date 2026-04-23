import { useState, useEffect } from "react";
import { createData, updateData, deleteData } from "../api";
import { formatIDR } from "../utils";
import { Plus, Pencil, Trash2, X, ClipboardList, FolderOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  Periode: "", PolicyNumber: "", freq: "", Product: "",
  Premium: "", Fee: "", BAS: "", NPPBAS: "", LSR: "", NPPBSR: "", LSRUnit: "",
};

const ITEMS_PER_PAGE = 20;

// ── Field wrapper ──────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.06em] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Input / Select shared style ────────────────────────────────
const inputCls = [
  "w-full border-[1.5px] border-slate-200 rounded-xl px-3.5 py-2.5",
  "text-sm text-slate-800 bg-slate-50 outline-none font-[inherit]",
  "transition-all duration-200",
  "focus:border-[#003F87] focus:bg-white focus:ring-2 focus:ring-[#003F87]/10",
].join(" ");

const selectCls = inputCls + " appearance-none cursor-pointer bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_14px_center] pr-9";

// ── Pagination ─────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end   = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  const navBtnCls = (disabled) =>
    [
      "w-[34px] h-[34px] rounded-lg border-[1.5px] flex items-center justify-center",
      "text-sm font-bold transition-all duration-150 cursor-pointer",
      disabled
        ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
        : "border-slate-200 bg-white text-slate-700 hover:border-[#003F87] hover:text-[#003F87]",
    ].join(" ");

  const pageBtnCls = (active) =>
    [
      "w-[34px] h-[34px] rounded-lg border-[1.5px] flex items-center justify-center",
      "text-sm font-bold transition-all duration-150 cursor-pointer",
      active
        ? "border-[#003F87] bg-[#003F87] text-white"
        : "border-slate-200 bg-white text-slate-700 hover:border-[#003F87] hover:text-[#003F87]",
    ].join(" ");

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 flex-wrap gap-2">
      <p className="text-[13px] text-slate-400">
        Menampilkan{" "}
        <strong className="text-slate-600">{start}–{end}</strong> dari{" "}
        <strong className="text-slate-600">{totalItems}</strong> data
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={navBtnCls(currentPage === 1)}
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={"dot-" + idx} className="text-slate-400 px-0.5 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={pageBtnCls(p === currentPage)}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={navBtnCls(currentPage === totalPages)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Crud({ data, loading, onRefresh }) {
  const [form, setForm]        = useState(EMPTY_FORM);
  const [editRow, setEdit]     = useState(null);
  const [saving, setSaving]    = useState(false);
  const [currentPage, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [data]);

  const totalPages    = data ? Math.ceil(data.length / ITEMS_PER_PAGE) : 0;
  const paginatedData = data
    ? data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : [];

  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function buildPayload(source) {
    return {
      Periode: source.Periode,
      "Policy Number": source.PolicyNumber,
      "Issued Date": new Date().toISOString(),
      Frequency: source.freq,
      "Policy Status": "Inforce",
      "SPAJ Status": "Inforce",
      Product: source.Product,
      "Basic Premium Regular": Number(source.Premium),
      "Fee Based": Number(source.Fee),
      "Branch Name": "KCP RSAL DR.RAMELAN",
      NPPBAS: "BAS-" + source.NPPBAS,
      "BAS Name": source.BAS,
      "LSR NPP": source.NPPBSR,
      "LSR Name": source.LSR,
      "LSR Unit": source.LSRUnit,
    };
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    await createData(buildPayload(form));
    setForm(EMPTY_FORM);
    setSaving(false);
    onRefresh();
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    await updateData({
      id: editRow.id,
      Periode: editRow.Periode,
      Product: editRow.Product,
      "Basic Premium Regular": Number(editRow.Premium),
      "Fee Based": Number(editRow.Fee),
      "BAS Name": editRow.BAS,
      "LSR Name": editRow.LSR,
    });
    setEdit(null);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    if (!window.confirm("Yakin hapus data?")) return;
    await deleteData(id);
    onRefresh();
  }

  function openEdit(row) {
    setEdit({
      id: row.id,
      Periode: row["Periode"],
      Product: row["Product"],
      Premium: row["Basic Premium Regular"],
      Fee: row["Fee Based"],
      BAS: row["BAS Name"],
      LSR: row["LSR Name"],
    });
  }

  return (
    <div className="px-8 py-6 max-w-full overflow-x-hidden">

      {/* ── Create Form Card ── */}
      <div className="bg-white rounded-[18px] shadow-[0_2px_20px_rgba(0,63,135,0.07)] border border-[rgba(0,63,135,0.06)] p-6 mb-5">
        {/* Card header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-bold text-[#002960]">Tambah Data Baru</h2>
            <p className="text-xs text-slate-400 mt-0.5">Isi semua kolom untuk menambahkan entri baru</p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-[#EEF4FF] text-[#003F87] text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
            <ClipboardList size={12} /> Form Input
          </span>
        </div>

        <form onSubmit={handleCreate}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
            <Field label="Periode">
              <input type="text" className={inputCls} placeholder="cth: January,2025"
                value={form.Periode} onChange={(e) => setF("Periode", e.target.value)} required />
            </Field>
            <Field label="Policy Number">
              <input type="number" className={inputCls} placeholder="cth: 1234567890"
                value={form.PolicyNumber} onChange={(e) => setF("PolicyNumber", e.target.value)} required />
            </Field>
            <Field label="Frequency">
              <select className={selectCls} value={form.freq}
                onChange={(e) => setF("freq", e.target.value)} required>
                <option value="" disabled>Pilih Frequency</option>
                {["Single", "Monthly", "Quarterly", "Yearly"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Product">
              <select className={selectCls} value={form.Product}
                onChange={(e) => setF("Product", e.target.value)} required>
                <option value="" disabled>Pilih Produk</option>
                {["BLUP", "BLSD", "BLHYNP1"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Basic Premium (Rp)">
              <input type="number" className={inputCls} placeholder="0"
                value={form.Premium} onChange={(e) => setF("Premium", e.target.value)} required />
            </Field>
            <Field label="Fee Based (Rp)">
              <input type="number" className={inputCls} placeholder="0"
                value={form.Fee} onChange={(e) => setF("Fee", e.target.value)} required />
            </Field>
            <Field label="BAS Name">
              <input type="text" className={inputCls} placeholder="Nama BAS"
                value={form.BAS} onChange={(e) => setF("BAS", e.target.value)} required />
            </Field>
            <Field label="NPP BAS">
              <input type="number" className={inputCls} placeholder="NPP BAS"
                value={form.NPPBAS} onChange={(e) => setF("NPPBAS", e.target.value)} required />
            </Field>
            <Field label="LSR Name">
              <input type="text" className={inputCls} placeholder="Nama LSR"
                value={form.LSR} onChange={(e) => setF("LSR", e.target.value)} required />
            </Field>
            <Field label="NPP LSR">
              <input type="number" className={inputCls} placeholder="NPP LSR"
                value={form.NPPBSR} onChange={(e) => setF("NPPBSR", e.target.value)} required />
            </Field>
            <Field label="LSR Unit Name">
              <input type="text" className={inputCls} placeholder="Unit LSR"
                value={form.LSRUnit} onChange={(e) => setF("LSRUnit", e.target.value)} required />
            </Field>

            {/* Submit */}
            <div className="col-span-full pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-br from-[#F37021] to-[#e05c10]
                  shadow-[0_4px_14px_rgba(243,112,33,0.3)]
                  transition-all duration-200
                  hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_6px_20px_rgba(243,112,33,0.4)]
                  disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                  : <><Plus size={15} /> Tambah Data</>
                }
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Data Table Card ── */}
      <div className="bg-white rounded-[18px] shadow-[0_2px_20px_rgba(0,63,135,0.07)] border border-[rgba(0,63,135,0.06)] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-bold text-[#002960]">Daftar Data Produksi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Kelola semua entri data yang sudah tersimpan</p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-[#EEF4FF] text-[#003F87] text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
            <FolderOpen size={12} /> Data Table
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100">
                {["Periode", "Product", "Premium", "BAS", "LSR", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                    Memuat data...
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                    Belum ada data
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors duration-100">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row["Periode"]}</td>
                    <td className="px-4 py-3 text-slate-600">{row["Product"]}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[13px]">{formatIDR(row["Basic Premium Regular"])}</td>
                    <td className="px-4 py-3 font-semibold text-[#002960] whitespace-nowrap">{row["BAS Name"]}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row["LSR Name"]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                            bg-[rgba(0,63,135,0.08)] text-[#003F87] border-none cursor-pointer
                            transition-colors duration-150 hover:bg-[rgba(0,63,135,0.15)]"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                            bg-red-50 text-red-500 border-none cursor-pointer
                            transition-colors duration-150 hover:bg-red-100"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={data ? data.length : 0}
          onPageChange={setPage}
        />
      </div>

      {/* ── Footer ── */}
      <p className="text-center text-xs text-slate-400 pt-6 pb-2">
        © 2025 BNI Life Insurance — Dashboard Produksi Internal
      </p>

      {/* ── Edit Modal ── */}
      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur"
          onClick={(e) => e.target === e.currentTarget && setEdit(null)}
        >
          <div className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,41,96,0.2)] border border-[rgba(0,63,135,0.08)] w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[modalIn_0.25s_ease_forwards]">

            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-slate-100 rounded-t-[20px]">
              <div>
                <h2 className="text-[16px] font-bold text-[#002960]">Edit Data</h2>
                <p className="text-xs text-slate-400 mt-0.5">Perbarui informasi entri yang dipilih</p>
              </div>
              <button
                onClick={() => setEdit(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 bg-transparent border-none cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors duration-150"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleUpdate} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Periode">
                  <input type="text" className={inputCls} value={editRow.Periode}
                    onChange={(e) => setEdit((m) => ({ ...m, Periode: e.target.value }))} required />
                </Field>
                <Field label="Product">
                  <input type="text" className={inputCls} value={editRow.Product}
                    onChange={(e) => setEdit((m) => ({ ...m, Product: e.target.value }))} required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Basic Premium (Rp)">
                  <input type="number" className={inputCls} value={editRow.Premium}
                    onChange={(e) => setEdit((m) => ({ ...m, Premium: e.target.value }))} required />
                </Field>
                <Field label="Fee Based (Rp)">
                  <input type="number" className={inputCls} value={editRow.Fee}
                    onChange={(e) => setEdit((m) => ({ ...m, Fee: e.target.value }))} required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="BAS Name">
                  <input type="text" className={inputCls} value={editRow.BAS}
                    onChange={(e) => setEdit((m) => ({ ...m, BAS: e.target.value }))} required />
                </Field>
                <Field label="LSR Name">
                  <input type="text" className={inputCls} value={editRow.LSR}
                    onChange={(e) => setEdit((m) => ({ ...m, LSR: e.target.value }))} required />
                </Field>
              </div>

              {/* Modal actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white
                    bg-gradient-to-br from-[#F37021] to-[#e05c10]
                    shadow-[0_4px_14px_rgba(243,112,33,0.3)]
                    transition-all duration-200
                    hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_6px_20px_rgba(243,112,33,0.4)]
                    disabled:opacity-65 disabled:cursor-not-allowed"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                    : "✓ Update Data"
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 border-none cursor-pointer hover:bg-slate-200 transition-colors duration-150"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}