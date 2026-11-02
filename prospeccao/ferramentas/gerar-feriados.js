// Gera feriados.json (rodar de novo para incluir anos novos): npm i date-holidays && node ferramentas/gerar-feriados.js mundo.json feriados.json
// Gera feriados.json: feriados de 2026 e 2027 do Brasil (nacionais, estaduais e de capitais) e dos países do mundo.json.
const H = require("date-holidays");
const fs = require("fs");
const mundo = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ANOS = [2026, 2027];
const tipoCurto = { public: "f", bank: "p", optional: "p", school: null, observance: "o" };
function lista(h) {
  const out = [];
  for (const a of ANOS) for (const x of h.getHolidays(a, "pt")) {
    const t = tipoCurto[x.type]; if (!t) continue;
    out.push([x.date.slice(0, 10), t, x.name]);
  }
  const vistos = new Set();
  return out.filter((x) => { const k = x[0] + x[2]; if (vistos.has(k)) return false; vistos.add(k); return true; });
}
const res = { gerado: new Date().toISOString().slice(0, 10), anos: ANOS, paises: {}, br: { uf: {}, cidade: {} } };
const br = new H("BR");
const nac = lista(br); res.paises.BR = nac;
const chave = new Set(nac.map((x) => x[0] + x[2]));
for (const uf of Object.keys(br.getStates("BR"))) {
  const hu = new H("BR", uf);
  const so = lista(hu).filter((x) => !chave.has(x[0] + x[2]));
  if (so.length) res.br.uf[uf] = so;
  const regs = hu.getRegions("BR", uf) || {};
  for (const [cod, nome] of Object.entries(regs)) {
    const hc = new H("BR", uf, cod);
    const sc = lista(hc).filter((x) => !chave.has(x[0] + x[2]) && !so.some((y) => y[0] === x[0] && y[2] === x[2]));
    if (sc.length) res.br.cidade[`${nome}|${uf}`] = sc;
  }
}
let semDados = [];
for (const iso of Object.keys(mundo.paises)) {
  if (iso === "BR") continue;
  let h; try { h = new H(iso); } catch { h = null; }
  if (!h || !h.getHolidays) { semDados.push(iso); continue; }
  const l = lista(h); if (l.length) res.paises[iso] = l; else semDados.push(iso);
}
fs.writeFileSync(process.argv[3], JSON.stringify(res));
console.log("países", Object.keys(res.paises).length, "sem dados", semDados.length, "UFs", Object.keys(res.br.uf).length, "cidades", Object.keys(res.br.cidade).join(", "));
