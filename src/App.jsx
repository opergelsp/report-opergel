import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { parseXlsx } from "./data.js";
import {
  I18nContext,
  useI18n,
  traduzir,
  Bandeiras,
  MESES_POR_LINGUA,
} from "./i18n.jsx";

const GOLD = "#C09F44";
const NAVY = "#003E61";
const NAVY_DARK = "#002B43";
const WHITE = "#FEFEFE";
const COLORS = [
  GOLD,
  NAVY,
  NAVY_DARK,
  "#4f7f9d",
  "#8ba9bf",
  "#c9b37c",
  "#2a5c7e",
  "#a38a3f",
];

const fmt = (v) => v.toLocaleString("pt-BR");
const fmtMoney = (v) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const fmtTon = (v) =>
  (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const METRICAS = {
  peso: { fmt: (v) => fmtTon(v) },
  caixas: { fmt: (v) => fmt(v) },
  veiculos: { fmt: (v) => fmt(v) },
  entregas: { fmt: (v) => fmt(v) },
  ocupacao: {
    fmt: (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%",
  },
};

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const SESSAO_MS = 60 * 60 * 1000;
const POLL_MS = 10000;
const URL_LOGIN = "/.netlify/functions/login";
const URL_LOGOUT = "/.netlify/functions/logout";
const URL_PLANILHA =
  "https://docs.google.com/spreadsheets/d/10QHv0hGusTtCY7nM2PddvG3SIAJoC9RevvxSGb95Ni4/edit";

const PROBLEMAS = [
  { key: "domingo", teste: (r) => r.data.getDay() === 0 },
  { key: "entregas", teste: (r) => r.entregas <= 0 },
  { key: "veiculo", teste: (r) => !r.veiculo.trim() || /_/.test(r.veiculo) },
  { key: "capacidade", teste: (r) => r.capacidade <= 0 },
  { key: "peso", teste: (r) => r.peso <= 0 },
  { key: "valor", teste: (r) => r.valor <= 0 },
];

const URL_DADOS =
  "https://docs.google.com/spreadsheets/d/10QHv0hGusTtCY7nM2PddvG3SIAJoC9RevvxSGb95Ni4/export?format=xlsx";

const ICONES_LOADING = [
  {
    cor: "#C09F44",
    viewBox: "0 0 32 32",
    paths: [
      "M24,4h-7.2c-1.6,0-3-0.6-4.1-1.7c-0.4-0.4-1-0.4-1.4,0c-0.4,0.4-0.4,1,0,1.4C12.8,5.2,14.7,6,16.8,6H24c1.3,0,2.4,0.8,2.8,2 H13.9c-2.4,0-4.7,0.7-6.5,1.9c-0.1,1,0,2.1,0.3,3.3c0.7,2.5,2.4,4.6,4.7,5.8c0,0,0.1,0,0.1,0H19c5.5,0,10-4.5,10-10 C29,6.2,26.8,4,24,4z M23,13c0,0.6-0.4,1-1,1s-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1V13z",
      "M12,21.8c-0.2-0.1-0.4-0.2-0.5-0.4c-0.3-0.3-0.4-0.6-0.4-1c-2.5-1.5-4.4-3.8-5.1-6.7c-0.2-0.7-0.3-1.5-0.4-2.1 c-1,1.1-1.7,2.4-2,3.9c-0.8,3.3-0.1,6.4,1.8,8.9c1.6,2.1,4,3.3,6.7,3.6V21.8z",
      "M21.6,22c-2.2-1.3-4.9-1.5-7.2-0.6L14,21.5v6.2l0.1,0c1.1-0.4,2.2-0.1,3.1,0.6c0.7,0.5,1.5,0.8,2.4,0.8 c0.4,0,0.7-0.1,1.1-0.2c1.2-0.4,2.2-1.3,2.5-2.5C23.8,24.8,23.1,22.9,21.6,22z",
    ],
  },
  {
    cor: "#003E61",
    viewBox: "0 0 32 32",
    paths: [
      "M29.3,10.1c-0.4-0.1-0.8,0-1.1,0.3l-3.2,4c-1.7-2-5.9-6.4-11-6.4c-0.2,0-0.3,0-0.5,0c1.4,2.4,2.1,5.1,2.1,8 c0,2.8-0.7,5.6-2.1,8c0.2,0,0.3,0,0.5,0c5.1,0,9.3-4.3,11-6.4l3.2,4c0.2,0.2,0.5,0.4,0.8,0.4c0.1,0,0.2,0,0.3-0.1 c0.4-0.1,0.7-0.5,0.7-0.9V11C30,10.6,29.7,10.2,29.3,10.1z",
      "M11.4,8.4c-5.2,1.5-9,6.8-9.2,7c-0.2,0.3-0.2,0.8,0,1.2c0.2,0.3,4,5.6,9.2,7c1.5-2.3,2.2-4.9,2.2-7.6 C13.6,13.3,12.8,10.6,11.4,8.4z M10,16c0,0.6-0.4,1-1,1s-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1V16z",
    ],
  },
  {
    cor: "#C09F44",
    viewBox: "0 0 32 32",
    paths: [
      "M20,30h-8c-0.6,0-1-0.4-1-1c0-2.2,2.2-4,5-4s5,1.8,5,4C21,29.6,20.6,30,20,30z",
      "M16,23c1.4,0,2.7,0.4,3.8,1c1.4-2.6,2.2-6.6,2.2-10.5c0-5.7-3.8-8-5.8-8.5c-0.1,0-0.3,0-0.4,0c-2,0.5-5.8,2.8-5.8,8.5 c0,3.8,0.8,7.8,2.2,10.5C13.3,23.4,14.6,23,16,23z",
      "M7,2.2V8c0,0.6-0.4,1-1,1S5,8.6,5,8V2.2C3.3,2.7,2,4.7,2,7c0,2.8,1.8,5,4,5s4-2.2,4-5C10,4.7,8.7,2.7,7,2.2z",
      "M27,2.2V8c0,0.6-0.4,1-1,1s-1-0.4-1-1V2.2c-1.7,0.6-3,2.5-3,4.8c0,2.8,1.8,5,4,5s4-2.2,4-5C30,4.7,28.7,2.7,27,2.2z",
      "M12,5c-0.6,0-1-0.4-1-1V2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,4.6,12.6,5,12,5z",
      "M20,5c-0.6,0-1-0.4-1-1V2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C21,4.6,20.6,5,20,5z",
      "M20.8,17.6c-0.5,0-0.9-0.3-1-0.8c-0.1-0.5,0.3-1.1,0.8-1.2c3-0.6,5.7-1.7,7.8-3.2c0.4-0.3,1.1-0.2,1.4,0.2 c0.3,0.4,0.2,1.1-0.2,1.4c-2.3,1.7-5.3,3-8.6,3.6C21,17.5,20.9,17.6,20.8,17.6z",
      "M11.2,17.6c-0.1,0-0.1,0-0.2,0c-3.3-0.6-6.3-1.9-8.6-3.6c-0.4-0.3-0.5-1-0.2-1.4c0.3-0.4,1-0.5,1.4-0.2 c2,1.5,4.7,2.7,7.8,3.2c0.5,0.1,0.9,0.6,0.8,1.2C12.1,17.2,11.6,17.6,11.2,17.6z",
      "M20.3,20.8c-0.5,0-0.9-0.4-1-0.9c-0.1-0.5,0.3-1,0.9-1.1c3.1-0.3,6-1,8.5-2.1c0.5-0.2,1.1,0,1.3,0.5c0.2,0.5,0,1.1-0.5,1.3 c-2.6,1.1-5.8,1.9-9,2.2C20.3,20.8,20.3,20.8,20.3,20.8z",
      "M11.7,20.8c0,0-0.1,0-0.1,0c-3.2-0.4-6.4-1.1-9-2.2c-0.5-0.2-0.8-0.8-0.5-1.3c0.2-0.5,0.8-0.8,1.3-0.5 c2.5,1,5.4,1.7,8.5,2.1c0.5,0.1,0.9,0.6,0.9,1.1C12.7,20.4,12.2,20.8,11.7,20.8z",
    ],
  },
  {
    cor: "#003E61",
    viewBox: "0 0 32 32",
    paths: [
      "M10,18h4c0.6,0,1-0.4,1-1v-4c0-0.6-0.4-1-1-1h-4c-0.6,0-1,0.4-1,1v4C9,17.6,9.4,18,10,18z",
      "M20,2c-5.6,0-10,2.6-10,6c0,0.4,0.1,0.7,0.2,1.1C5.5,9.6,2,12,2,15v9c0,3.4,4.4,6,10,6s10-2.6,10-6v-1.1 c4.7-0.5,8-2.9,8-5.9V8C30,4.6,25.6,2,20,2z M20,4c4.7,0,8,2.1,8,4c0,1.8-2.9,3.8-7.3,4c-0.3-0.4-0.7-0.7-1.2-1H22c0.6,0,1-0.4,1-1 V6c0-0.6-0.4-1-1-1h-4c-0.6,0-1,0.4-1,1v3.8C15.6,9.3,14,9,12.3,9C12.1,8.7,12,8.3,12,8C12,6.1,15.3,4,20,4z M12,11 c4.7,0,8,2.1,8,4s-3.3,4-8,4s-8-2.1-8-4S7.3,11,12,11z",
    ],
  },
  {
    cor: "#C09F44",
    viewBox: "0 0 512 512",
    paths: [
      "M108.434,425.533c0,13.067,10.578,23.649,23.631,23.649h58.906l-82.538-76.704V425.533z",
      "M379.93,449.182c13.054,0,23.636-10.582,23.636-23.649v-53.055l-82.538,76.704H379.93z",
      "M487.98,171.783c-0.06-0.12-0.129-0.242-0.189-0.354l-79.185,101.276l-15.76-12.317l83.957-107.403 c-19.243-29.19-45.105-54.349-75.719-73.604l-48.498,126.374l-18.682-7.181l49.628-129.309c-4.174-2.192-8.402-4.289-12.714-6.274 c-31.736-14.595-67.222-23.33-104.818-24.65v138.207H245.99V38.34c-37.583,1.32-73.07,10.055-104.81,24.65 c-4.307,1.985-8.536,4.074-12.7,6.258l49.632,129.308l-18.682,7.164l-48.493-126.34c-30.618,19.256-56.494,44.415-75.741,73.613 l83.962,107.394l-15.765,12.317L24.214,171.43c-0.064,0.112-0.133,0.233-0.194,0.354C12.061,194.25,3.828,218.65,0,244.387 l239.91,222.954c9.071,8.425,23.11,8.425,32.176,0L512,244.387C508.172,218.65,499.939,194.25,487.98,171.783z",
    ],
  },
];

const fmtPct = (v) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

const limparVeiculo = (v) =>
  String(v || "")
    .trim()
    .replace(/^(SP|SC) - /i, "");

const CANONICO_VEICULOS = { bitruck: "Bi Truck", caminho34: "Caminhão 3/4" };

const ATUALIZACOES = [
  {
    data: "26/08/2026",
    itens: [
      {
        pt: "Gráficos diários da aba Geral agora mostram o mês completo até o dia mais recente mesmo com uma data selecionada. O dia escolhido fica destacado e os demais mais transparentes.",
        en: "Daily charts on the General tab now show the full month up to the latest day even with a date selected. The chosen day is highlighted and the others are more transparent.",
        es: "Los gráficos diarios de la pestaña General ahora muestran el mes completo hasta el día más reciente incluso con una fecha seleccionada. El día elegido queda resaltado y los demás más transparentes.",
      },
      {
        pt: "Agora dá para clicar na barra do gráfico para filtrar aquele dia. Clicar de novo na mesma barra limpa o filtro.",
        en: "You can now click a chart bar to filter by that day. Clicking the same bar again clears the filter.",
        es: "Ahora se puede hacer clic en la barra del gráfico para filtrar ese día. Hacer clic de nuevo en la misma barra limpia el filtro.",
      },
      {
        pt: "No Compara Anos, agora há um destaque no ano atual.",
        en: "In Compare Years, the current year is now highlighted.",
        es: "En Comparar Años, el año actual ahora está resaltado.",
      },
    ],
  },
  {
    data: "25/08/2026",
    itens: [
      {
        pt: "Atualização dos dados muito mais rápida: o painel volta a ler a planilha diretamente pelo link do Google Sheets, sem intermediários.",
        en: "Much faster data updates: the dashboard reads the spreadsheet directly from the Google Sheets link again, with no middlemen.",
        es: "Actualización de datos mucho más rápida: el panel vuelve a leer la hoja directamente por el enlace de Google Sheets, sin intermediarios.",
      },
    ],
  },
  {
    data: "24/08/2026",
    itens: [
      {
        pt: "Correção: os filtros escolhidos não são mais redefinidos pela atualização automática (a cada 10s). Os dados só recarregam quando há alteração na planilha.",
        en: "Fix: chosen filters are no longer reset by the automatic refresh (every 10s). Data only reloads when the spreadsheet changes.",
        es: "Corrección: los filtros elegidos ya no se restablecen con la actualización automática (cada 10s). Los datos solo se recargan cuando hay cambios en la hoja.",
      },
      {
        pt: "Segurança reforçada: a senha agora é validada no servidor, a sessão usa cookie seguro e os dados da planilha deixaram de ser públicos.",
        en: "Hardened security: the password is now validated on the server, the session uses a secure cookie, and spreadsheet data is no longer public.",
        es: "Seguridad reforzada: la contraseña ahora se valida en el servidor, la sesión usa una cookie segura y los datos de la hoja dejaron de ser públicos.",
      },
      {
        pt: "Atenção: a senha de administrador mudou. Dúvidas, fale com quem gerencia o sistema.",
        en: "Heads up: the administrator password has changed. If in doubt, contact whoever manages the system.",
        es: "Atención: la contraseña de administrador cambió. Si tienes dudas, consulta con quien administra el sistema.",
      },
      {
        pt: "Novidades agora mostram só as últimas 3 datas, com link para o histórico completo.",
        en: "What's new now shows only the latest 3 dates, with a link to the full history.",
        es: "Novedades ahora muestra solo las últimas 3 fechas, con enlace al historial completo.",
      },
    ],
  },
  {
    data: "21/08/2026",
    itens: [
      {
        pt: "Aviso ao entrar: os pesos são exibidos em toneladas (t).",
        en: "Notice on sign in: weights are displayed in metric tons (t).",
        es: "Aviso al ingresar: los pesos se muestran en toneladas (t).",
      },
      {
        pt: "Peso bruto em toneladas agora arredondado para no máximo 2 casas decimais.",
        en: "Gross weight in tonnes is now rounded to at most 2 decimal places.",
        es: "El peso bruto en toneladas ahora se redondea a un máximo de 2 decimales.",
      },
      {
        pt: "Novidades: botão de sino ao lado das bandeiras com o resumo das atualizações do dashboard.",
        en: "What's new: bell button next to the flags with a summary of dashboard updates.",
        es: "Novedades: botón de campana junto a las banderas con el resumen de las actualizaciones del dashboard.",
      },
      {
        pt: "Ícones renovados: sino, cadeados da senha e documento no botão de exportar PDF.",
        en: "Refreshed icons: bell, password padlocks and document icon on the export PDF button.",
        es: "Iconos renovados: campana, candados de contraseña e ícono de documento en el botón de exportar PDF.",
      },
      {
        pt: "Rótulo de média dos gráficos diários agora é um selo destacado no topo direito.",
        en: "Daily charts average label is now a highlighted badge in the top right.",
        es: "El rótulo de media de los gráficos diarios ahora es un sello destacado arriba a la derecha.",
      },
      {
        pt: "Grade de veículos com colunas ordenáveis (clique no título da coluna).",
        en: "Vehicle grid with sortable columns (click the column header).",
        es: "Tabla de vehículos con columnas ordenables (clic en el título de la columna).",
      },
      {
        pt: "Gráfico de distribuição (rosca) reduzido para os rótulos não cortarem sob o título.",
        en: "Distribution donut chart reduced so labels no longer get cut under the title.",
        es: "Gráfico de distribución (rosca) reducido para que los rótulos no se corten bajo el título.",
      },
    ],
  },
];

const chaveVeiculo = (v) => {
  const limpo = limparVeiculo(v);
  return (
    limpo.toLowerCase().replace(/[^a-z0-9]/g, "") || limpo || "(sem veículo)"
  );
};

const exibirVeiculo = (v) => {
  const nome =
    CANONICO_VEICULOS[chaveVeiculo(v)] || limparVeiculo(v) || "(sem veículo)";
  return nome.toUpperCase();
};

const montarDias = (rows, ano, mesIdx, diaMax) => {
  const base = rows.filter(
    (r) =>
      r.data.getFullYear() === ano &&
      r.data.getMonth() === mesIdx &&
      r.data.getDate() <= diaMax,
  );
  const dias = Array.from({ length: diaMax }, (_, i) => ({
    dia: i + 1,
    peso: 0,
    caixas: 0,
    qtd: 0,
    capacidade: 0,
  }));
  base.forEach((r) => {
    const d = dias[r.data.getDate() - 1];
    d.peso += r.peso;
    d.caixas += r.caixas;
    d.qtd++;
    d.capacidade += r.capacidade;
  });
  const linhas = (fn) => dias.map((d) => ({ dia: d.dia, valor: fn(d) }));
  const bloco = (fn, inteiro = false, mediaFn = null) => {
    const l = linhas(fn);
    const comValor = l.filter((x) => x.valor > 0);
    const media = mediaFn
      ? mediaFn()
      : comValor.length
        ? comValor.reduce((s, x) => s + x.valor, 0) / comValor.length
        : 0;
    return { linhas: l, media: inteiro ? Math.round(media) : media };
  };
  return {
    peso: bloco((d) => d.peso),
    caixas: bloco((d) => d.caixas, true),
    veiculos: bloco((d) => d.qtd, true),
    ocupacao: bloco(
      (d) => (d.capacidade ? (d.peso / d.capacidade) * 100 : 0),
      false,
      () => {
        const comCap = dias.filter((d) => d.capacidade > 0);
        if (!comCap.length) return 0;
        const pesoTotal = comCap.reduce((s, d) => s + d.peso, 0);
        const capTotal = comCap.reduce((s, d) => s + d.capacidade, 0);
        return (pesoTotal / capTotal) * 100;
      },
    ),
  };
};

const assinaturaRows = (rs) =>
  rs.length +
  "|" +
  rs
    .map((r) =>
      [
        r.romaneio,
        r.data ? r.data.getTime() : 0,
        r.peso,
        r.valor,
        r.caixas,
        r.caixasSF,
        r.entregas,
        r.capacidade,
        r.frete,
      ].join(","),
    )
    .join(";");

const shaHex = async (dados) => {
  const bytes =
    dados instanceof ArrayBuffer
      ? new Uint8Array(dados)
      : new TextEncoder().encode(String(dados));
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const agregarGrade = (lista) => {
  const map = new Map();
  lista.forEach((r) => {
    const v = chaveVeiculo(r.veiculo);
    const e =
      map.get(v) ||
      { veiculo: v, peso: 0, qtd: 0, entregas: 0, capacidade: 0, caixas: 0 };
    e.peso += r.peso;
    e.qtd++;
    e.entregas += r.entregas;
    e.capacidade += r.capacidade;
    e.caixas += r.caixas;
    map.set(v, e);
  });
  const linhas = [...map.values()].sort((a, b) => b.peso - a.peso);
  linhas.forEach((l) => {
    l.ocupacao = l.capacidade ? (l.peso / l.capacidade) * 100 : 0;
  });
  const total = linhas.reduce(
    (t, l) => {
      t.peso += l.peso;
      t.qtd += l.qtd;
      t.entregas += l.entregas;
      t.capacidade += l.capacidade;
      t.caixas += l.caixas;
      return t;
    },
    { veiculo: "Total", peso: 0, qtd: 0, entregas: 0, capacidade: 0, caixas: 0 },
  );
  total.ocupacao = total.capacidade
    ? (total.peso / total.capacidade) * 100
    : 0;
  return { linhas, total };
};

function Kpi({ label, value, sub, color }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>
        {value}
      </div>
      {sub != null && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function RotuloMedia({ viewBox, texto, fundo }) {
  if (!viewBox) return null;
  const direita = viewBox.x + viewBox.width - 10;
  const largura = texto.length * 7.2 + 18;
  const altura = 20;
  const topo = 4;
  return (
    <g>
      <rect
        x={direita - largura}
        y={topo}
        width={largura}
        height={altura}
        rx={3}
        fill={fundo}
      />
      <text
        x={direita - largura / 2}
        y={topo + altura / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={WHITE}
        fontSize={11}
        fontWeight={700}
      >
        {texto}
      </text>
    </g>
  );
}

function GraficoDias({ titulo, dados, cor, corLinha, formatar, destaque, aoClicar }) {
  const { t } = useI18n();
  return (
    <div className="card">
      <h2>{titulo}</h2>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={dados.linhas}
          margin={{ top: 28, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v) => formatar(v)}
            labelFormatter={(d) => t("comum.dia") + " " + d}
          />
          <Bar
            dataKey="valor"
            fill={cor}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            cursor={aoClicar ? "pointer" : "default"}
            onClick={
              aoClicar
                ? (d) => aoClicar(d && d.payload ? d.payload.dia : d && d.dia)
                : undefined
            }
          >
            {dados.linhas.map((l) => (
              <Cell
                key={l.dia}
                fill={cor}
                fillOpacity={destaque != null && l.dia !== destaque ? 0.88 : 1}
              />
            ))}
            <LabelList
              dataKey="valor"
              position="top"
              formatter={(v) => formatar(v)}
              style={{ fontSize: 11, fill: "#475569" }}
            />
          </Bar>
          <ReferenceLine
            y={dados.media}
            stroke={corLinha}
            strokeWidth={2}
            strokeDasharray="6 4"
            label={
              <RotuloMedia
                texto={`${t("comum.media")} ${formatar(dados.media)}`}
                fundo={corLinha}
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function GradeAno({ grid, metrica, ateMes = 12, anoDestaque }) {
  const { t, meses } = useI18n();
  const valorDa = (c) => {
    if (metrica === "peso") return c.peso;
    if (metrica === "caixas") return c.caixas;
    if (metrica === "veiculos") return c.qtd;
    if (metrica === "entregas") return c.entregas;
    return c.capacidade ? (c.peso / c.capacidade) * 100 : 0;
  };

  const fmt = METRICAS[metrica].fmt;
  const mesesVisiveis = meses.slice(0, ateMes);
  const linhaTotal = grid.reduce(
    (t, l) => {
      l.meses.forEach((c, i) => {
        t.meses[i].peso += c.peso;
        t.meses[i].caixas += c.caixas;
        t.meses[i].entregas += c.entregas;
        t.meses[i].qtd += c.qtd;
        t.meses[i].capacidade += c.capacidade;
      });
      return t;
    },
    {
      ano: "Total",
      meses: Array.from({ length: 12 }, () => ({
        peso: 0,
        caixas: 0,
        entregas: 0,
        qtd: 0,
        capacidade: 0,
      })),
    },
  );

  const somaMeses = (meses) =>
    meses.slice(0, ateMes).reduce(
      (t, c) => {
        t.peso += c.peso;
        t.caixas += c.caixas;
        t.entregas += c.entregas;
        t.qtd += c.qtd;
        t.capacidade += c.capacidade;
        return t;
      },
      { peso: 0, caixas: 0, entregas: 0, qtd: 0, capacidade: 0 },
    );

  const valorTotal = (meses) => {
    const t = somaMeses(meses);
    if (metrica === "ocupacao")
      return t.capacidade ? (t.peso / t.capacidade) * 100 : 0;
    if (metrica === "peso") return t.peso;
    if (metrica === "caixas") return t.caixas;
    if (metrica === "veiculos") return t.qtd;
    return t.entregas;
  };

  return (
    <div className="card">
      <h2>{t("met." + metrica)}</h2>
      <div className="table-scroll">
        <table className="tabela grade comparar">
          <thead>
            <tr>
              <th>{t("comparar.ano")}</th>
              {mesesVisiveis.map((m) => (
                <th key={m} className="num">
                  {m}
                </th>
              ))}
              <th className="num">{t("comparar.total")}</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((l) => (
              <tr key={l.ano} className={l.ano === anoDestaque ? "ano-atual" : ""}>
                <td>{l.ano}</td>
                {l.meses.slice(0, ateMes).map((c, i) => (
                  <td key={i} className="num">
                    {c.qtd ? fmt(valorDa(c)) : "—"}
                  </td>
                ))}
                <td className="num total">{fmt(valorTotal(l.meses))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>{t("comparar.total")}</td>
              {linhaTotal.meses.slice(0, ateMes).map((c, i) => (
                <td key={i} className="num">
                  {c.qtd ? fmt(valorDa(c)) : "—"}
                </td>
              ))}
              <td className="num total">{fmt(valorTotal(linhaTotal.meses))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CompararAnos({ rows }) {
  const grid = useMemo(() => {
    const anos = [...new Set(rows.map((r) => r.data.getFullYear()))].sort(
      (a, b) => a - b,
    );
    const acum = anos.map((a) => ({
      ano: a,
      meses: Array.from({ length: 12 }, () => ({
        peso: 0,
        caixas: 0,
        entregas: 0,
        qtd: 0,
        capacidade: 0,
      })),
    }));
    rows.forEach((r) => {
      const ai = anos.indexOf(r.data.getFullYear());
      const c = acum[ai].meses[r.data.getMonth()];
      c.peso += r.peso;
      c.caixas += r.caixas;
      c.entregas += r.entregas;
      c.qtd++;
      c.capacidade += r.capacidade;
    });
    return acum;
  }, [rows]);

  return (
    <div className="comparar-stack">
      {Object.keys(METRICAS).map((m) => (
        <GradeAno
          key={m}
          grid={grid}
          metrica={m}
          anoDestaque={new Date().getFullYear()}
        />
      ))}
    </div>
  );
}

function Acumulado({ rows, dataMax, dataMin }) {
  const { t } = useI18n();
  const [corte, setCorte] = useState("");

  useEffect(() => {
    if (!corte && dataMax) setCorte(isoDate(dataMax));
  }, [dataMax, corte]);

  const grid = useMemo(() => {
    if (!corte) return [];
    const [cy, cm, cd] = corte.split("-").map(Number);
    const anos = [...new Set(rows.map((r) => r.data.getFullYear()))].sort(
      (a, b) => a - b,
    );
    const acum = anos.map((a) => ({
      ano: a,
      meses: Array.from({ length: 12 }, () => ({
        peso: 0,
        caixas: 0,
        entregas: 0,
        qtd: 0,
        capacidade: 0,
      })),
    }));
    rows.forEach((r) => {
      if (r.data.getMonth() > cm - 1) return;
      if (r.data.getDate() > cd) return;
      const ai = anos.indexOf(r.data.getFullYear());
      const c = acum[ai].meses[r.data.getMonth()];
      c.peso += r.peso;
      c.caixas += r.caixas;
      c.entregas += r.entregas;
      c.qtd++;
      c.capacidade += r.capacidade;
    });
    return acum;
  }, [rows, corte]);

  const dia = corte ? Number(corte.split("-")[2]) : "";
  const mesCorte = corte ? Number(corte.split("-")[1]) : 12;

  return (
    <>
      <div className="card">
        <div className="grafico-header">
          <h2>
            {t("acum.titulo", { dia })}{" "}
            <span className="contagem">{t("acum.todosAnos")}</span>
          </h2>
          <label className="filtro-data">
            <span>{t("acum.diaRef")}</span>
            <input
              type="date"
              value={corte}
              onChange={(e) => setCorte(e.target.value)}
            />
          </label>
        </div>
        <p className="subtitle" style={{ margin: 0 }}>
          {t("acum.subtitle", {
            dia,
            data: dataMax ? dataMax.toLocaleDateString("pt-BR") : "—",
          })}
        </p>
      </div>
      <div className="comparar-stack">
        {Object.keys(METRICAS).map((m) => (
          <GradeAno key={m} grid={grid} metrica={m} ateMes={mesCorte} />
        ))}
      </div>
    </>
  );
}

function DiaADia({ rows }) {
  const { t, meses } = useI18n();
  const [graAno, setGraAno] = useState("");
  const [graMes, setGraMes] = useState("");

  const anosDisponiveis = useMemo(
    () =>
      [...new Set(rows.map((r) => r.data.getFullYear()))].sort((a, b) => b - a),
    [rows],
  );

  useEffect(() => {
    if (anosDisponiveis.length && !graAno)
      setGraAno(String(anosDisponiveis[0]));
  }, [anosDisponiveis, graAno]);

  const mesesDisponiveis = useMemo(() => {
    if (!graAno) return [];
    return meses
      .map((_, i) => i)
      .filter((m) =>
        rows.some(
          (r) =>
            r.data.getFullYear() === Number(graAno) && r.data.getMonth() === m,
        ),
      );
  }, [rows, graAno, meses]);

  useEffect(() => {
    if (mesesDisponiveis.length && !graMes)
      setGraMes(String(mesesDisponiveis[mesesDisponiveis.length - 1]));
  }, [mesesDisponiveis, graMes]);

  const graDados = useMemo(() => {
    if (!graAno || !graMes) return null;
    const ano = Number(graAno);
    const mes = Number(graMes);
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    return { ...montarDias(rows, ano, mes, ultimoDia) };
  }, [rows, graAno, graMes]);

  return (
    <>
      <div className="card">
        <div className="grafico-header">
          <h2>
            {t("dia.titulo")}{" "}
            <span className="contagem">
              ({graMes !== "" ? meses[Number(graMes)] + " de " + graAno : ""})
            </span>
          </h2>
          <div className="det-filtro">
            <select
              value={graAno}
              onChange={(e) => {
                setGraAno(e.target.value);
                setGraMes("");
              }}
            >
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select value={graMes} onChange={(e) => setGraMes(e.target.value)}>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {meses[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="subtitle" style={{ margin: 0 }}>
          {t("dia.subtitle")}
        </p>
      </div>
      {graDados ? (
        <div className="grid-charts">
          <GraficoDias
            titulo={`${t("dias.peso")} · ${meses[Number(graMes)]}/${graAno}`}
            dados={graDados.peso}
            cor={NAVY}
            corLinha={GOLD}
            formatar={fmtTon}
          />
          <GraficoDias
            titulo={`${t("dias.caixas")} · ${meses[Number(graMes)]}/${graAno}`}
            dados={graDados.caixas}
            cor={GOLD}
            corLinha={NAVY}
            formatar={fmt}
          />
          <GraficoDias
            titulo={`${t("dias.ocupacao")} · ${meses[Number(graMes)]}/${graAno}`}
            dados={graDados.ocupacao}
            cor={NAVY_DARK}
            corLinha={GOLD}
            formatar={fmtPct}
          />
          <GraficoDias
            titulo={`${t("dias.veiculos")} · ${meses[Number(graMes)]}/${graAno}`}
            dados={graDados.veiculos}
            cor={GOLD}
            corLinha={NAVY}
            formatar={fmt}
          />
        </div>
      ) : (
        <div className="card">
          <p className="subtitle" style={{ margin: 0 }}>
            {t("dia.selecione")}
          </p>
        </div>
      )}
    </>
  );
}

function ResumoGeral({ rows }) {
  const { t, meses } = useI18n();
  const [ano, setAno] = useState("");
  const [veiculo, setVeiculo] = useState("todos");

  const anos = useMemo(
    () =>
      [...new Set(rows.map((r) => r.data.getFullYear()))].sort((a, b) => b - a),
    [rows],
  );

  useEffect(() => {
    if (anos.length && !ano) setAno(String(anos[0]));
  }, [anos, ano]);

  const veiculos = useMemo(() => {
    const set = new Set(rows.map((r) => chaveVeiculo(r.veiculo)));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const montarMeses = useMemo(
    () => (fnFiltro) => {
      const mesesArr = Array.from({ length: 12 }, (_, i) => ({
        mes: meses[i],
        peso: 0,
        caixas: 0,
        entregas: 0,
        qtd: 0,
        capacidade: 0,
      }));
      rows.forEach((r) => {
        if (r.data.getFullYear() !== Number(ano)) return;
        if (fnFiltro && !fnFiltro(r)) return;
        const m = mesesArr[r.data.getMonth()];
        m.peso += r.peso;
        m.caixas += r.caixas;
        m.entregas += r.entregas;
        m.qtd++;
        m.capacidade += r.capacidade;
      });
      return mesesArr;
    },
    [rows, ano, meses],
  );

  const resumo = useMemo(() => montarMeses(null), [montarMeses]);

  const porMes = useMemo(
    () =>
      montarMeses(
        veiculo === "todos" ? null : (r) => chaveVeiculo(r.veiculo) === veiculo,
      ),
    [montarMeses, veiculo],
  );

  const totalResumo = resumo.reduce(
    (t, m) => {
      t.peso += m.peso;
      t.caixas += m.caixas;
      t.entregas += m.entregas;
      t.qtd += m.qtd;
      t.capacidade += m.capacidade;
      return t;
    },
    { peso: 0, caixas: 0, entregas: 0, qtd: 0, capacidade: 0 },
  );

  const totalPorMes = porMes.reduce(
    (t, m) => {
      t.peso += m.peso;
      t.caixas += m.caixas;
      t.entregas += m.entregas;
      t.qtd += m.qtd;
      t.capacidade += m.capacidade;
      return t;
    },
    { peso: 0, caixas: 0, entregas: 0, qtd: 0, capacidade: 0 },
  );

  const fmtOcup = (m) =>
    m.qtd
      ? m.capacidade
        ? ((m.peso / m.capacidade) * 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          }) + "%"
        : "—"
      : "—";

  return (
    <>
      <div className="card">
        <div className="grafico-header">
          <h2>
            {t("resumo.titulo")}{" "}
            <span className="contagem">
              ({t("resumo.mesCompleto")} · {ano})
            </span>
          </h2>
          <div className="det-filtro">
            <select value={ano} onChange={(e) => setAno(e.target.value)}>
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="tabela grade comparar">
            <thead>
              <tr>
                <th>{t("resumo.mes")}</th>
                <th className="num">{t("met.caixas")}</th>
                <th className="num">{t("met.peso")}</th>
                <th className="num">{t("met.entregas")}</th>
                <th className="num">{t("met.veiculos")}</th>
                <th className="num">{t("met.ocupacao")}</th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((m) => (
                <tr key={m.mes}>
                  <td>{m.mes}</td>
                  <td className="num">{m.qtd ? fmt(m.caixas) : "—"}</td>
                  <td className="num">{m.qtd ? fmtTon(m.peso) : "—"}</td>
                  <td className="num">{m.qtd ? fmt(m.entregas) : "—"}</td>
                  <td className="num">{m.qtd ? fmt(m.qtd) : "—"}</td>
                  <td className="num">{fmtOcup(m)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("resumo.total")}</td>
                <td className="num">{fmt(totalResumo.caixas)}</td>
                <td className="num">{fmtTon(totalResumo.peso)}</td>
                <td className="num">{fmt(totalResumo.entregas)}</td>
                <td className="num">{fmt(totalResumo.qtd)}</td>
                <td className="num">
                  {totalResumo.capacidade
                    ? (
                        (totalResumo.peso / totalResumo.capacidade) *
                        100
                      ).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) +
                      "%"
                    : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="grafico-header">
          <h2>
            {t("resumo.acumulado")}{" "}
            <span className="contagem">
              (
              {veiculo === "todos"
                ? t("resumo.todosVeiculos")
                : exibirVeiculo(veiculo)}{" "}
              · {ano})
            </span>
          </h2>
          <div className="det-filtro">
            <select
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            >
              <option value="todos">{t("resumo.todosVeiculosOpcao")}</option>
              {veiculos.map((v) => (
                <option key={v} value={v}>
                  {exibirVeiculo(v)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="tabela grade comparar">
            <thead>
              <tr>
                <th>{t("resumo.mes")}</th>
                <th className="num">{t("met.caixas")}</th>
                <th className="num">{t("met.peso")}</th>
                <th className="num">{t("met.entregas")}</th>
                <th className="num">{t("met.veiculos")}</th>
                <th className="num">{t("met.ocupacao")}</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((m) => (
                <tr key={m.mes}>
                  <td>{m.mes}</td>
                  <td className="num">{m.qtd ? fmt(m.caixas) : "—"}</td>
                  <td className="num">{m.qtd ? fmtTon(m.peso) : "—"}</td>
                  <td className="num">{m.qtd ? fmt(m.entregas) : "—"}</td>
                  <td className="num">{m.qtd ? fmt(m.qtd) : "—"}</td>
                  <td className="num">{fmtOcup(m)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("resumo.total")}</td>
                <td className="num">{fmt(totalPorMes.caixas)}</td>
                <td className="num">{fmtTon(totalPorMes.peso)}</td>
                <td className="num">{fmt(totalPorMes.entregas)}</td>
                <td className="num">{fmt(totalPorMes.qtd)}</td>
                <td className="num">
                  {totalPorMes.capacidade
                    ? (
                        (totalPorMes.peso / totalPorMes.capacidade) *
                        100
                      ).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) +
                      "%"
                    : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

function Login({ onLogin, aviso }) {
  const { t, lang, setLang } = useI18n();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!senha || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch(URL_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (res.ok) {
        const dados = await res.json().catch(() => ({}));
        onLogin(!!dados.admin);
        return;
      }
      setErro(res.status === 401 ? "senha" : "servidor");
    } catch {
      setErro("servidor");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />
      <form className="login-card" onSubmit={entrar}>
        <img src="/logo.svg" alt="Logo" className="login-logo" />
        <label className="login-label">
          <span>{t("login.password")}</span>
          <div className="login-input-wrap">
            <input
              type={mostrar ? "text" : "password"}
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro("");
              }}
              placeholder={t("login.placeholder")}
              autoFocus
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setMostrar(!mostrar)}
              title={mostrar ? t("login.ocultar") : t("login.mostrar")}
              aria-label={mostrar ? t("login.ocultar") : t("login.mostrar")}
            >
              {mostrar ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.4453 2.75 16.5018 4.42242 17.0846 6.68694C17.1879 7.08808 17.5968 7.32957 17.9979 7.22633C18.3991 7.12308 18.6405 6.7142 18.5373 6.31306C17.788 3.4019 15.1463 1.25 12 1.25C8.27208 1.25 5.25 4.27208 5.25 8V10.0546C4.13525 10.1379 3.40931 10.348 2.87868 10.8787C2 11.7574 2 13.1716 2 16C2 18.8284 2 20.2426 2.87868 21.1213C3.75736 22 5.17157 22 8 22H16C18.8284 22 20.2426 22 21.1213 21.1213C22 20.2426 22 18.8284 22 16C22 13.1716 22 11.7574 21.1213 10.8787C20.2426 10 18.8284 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM8 17C8.55228 17 9 16.5523 9 16C9 15.4477 8.55228 15 8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17ZM17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16C15 15.4477 15.4477 15 16 15C16.5523 15 17 15.4477 17 16Z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM8 17C8.55228 17 9 16.5523 9 16C9 15.4477 8.55228 15 8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17ZM17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16C15 15.4477 15.4477 15 16 15C16.5523 15 17 15.4477 17 16Z"
                  />
                </svg>
              )}
            </button>
          </div>
        </label>
        {aviso && (
          <div className="login-aviso">{t("login.sessaoExpirada")}</div>
        )}
        {erro === "senha" && (
          <div className="login-erro">{t("login.senhaInvalida")}</div>
        )}
        {erro === "servidor" && (
          <div className="login-erro">{t("login.servidor")}</div>
        )}
        <button type="submit" className="login-entrar" disabled={enviando}>
          {enviando ? t("login.entrando") : t("login.entrar")}
        </button>
      </form>
      <div className="login-acoes">
        <Bandeiras lang={lang} setLang={setLang} className="login-bandeiras" />
        <button
          className="login-reportar"
          onClick={() =>
            window.open(
              "https://forms.gle/Fpm6z8k3iwiRN2ZBA",
              "_blank",
              "noopener",
            )
          }
          title={t("header.reportar")}
          aria-label={t("header.reportar")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.416 2.62412C17.7607 2.39435 17.8538 1.9287 17.624 1.58405C17.3943 1.23941 16.9286 1.14628 16.584 1.37604L13.6687 3.31955C13.1527 3.11343 12.5897 3.00006 12.0001 3.00006C11.4105 3.00006 10.8474 3.11345 10.3314 3.31962L7.41603 1.37604C7.07138 1.14628 6.60573 1.23941 6.37596 1.58405C6.1462 1.9287 6.23933 2.39435 6.58397 2.62412L8.9437 4.19727C8.24831 4.84109 7.75664 5.70181 7.57617 6.6719C8.01128 6.55973 8.46749 6.50006 8.93763 6.50006H15.0626C15.5328 6.50006 15.989 6.55973 16.4241 6.6719C16.2436 5.70176 15.7519 4.841 15.0564 4.19717L17.416 2.62412Z" />
            <path d="M1.25 14.0001C1.25 13.5859 1.58579 13.2501 2 13.2501H5V11.9376C5 11.1019 5.26034 10.327 5.70435 9.68959L3.22141 8.69624C2.83684 8.54238 2.6498 8.10589 2.80366 7.72131C2.95752 7.33673 3.39401 7.1497 3.77859 7.30356L6.91514 8.55841C7.50624 8.20388 8.19807 8.00006 8.9375 8.00006H15.0625C15.8019 8.00006 16.4938 8.20388 17.0849 8.55841L20.2214 7.30356C20.606 7.1497 21.0425 7.33673 21.1963 7.72131C21.3502 8.10589 21.1632 8.54238 20.7786 8.69624L18.2957 9.68959C18.7397 10.327 19 11.1019 19 11.9376V13.2501H22C22.4142 13.2501 22.75 13.5859 22.75 14.0001C22.75 14.4143 22.4142 14.7501 22 14.7501H19V15.0001C19 16.1808 18.7077 17.2932 18.1915 18.2689L20.7786 19.3039C21.1632 19.4578 21.3502 19.8943 21.1963 20.2789C21.0425 20.6634 20.606 20.8505 20.2214 20.6966L17.3288 19.5394C16.1974 20.8664 14.5789 21.7655 12.75 21.9604V15.0001C12.75 14.5858 12.4142 14.2501 12 14.2501C11.5858 14.2501 11.25 14.5858 11.25 15.0001V21.9604C9.42109 21.7655 7.80265 20.8664 6.67115 19.5394L3.77859 20.6966C3.39401 20.8505 2.95752 20.6634 2.80366 20.2789C2.6498 19.8943 3.22141 19.4578 3.77859 19.3039L5.80852 18.2689C5.29231 17.2932 5 16.1808 5 15.0001V14.7501H2C1.58579 14.7501 1.25 14.4143 1.25 14.0001Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PainelAdmin({ rows }) {
  const { t } = useI18n();
  const [filtro, setFiltro] = useState("todos");

  const problemas = useMemo(() => {
    return rows
      .filter((r) => PROBLEMAS.some((p) => p.teste(r)))
      .map((r) => ({
        ...r,
        problemas: PROBLEMAS.filter((p) => p.teste(r)).map((p) =>
          t("admin.prob." + p.key),
        ),
      }))
      .sort((a, b) => b.data - a.data);
  }, [rows, t]);

  const contagens = useMemo(() => {
    const c = { total: 0 };
    PROBLEMAS.forEach((p) => {
      c[p.key] = 0;
    });
    rows.forEach((r) => {
      let achou = false;
      PROBLEMAS.forEach((p) => {
        if (p.teste(r)) {
          c[p.key]++;
          achou = true;
        }
      });
      if (achou) c.total++;
    });
    return c;
  }, [rows]);

  const exibidos =
    filtro === "todos"
      ? problemas
      : problemas.filter((r) => {
          const p = PROBLEMAS.find((x) => x.key === filtro);
          return p && p.teste(r);
        });

  return (
    <section className="card detalhes">
      <div className="grafico-header">
        <h2>
          {t("admin.titulo")}{" "}
          <span className="contagem">
            ({fmt(problemas.length)} {t("admin.paraTratar")})
          </span>
        </h2>
        <div className="admin-acoes">
          <button
            className="btn-planilha"
            onClick={() => window.open(URL_PLANILHA, "_blank", "noopener")}
            title={t("admin.abrirPlanilha")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 5.5C3 4.11929 4.11929 3 5.5 3H18.5C19.8807 3 21 4.11929 21 5.5V18.5C21 19.8807 19.8807 21 18.5 21H5.5C4.11929 21 3 19.8807 3 18.5V5.5ZM5 9V18.5C5 18.7761 5.22386 19 5.5 19H11V9H5ZM13 9V19H18.5C18.7761 19 19 18.7761 19 18.5V9H13ZM19 7V5.5C19 5.22386 18.7761 5 18.5 5H5.5C5.22386 5 5 5.22386 5 5.5V7H19Z" />
            </svg>
            {t("admin.abrirPlanilha")}
          </button>
          <div className="seg-botoes">
            <button
              className={filtro === "todos" ? "ativo" : ""}
              onClick={() => setFiltro("todos")}
            >
              {t("comum.todos")}
            </button>
            {PROBLEMAS.map((p) => (
              <button
                key={p.key}
                className={filtro === p.key ? "ativo" : ""}
                onClick={() => setFiltro(p.key)}
              >
                {t("admin.prob." + p.key)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section className="kpis admin-kpis">
        <Kpi
          label={t("admin.aguardando")}
          value={fmt(contagens.total)}
          sub={t("admin.comProblema")}
          color={GOLD}
        />
        {PROBLEMAS.map((p, i) => (
          <Kpi
            key={p.key}
            label={t("admin.prob." + p.key)}
            value={fmt(contagens[p.key])}
            color={i % 2 ? NAVY : NAVY_DARK}
          />
        ))}
      </section>
      <div className="table-scroll">
        <table className="tabela grade">
          <thead>
            <tr>
              <th>{t("det.romaneio")}</th>
              <th>{t("det.data")}</th>
              <th>{t("det.motorista")}</th>
              <th>{t("det.placa")}</th>
              <th>{t("det.veiculo")}</th>
              <th className="num">{t("admin.col.capacidade")}</th>
              <th className="num">{t("det.entr")}</th>
              <th>{t("admin.col.problemas")}</th>
            </tr>
          </thead>
          <tbody>
            {exibidos.map((r) => (
              <tr key={r.romaneio}>
                <td>{r.romaneio}</td>
                <td>{r.data.toLocaleDateString("pt-BR")}</td>
                <td>{r.motorista}</td>
                <td>{r.placa}</td>
                <td>{r.veiculo.trim() ? exibirVeiculo(r.veiculo) : "—"}</td>
                <td className="num">
                  {r.capacidade ? fmt(r.capacidade) : "—"}
                </td>
                <td className="num">{fmt(r.entregas)}</td>
                <td>{r.problemas.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avisoSessao, setAvisoSessao] = useState(false);
  const ultimaAtividade = useRef(Date.now());
  const [rows, setRows] = useState([]);
  const assinaturaRef = useRef("");
  const textoHashRef = useRef("");
  const falhasRef = useRef(0);
  const dataSelPronto = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mes, setMes] = useState("all");
  const [ano, setAno] = useState("all");
  const [pagina, setPagina] = useState(0);
  const [dataSel, setDataSel] = useState("");
  const [detMesAno, setDetMesAno] = useState("");
  const [detMesMes, setDetMesMes] = useState("");
  const [lang, setLang] = useState("pt");
  const abasRef = useRef(null);
  const emailCaptureRef = useRef(null);
  const [ind, setInd] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    visivel: false,
  });
  const POR_PAGINA = 25;
  const t = (key, vars) => traduzir(lang, key, vars);
  const meses = MESES_POR_LINGUA[lang];

  useEffect(() => {
    if (rows.length && !detMesAno) {
      const anos = [...new Set(rows.map((r) => r.data.getFullYear()))].sort(
        (a, b) => b - a,
      );
      if (anos.length) setDetMesAno(anos[0]);
    }
  }, [rows]);

  useEffect(() => {
    if (rows.length && detMesAno && !detMesMes) {
      const mesesArr = meses
        .map((_, i) => i)
        .filter((m) =>
          rows.some(
            (r) =>
              r.data.getFullYear() === detMesAno && r.data.getMonth() === m,
          ),
        );
      if (mesesArr.length) setDetMesMes(String(mesesArr[mesesArr.length - 1]));
    }
  }, [rows, detMesAno, meses]);

  useEffect(() => {
    if (!autenticado) return;
    const atualizar = () => {
      ultimaAtividade.current = Date.now();
    };
    const eventos = ["mousemove", "click", "keydown", "touchstart", "scroll"];
    eventos.forEach((e) => window.addEventListener(e, atualizar));
    const id = setInterval(() => {
      if (Date.now() - ultimaAtividade.current > SESSAO_MS) {
        setAvisoSessao(true);
        setAutenticado(false);
      }
    }, 30000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, atualizar));
      clearInterval(id);
    };
  }, [autenticado]);

  useEffect(() => {
    let ativo = true;
    fetch(URL_LOGIN)
      .then((res) => res.json())
      .then((d) => {
        if (!ativo) return;
        if (d && d.autenticado) {
          setIsAdmin(!!d.admin);
          setAutenticado(true);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    let ativo = true;
    let buscando = false;

    const carregar = () => {
      if (buscando) return;
      buscando = true;
      fetch(URL_DADOS)
        .then((res) => {
          if (!res.ok) throw new Error(t("comum.falhaPlanilha"));
          return res.arrayBuffer();
        })
        .then(async (buf) => {
          if (!ativo) return;
          const hash = await shaHex(buf);
          if (!ativo) return;
          setError(null);
          falhasRef.current = 0;
          if (hash === textoHashRef.current) return;
          textoHashRef.current = hash;
          const novas = parseXlsx(buf);
          const assinatura = assinaturaRows(novas);
          if (assinatura !== assinaturaRef.current) {
            assinaturaRef.current = assinatura;
            setRows(novas);
          }
        })
        .catch((e) => {
          if (!ativo) return;
          falhasRef.current++;
          setError(e.message);
        })
        .finally(() => {
          buscando = false;
          if (ativo) setLoading(false);
        });
    };

    carregar();

    const timer = setInterval(carregar, POLL_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [autenticado]);

  const dataMax = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce((max, r) => (r.data > max ? r.data : max), rows[0].data);
  }, [rows]);

  const dataMin = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce((min, r) => (r.data < min ? r.data : min), rows[0].data);
  }, [rows]);

  const maxDataAno = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const a = r.data.getFullYear();
      if (!map.has(a) || r.data > map.get(a)) map.set(a, r.data);
    });
    return map;
  }, [rows]);

  const adminAguardando = useMemo(
    () => rows.filter((r) => PROBLEMAS.some((p) => p.teste(r))).length,
    [rows],
  );

  const aoMudarAno = (e) => {
    const novo = e.target.value === "all" ? "all" : Number(e.target.value);
    setAno(novo);
    setDataSel(novo === "all" ? "" : isoDate(maxDataAno.get(novo)));
  };

  useEffect(() => {
    if (dataMax && !dataSelPronto.current) {
      dataSelPronto.current = true;
      setDataSel(isoDate(dataMax));
    }
  }, [dataMax]);

  const anosDisponiveis = useMemo(
    () =>
      [...new Set(rows.map((r) => r.data.getFullYear()))].sort((a, b) => a - b),
    [rows],
  );

  useEffect(() => {
    if (anosDisponiveis.length && ano === "all")
      setAno(Math.max(...anosDisponiveis));
  }, [anosDisponiveis]);

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (dataSel && isoDate(r.data) !== dataSel) return false;
      if (ano !== "all" && r.data.getFullYear() !== ano) return false;
      return true;
    });
  }, [rows, dataSel, ano]);

  const anosDetalhe = useMemo(
    () =>
      [...new Set(rows.map((r) => r.data.getFullYear()))].sort((a, b) => b - a),
    [rows],
  );

  const mesesDetalhe = useMemo(() => {
    if (!detMesAno) return [];
    return meses
      .map((_, i) => i)
      .filter((m) =>
        rows.some(
          (r) => r.data.getFullYear() === detMesAno && r.data.getMonth() === m,
        ),
      );
  }, [rows, detMesAno, meses]);

  const detalheRows = useMemo(() => {
    return rows.filter(
      (r) =>
        r.data.getFullYear() === Number(detMesAno) &&
        r.data.getMonth() === Number(detMesMes),
    );
  }, [rows, detMesAno, detMesMes]);

  const COLUNAS_DETALHE = [
    { key: "romaneio", rotulo: t("det.romaneio"), tipo: "numero" },
    { key: "data", rotulo: t("det.data"), tipo: "data" },
    { key: "motorista", rotulo: t("det.motorista"), tipo: "texto" },
    { key: "placa", rotulo: t("det.placa"), tipo: "texto" },
    { key: "veiculo", rotulo: t("det.veiculo"), tipo: "texto" },
    { key: "peso", rotulo: t("met.peso"), tipo: "numero" },
    { key: "valor", rotulo: t("det.valor"), tipo: "numero" },
    { key: "ocupacao", rotulo: t("det.ocup"), tipo: "numero" },
    { key: "entregas", rotulo: t("det.entr"), tipo: "numero" },
    { key: "frete", rotulo: t("det.frete"), tipo: "numero" },
  ];

  const COLUNAS_GRADE = [
    { key: "veiculo", rotulo: t("grade.tipo"), tipo: "texto" },
    { key: "peso", rotulo: t("grade.peso"), tipo: "numero" },
    { key: "qtd", rotulo: t("grade.qtd"), tipo: "numero" },
    { key: "entregas", rotulo: t("met.entregas"), tipo: "numero" },
    { key: "caixas", rotulo: t("met.caixas"), tipo: "numero" },
    { key: "ocupacao", rotulo: t("grade.ocup"), tipo: "numero" },
  ];

  const [ordena, setOrdena] = useState("data");
  const [ordemAsc, setOrdemAsc] = useState(false);

  const aoOrdenar = (key) => {
    if (ordena === key) setOrdemAsc(!ordemAsc);
    else {
      setOrdena(key);
      setOrdemAsc(true);
    }
  };

  const detalheOrdenadas = useMemo(() => {
    const col = COLUNAS_DETALHE.find((c) => c.key === ordena);
    const lista = [...detalheRows];
    lista.sort((a, b) => {
      let va = a[col.key],
        vb = b[col.key];
      if (col.key === "veiculo") {
        va = limparVeiculo(va);
        vb = limparVeiculo(vb);
      }
      let cmp;
      if (col.tipo === "numero") cmp = (va || 0) - (vb || 0);
      else if (col.tipo === "data") cmp = va - vb;
      else cmp = String(va || "").localeCompare(String(vb || ""), "pt-BR");
      return ordemAsc ? cmp : -cmp;
    });
    return lista;
  }, [detalheRows, ordena, ordemAsc]);

  const kpis = useMemo(() => {
    const peso = filtrados.reduce((a, r) => a + r.peso, 0);
    const capacidade = filtrados.reduce((a, r) => a + r.capacidade, 0);
    const entregas = filtrados.reduce((a, r) => a + r.entregas, 0);
    const caixas = filtrados.reduce((a, r) => a + r.caixas, 0);
    return {
      n: filtrados.length,
      peso,
      entregas,
      caixas,
      ocupacao: capacidade ? (peso / capacidade) * 100 : 0,
    };
  }, [filtrados]);

  const diasDados = useMemo(() => {
    const ref = dataSel || (dataMax ? isoDate(dataMax) : "");
    if (!ref) return null;
    const [cy, cm, cd] = ref.split("-").map(Number);
    let diaUltimo = 0;
    rows.forEach((r) => {
      if (r.data.getFullYear() === cy && r.data.getMonth() === cm - 1) {
        const d = r.data.getDate();
        if (d > diaUltimo) diaUltimo = d;
      }
    });
    if (!diaUltimo) return null;
    return {
      ref: { ano: cy, mes: cm, dia: cd },
      diaSel: dataSel ? cd : null,
      ...montarDias(rows, cy, cm - 1, diaUltimo),
    };
  }, [rows, dataSel, dataMax]);

  const aoClicarDiaGeral = (dia) => {
    if (!diasDados || !dia) return;
    const { ano, mes } = diasDados.ref;
    const alvo = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    setDataSel(alvo === dataSel ? (dataMax ? isoDate(dataMax) : "") : alvo);
  };
  const gradeVeiculos = useMemo(() => agregarGrade(filtrados), [filtrados]);

  const [ordenaGrade, setOrdenaGrade] = useState("peso");
  const [ordemAscGrade, setOrdemAscGrade] = useState(false);

  const aoOrdenarGrade = (key) => {
    if (ordenaGrade === key) setOrdemAscGrade(!ordemAscGrade);
    else {
      setOrdenaGrade(key);
      setOrdemAscGrade(true);
    }
  };

  const gradeLinhas = useMemo(() => {
    const col = COLUNAS_GRADE.find((c) => c.key === ordenaGrade);
    const lista = [...gradeVeiculos.linhas];
    lista.sort((a, b) => {
      let va = a[col.key],
        vb = b[col.key];
      if (col.key === "veiculo") {
        va = exibirVeiculo(va);
        vb = exibirVeiculo(vb);
      }
      const cmp =
        col.tipo === "numero"
          ? (va || 0) - (vb || 0)
          : String(va || "").localeCompare(String(vb || ""), "pt-BR");
      return ordemAscGrade ? cmp : -cmp;
    });
    return lista;
  }, [gradeVeiculos, ordenaGrade, ordemAscGrade]);

  const [aba, setAba] = useState("geral");
  const [distModo, setDistModo] = useState("veiculos");
  const [exportModal, setExportModal] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [exportSel, setExportSel] = useState({
    geral: true,
    resumo: true,
    anos: true,
    acumulado: true,
    diadia: true,
    admin: true,
  });
  const [sinoAberto, setSinoAberto] = useState(false);
  const [sinoVisto, setSinoVisto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [avisoTon, setAvisoTon] = useState(false);

  useEffect(() => {
    if (!sinoAberto && !historicoAberto) return;
    const fechar = (e) => {
      if (
        !e.target.closest(".sino-wrap") &&
        !e.target.closest(".historico-modal")
      )
        setSinoAberto(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") {
        setSinoAberto(false);
        setHistoricoAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", tecla);
    };
  }, [sinoAberto, historicoAberto]);

  const OPCOES_EXPORT = [
    { key: "geral", rotulo: t("nav.geral") },
    { key: "resumo", rotulo: t("nav.resumo") },
    { key: "anos", rotulo: t("nav.anos") },
    { key: "acumulado", rotulo: t("nav.acumulado") },
    { key: "diadia", rotulo: t("nav.diadia") },
    ...(isAdmin ? [{ key: "admin", rotulo: t("nav.admin") }] : []),
  ];

  useLayoutEffect(() => {
    const medir = () => {
      const nav = abasRef.current;
      const ativo = nav && nav.querySelector(".abas-opcoes button.ativo");
      if (!ativo) return;
      const rn = nav.getBoundingClientRect();
      const ra = ativo.getBoundingClientRect();
      setInd({
        left: ra.left - rn.left,
        top: ra.top - rn.top,
        width: ra.width,
        height: ra.height,
        visivel: true,
      });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [aba, lang, isAdmin, adminAguardando, autenticado]);

  const distCampos = {
    veiculos: { key: "qtd", rotulo: t("dist.veiculos"), fmt: (v) => fmt(v) },
    peso: { key: "peso", rotulo: t("dist.peso"), fmt: (v) => fmtTon(v) },
    entregas: {
      key: "entregas",
      rotulo: t("dist.entregas"),
      fmt: (v) => fmt(v),
    },
    caixas: { key: "caixas", rotulo: t("dist.caixas"), fmt: (v) => fmt(v) },
  };

  const distVeiculos = useMemo(() => {
    const campo = distCampos[distModo];
    const total = gradeVeiculos.total[campo.key] || 1;
    return gradeVeiculos.linhas.map((l) => ({
      name: exibirVeiculo(l.veiculo),
      value: l[campo.key],
      pct: (l[campo.key] / total) * 100,
    }));
  }, [gradeVeiculos, distModo]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(detalheOrdenadas.length / POR_PAGINA),
  );
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const paginaRows = detalheOrdenadas.slice(
    paginaAtual * POR_PAGINA,
    (paginaAtual + 1) * POR_PAGINA,
  );

  useEffect(() => setPagina(0), [detalheRows, ordena, ordemAsc]);

  const i18nValue = useMemo(
    () => ({ lang, setLang, t, meses }),
    [lang, t, meses],
  );

  if (!autenticado)
    return (
      <I18nContext.Provider value={i18nValue}>
        <Login
          onLogin={(admin) => {
            setAvisoSessao(false);
            setIsAdmin(admin);
            setAutenticado(true);
            setAvisoTon(true);
          }}
          aviso={avisoSessao}
        />
      </I18nContext.Provider>
    );
  const aguardandoDados = !rows.length && falhasRef.current < 20;
  if (aguardandoDados)
    return (
      <I18nContext.Provider value={i18nValue}>
        <div className="loading">
          <div className="loading-slide" aria-hidden="true">
            {ICONES_LOADING.map((icone, i) => (
              <svg
                key={i}
                viewBox={icone.viewBox}
                style={{ color: icone.cor, animationDelay: i * 1.6 + "s" }}
              >
                {icone.paths.map((d, j) => (
                  <path key={j} d={d} />
                ))}
              </svg>
            ))}
          </div>
          {error ? t("comum.preparando") : t("comum.carregando")}
        </div>
      </I18nContext.Provider>
    );
  if (error && !rows.length)
    return (
      <I18nContext.Provider value={i18nValue}>
        <div className="loading erro">
          {t("comum.erro")} {error}
        </div>
      </I18nContext.Provider>
    );

  const sair = () => {
    fetch(URL_LOGOUT, { method: "POST" }).catch(() => {});
    setAvisoSessao(false);
    setIsAdmin(false);
    setAutenticado(false);
  };

  const exportarPdf = () => {
    setExportModal(true);
  };

  const printEmail = async () => {
    if (aba !== "geral") {
      setAba("geral");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    await new Promise((r) => setTimeout(r, 200));
    const el = emailCaptureRef.current;
    if (!el) return;
    el.classList.add("email-capture");
    try {
      const canvas = await html2canvas(document.querySelector(".app"), {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f1f5f9",
        onclone: (doc) => {
          doc
            .querySelectorAll(
              ".sino-wrap, .abas-bandeiras, .abas-linha, .filtros, .sair, .exportar, .reportar, .admin-acoes, .aviso-overlay, .historico-overlay, .email-capture .detalhes, .email-capture .seg-botoes, .email-capture .btn-email-print",
            )
            .forEach((e) => e.classList.add("oculto-no-pdf"));
        },
      });
      const link = document.createElement("a");
      const hoje = new Date();
      const dd = String(hoje.getDate()).padStart(2, "0");
      const mm = String(hoje.getMonth() + 1).padStart(2, "0");
      const aaaa = hoje.getFullYear();
      link.download = `report_${dd}-${mm}-${aaaa}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      el.classList.remove("email-capture");
    }
  };

  const confirmarExportar = async () => {
    const telas = OPCOES_EXPORT.filter((o) => exportSel[o.key]).map(
      (o) => o.key,
    );
    if (!telas.length) return;
    setExportando(true);
    setExportModal(false);
    const abaOriginal = aba;
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      for (let i = 0; i < telas.length; i++) {
        if (aba !== telas[i]) setAba(telas[i]);
        await new Promise((r) => setTimeout(r, 500));
        const canvas = await html2canvas(document.querySelector(".app"), {
          scale: 1.5,
          useCORS: true,
          backgroundColor: "#f1f5f9",
          onclone: (doc) => {
            doc
              .querySelectorAll(
                ".detalhes, .sair, .paginacao, .abas-bandeiras, .sino-wrap, .aviso-overlay, .historico-overlay, .btn-planilha, .btn-email-print",
              )
              .forEach((el) => el.classList.add("oculto-no-pdf"));
          },
        });
        const img = canvas.toDataURL("image/png");
        const orient = canvas.width > canvas.height ? "landscape" : "portrait";
        if (i > 0) pdf.addPage("a4", orient);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const escala = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * escala;
        const h = canvas.height * escala;
        pdf.addImage(img, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      }
      pdf.save("report-expedicao.pdf");
    } catch (e) {
      alert(t("export.falha") + " " + e.message);
    } finally {
      setAba(abaOriginal);
      setExportando(false);
    }
  };

  return (
    <I18nContext.Provider value={i18nValue}>
      <div className="app">
        <header className="header">
          <div className="header-titulo">
            <img src="/logo.svg" alt="Logo" className="logo-img" />
            <div>
              <h1>{t("header.titulo")}</h1>
              <p className="subtitle">
                {t("comum.ultimaAtualizacao")}:{" "}
                {dataMax ? dataMax.toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
          <div className="filtros">
            {aba === "geral" && (
              <>
                <label className="filtro-data">
                  <span>{t("header.data")}</span>
                  <input
                    type="date"
                    value={dataSel}
                    min={dataMin ? isoDate(dataMin) : undefined}
                    max={dataMax ? isoDate(dataMax) : undefined}
                    onChange={(e) => setDataSel(e.target.value)}
                  />
                </label>
                <label className="filtro-data">
                  <span>{t("header.ano")}</span>
                  <select value={ano} onChange={aoMudarAno}>
                    <option value="all">{t("comum.todosAnos")}</option>
                    {anosDisponiveis.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                {(dataSel !== (dataMax ? isoDate(dataMax) : "") ||
                  ano !==
                    (anosDisponiveis.length
                      ? Math.max(...anosDisponiveis)
                      : "all")) && (
                  <button
                    className="limpar"
                    onClick={() => {
                      if (dataMax) setDataSel(isoDate(dataMax));
                      if (anosDisponiveis.length)
                        setAno(Math.max(...anosDisponiveis));
                    }}
                  >
                    {t("comum.limpar")}
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn-email-print"
                    onClick={printEmail}
                    title={t("admin.printEmail")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M11.993 14.407l-1.552 1.552c.355.598.559 1.296.559 2.041 0 2.209-1.791 4-4 4s-4-1.791-4-4 1.791-4 4-4c.738 0 1.429.2 2.023.548l1.556-1.556-3.124-3.124c-.586-.586-.586-1.536 0-2.121l.354-.354 4.185 4.185 4.189-4.189.354.354c.586.586.586 1.536 0 2.121l-3.129 3.127 1.561 1.562c.596-.352 1.29-.554 1.999-.554 2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4c-.742 0-1.437.202-2.032.554zM19 13V5H5v8H3V4c0-.552.448-1 1-1h16c.552 0 1 .448 1 1v9zM7 20c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm10 0c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" />
                    </svg>
                    {t("admin.printEmail")}
                  </button>
                )}
              </>
            )}
            <button
              className="sair exportar"
              onClick={exportarPdf}
              title={t("header.exportar")}
              disabled={exportando}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.3517 7.61665L15.3929 4.05375C14.2651 3.03868 13.7012 2.53114 13.0092 2.26562L13 5.00011C13 7.35713 13 8.53564 13.7322 9.26787C14.4645 10.0001 15.643 10.0001 18 10.0001H21.5801C21.2175 9.29588 20.5684 8.71164 19.3517 7.61665Z" />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 22H14C17.7712 22 19.6569 22 20.8284 20.8284C22 19.6569 22 17.7712 22 14V13.5629C22 12.6901 22 12.0344 21.9574 11.5001H18L17.9051 11.5001C16.808 11.5002 15.8385 11.5003 15.0569 11.3952C14.2098 11.2813 13.3628 11.0198 12.6716 10.3285C11.9803 9.63726 11.7188 8.79028 11.6049 7.94316C11.4998 7.16164 11.4999 6.19207 11.5 5.09497L11.5092 2.26057C11.5095 2.17813 11.5166 2.09659 11.53 2.01666C11.1214 2 10.6358 2 10.0298 2C6.23869 2 4.34315 2 3.17157 3.17157C2 4.34315 2 6.22876 2 10V14C2 17.7712 2 19.6569 3.17157 20.8284C4.34315 22 6.22876 22 10 22ZM7.98704 19.0472C8.27554 19.3176 8.72446 19.3176 9.01296 19.0472L11.013 17.1722C11.3151 16.8889 11.3305 16.4142 11.0472 16.112C10.7639 15.8099 10.2892 15.7945 9.98704 16.0778L9.25 16.7688L9.25 13.5C9.25 13.0858 8.91421 12.75 8.5 12.75C8.08579 12.75 7.75 13.0858 7.75 13.5V16.7688L7.01296 16.0778C6.71077 15.7945 6.23615 15.8099 5.95285 16.112C5.66955 16.4142 5.68486 16.8889 5.98704 17.1722L7.98704 19.0472Z"
                />
              </svg>
              {exportando ? t("export.gerando") : t("header.exportar")}
            </button>
            <button
              className="sair reportar"
              onClick={() =>
                window.open(
                  "https://forms.gle/Fpm6z8k3iwiRN2ZBA",
                  "_blank",
                  "noopener",
                )
              }
              title={t("header.reportar")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.416 2.62412C17.7607 2.39435 17.8538 1.9287 17.624 1.58405C17.3943 1.23941 16.9286 1.14628 16.584 1.37604L13.6687 3.31955C13.1527 3.11343 12.5897 3.00006 12.0001 3.00006C11.4105 3.00006 10.8474 3.11345 10.3314 3.31962L7.41603 1.37604C7.07138 1.14628 6.60573 1.23941 6.37596 1.58405C6.1462 1.9287 6.23933 2.39435 6.58397 2.62412L8.9437 4.19727C8.24831 4.84109 7.75664 5.70181 7.57617 6.6719C8.01128 6.55973 8.46749 6.50006 8.93763 6.50006H15.0626C15.5328 6.50006 15.989 6.55973 16.4241 6.6719C16.2436 5.70176 15.7519 4.841 15.0564 4.19717L17.416 2.62412Z" />
                <path d="M1.25 14.0001C1.25 13.5859 1.58579 13.2501 2 13.2501H5V11.9376C5 11.1019 5.26034 10.327 5.70435 9.68959L3.22141 8.69624C2.83684 8.54238 2.6498 8.10589 2.80366 7.72131C2.95752 7.33673 3.39401 7.1497 3.77859 7.30356L6.91514 8.55841C7.50624 8.20388 8.19807 8.00006 8.9375 8.00006H15.0625C15.8019 8.00006 16.4938 8.20388 17.0849 8.55841L20.2214 7.30356C20.606 7.1497 21.0425 7.33673 21.1963 7.72131C21.3502 8.10589 21.1632 8.54238 20.7786 8.69624L18.2957 9.68959C18.7397 10.327 19 11.1019 19 11.9376V13.2501H22C22.4142 13.2501 22.75 13.5859 22.75 14.0001C22.75 14.4143 22.4142 14.7501 22 14.7501H19V15.0001C19 16.1808 18.7077 17.2932 18.1915 18.2689L20.7786 19.3039C21.1632 19.4578 21.3502 19.8943 21.1963 20.2789C21.0425 20.6634 20.606 20.8505 20.2214 20.6966L17.3288 19.5394C16.1974 20.8664 14.5789 21.7655 12.75 21.9604V15.0001C12.75 14.5858 12.4142 14.2501 12 14.2501C11.5858 14.2501 11.25 14.5858 11.25 15.0001V21.9604C9.42109 21.7655 7.80265 20.8664 6.67115 19.5394L3.77859 20.6966C3.39401 20.8505 2.95752 20.6634 2.80366 20.2789C2.6498 19.8943 2.83684 19.4578 3.22141 19.3039L5.80852 18.2689C5.29231 17.2932 5 16.1808 5 15.0001V14.7501H2C1.58579 14.7501 1.25 14.4143 1.25 14.0001Z" />
              </svg>
              {t("header.reportarCurto")}
            </button>
            <button className="sair" onClick={sair} title={t("header.sair")}>
              <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                <path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z" />
              </svg>
              {t("header.sair")}
            </button>
          </div>
        </header>

        <div className="abas-linha">
          <nav className="abas" ref={abasRef}>
            <span
              className="aba-indicador"
              aria-hidden="true"
              style={{
                transform: `translate(${ind.left}px, ${ind.top}px)`,
                width: ind.width,
                height: ind.height,
                opacity: ind.visivel ? 1 : 0,
              }}
            />
            <div className="abas-opcoes">
              <button
                className={aba === "geral" ? "ativo" : ""}
                onClick={() => setAba("geral")}
              >
                {t("nav.geral")}
              </button>
              <button
                className={aba === "resumo" ? "ativo" : ""}
                onClick={() => setAba("resumo")}
              >
                {t("nav.resumo")}
              </button>
              <button
                className={aba === "anos" ? "ativo" : ""}
                onClick={() => setAba("anos")}
              >
                {t("nav.anos")}
              </button>
              <button
                className={aba === "acumulado" ? "ativo" : ""}
                onClick={() => setAba("acumulado")}
              >
                {t("nav.acumulado")}
              </button>
              <button
                className={aba === "diadia" ? "ativo" : ""}
                onClick={() => setAba("diadia")}
              >
                {t("nav.diadia")}
              </button>
              {isAdmin && (
                <button
                  className={aba === "admin" ? "ativo" : ""}
                  onClick={() => setAba("admin")}
                >
                  {t("nav.admin")}
                  {adminAguardando > 0 && (
                    <span className="badge-admin">
                      {adminAguardando > 999 ? "999+" : fmt(adminAguardando)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </nav>
          <div className="abas-direita">
            <div className="sino-wrap">
              <button
                className="sino-btn"
                onClick={() => {
                  setSinoAberto(!sinoAberto);
                  setSinoVisto(true);
                }}
                title={t("header.novidades")}
                aria-label={t("header.novidades")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.35179 20.2418C9.19288 21.311 10.5142 22 12 22C13.4858 22 14.8071 21.311 15.6482 20.2418C13.2264 20.57 10.7736 20.57 8.35179 20.2418Z" />
                  <path d="M18.7491 9V9.7041C18.7491 10.5491 18.9903 11.3752 19.4422 12.0782L20.5496 13.8012C21.5612 15.3749 20.789 17.5139 19.0296 18.0116C14.4273 19.3134 9.57274 19.3134 4.97036 18.0116C3.21105 17.5139 2.43882 15.3749 3.45036 13.8012L4.5578 12.0782C5.00972 11.3752 5.25087 10.5491 5.25087 9.7041V9C5.25087 5.13401 8.27256 2 12 2C15.7274 2 18.7491 5.13401 18.7491 9Z" />
                </svg>
                {!sinoVisto && <span className="sino-dot" />}
              </button>
              {sinoAberto && (
                <div className="sino-painel">
                  <h3>{t("header.novidades")}</h3>
                  {ATUALIZACOES.slice(0, 3).map((a, i) => (
                    <div key={i} className="sino-item">
                      <span className="sino-data">{a.data}</span>
                      <ul className="sino-lista">
                        {a.itens.map((it, j) => (
                          <li key={j}>{it[lang]}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {ATUALIZACOES.length > 3 && (
                    <button
                      className="sino-historico"
                      onClick={() => {
                        setSinoAberto(false);
                        setHistoricoAberto(true);
                      }}
                    >
                      {t("sino.verHistorico")}
                    </button>
                  )}
                </div>
              )}
            </div>
            <Bandeiras
              lang={lang}
              setLang={setLang}
              className="abas-bandeiras"
            />
          </div>
        </div>

        {aba === "resumo" ? (
          <ResumoGeral rows={rows} />
        ) : aba === "anos" ? (
          <CompararAnos rows={rows} />
        ) : aba === "acumulado" ? (
          <Acumulado rows={rows} dataMax={dataMax} dataMin={dataMin} />
        ) : aba === "diadia" ? (
          <DiaADia rows={rows} />
        ) : aba === "admin" ? (
          <PainelAdmin rows={rows} />
        ) : (
          <div ref={emailCaptureRef}>
            <section className="kpis">
              <Kpi
                label={t("kpi.pesoBruto")}
                value={fmtTon(kpis.peso)}
                sub={`${t("kpi.capacidade")} ${fmtTon(filtrados.reduce((a, r) => a + r.capacidade, 0))}`}
                color={GOLD}
              />
              <Kpi
                label={t("kpi.qtdVeiculos")}
                value={fmt(kpis.n)}
                color={NAVY}
              />
              <Kpi
                label={t("kpi.entregas")}
                value={fmt(kpis.entregas)}
                color={NAVY}
              />
              <Kpi
                label={t("kpi.caixas")}
                value={fmt(kpis.caixas)}
                color={NAVY_DARK}
              />
              <Kpi
                label={t("kpi.ocupacao")}
                value={
                  kpis.ocupacao.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  }) + "%"
                }
                sub={t("kpi.pesoCapacidade")}
                color={GOLD}
              />
            </section>

            <section className="grade-layout">
              <div className="card grade-tabela">
                <h2>{t("grade.titulo")}</h2>
                <div className="table-scroll">
                  <table className="tabela grade">
                    <thead>
                      <tr>
                        {COLUNAS_GRADE.map((c) => (
                          <th
                            key={c.key}
                            className={
                              c.tipo === "numero"
                                ? "num ordenavel"
                                : "ordenavel"
                            }
                            onClick={() => aoOrdenarGrade(c.key)}
                          >
                            {c.rotulo}
                            {ordenaGrade === c.key && (
                              <span className="seta">
                                {ordemAscGrade ? "▲" : "▼"}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradeLinhas.map((l) => (
                        <tr key={l.veiculo}>
                          <td>{exibirVeiculo(l.veiculo)}</td>
                          <td className="num">{fmtTon(l.peso)}</td>
                          <td className="num">{fmt(l.qtd)}</td>
                          <td className="num">{fmt(l.entregas)}</td>
                          <td className="num">{fmt(l.caixas)}</td>
                          <td className="num">
                            {l.ocupacao.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t("resumo.total")}</td>
                        <td className="num">
                          {fmtTon(gradeVeiculos.total.peso)}
                        </td>
                        <td className="num">{fmt(gradeVeiculos.total.qtd)}</td>
                        <td className="num">
                          {fmt(gradeVeiculos.total.entregas)}
                        </td>
                        <td className="num">
                          {fmt(gradeVeiculos.total.caixas)}
                        </td>
                        <td className="num">
                          {gradeVeiculos.total.ocupacao.toLocaleString(
                            "pt-BR",
                            { maximumFractionDigits: 1 },
                          )}
                          %
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="card grade-grafico">
                <div className="grafico-header">
                  <h2>{t("dist.titulo")}</h2>
                  <div className="seg-botoes">
                    {Object.entries(distCampos).map(([key, c]) => (
                      <button
                        key={key}
                        className={distModo === key ? "ativo" : ""}
                        onClick={() => setDistModo(key)}
                      >
                        {c.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={distVeiculos}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={84}
                      paddingAngle={2}
                      label={(e) => (e.pct >= 4 ? e.pct.toFixed(1) + "%" : "")}
                      labelLine={false}
                    >
                      {distVeiculos.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => {
                        const d = distVeiculos.find((x) => x.name === name);
                        return [
                          distCampos[distModo].fmt(v) +
                            ` (${d.pct.toFixed(1)}%)`,
                          name,
                        ];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid-charts">
              <GraficoDias
                titulo={`${t("dias.peso")} ${diasDados ? `· ${meses[diasDados.ref.mes - 1]}/${diasDados.ref.ano}` : ""}`}
                dados={diasDados ? diasDados.peso : { linhas: [], media: 0 }}
                cor={NAVY}
                corLinha={GOLD}
                formatar={fmtTon}
                destaque={diasDados ? diasDados.diaSel : null}
                aoClicar={aoClicarDiaGeral}
              />
              <GraficoDias
                titulo={`${t("dias.caixas")} ${diasDados ? `· ${meses[diasDados.ref.mes - 1]}/${diasDados.ref.ano}` : ""}`}
                dados={diasDados ? diasDados.caixas : { linhas: [], media: 0 }}
                cor={GOLD}
                corLinha={NAVY}
                formatar={fmt}
                destaque={diasDados ? diasDados.diaSel : null}
                aoClicar={aoClicarDiaGeral}
              />
              <GraficoDias
                titulo={`${t("dias.ocupacao")} ${diasDados ? `· ${meses[diasDados.ref.mes - 1]}/${diasDados.ref.ano}` : ""}`}
                dados={
                  diasDados ? diasDados.ocupacao : { linhas: [], media: 0 }
                }
                cor={NAVY_DARK}
                corLinha={GOLD}
                formatar={fmtPct}
                destaque={diasDados ? diasDados.diaSel : null}
                aoClicar={aoClicarDiaGeral}
              />
              <GraficoDias
                titulo={`${t("dias.veiculos")} ${diasDados ? `· ${meses[diasDados.ref.mes - 1]}/${diasDados.ref.ano}` : ""}`}
                dados={
                  diasDados ? diasDados.veiculos : { linhas: [], media: 0 }
                }
                cor={GOLD}
                corLinha={NAVY}
                formatar={fmt}
                destaque={diasDados ? diasDados.diaSel : null}
                aoClicar={aoClicarDiaGeral}
              />
            </section>

            <section className="card detalhes">
              <div className="grafico-header">
                <h2>
                  {t("det.titulo")}{" "}
                  <span className="contagem">
                    ({fmt(detalheRows.length)} {t("comum.linhas")})
                  </span>
                </h2>
                <div className="det-filtro">
                  <select
                    value={detMesAno}
                    onChange={(e) => {
                      const a = Number(e.target.value);
                      setDetMesAno(a);
                      const mesesArr = meses
                        .map((_, i) => i)
                        .filter((m) =>
                          rows.some(
                            (r) =>
                              r.data.getFullYear() === a &&
                              r.data.getMonth() === m,
                          ),
                        );
                      if (mesesArr.length)
                        setDetMesMes(String(mesesArr[mesesArr.length - 1]));
                    }}
                  >
                    {anosDetalhe.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <select
                    value={detMesMes}
                    onChange={(e) => setDetMesMes(e.target.value)}
                  >
                    {mesesDetalhe.map((m) => (
                      <option key={m} value={m}>
                        {meses[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="table-scroll">
                <table className="tabela detalhes">
                  <thead>
                    <tr>
                      {COLUNAS_DETALHE.map((c) => (
                        <th
                          key={c.key}
                          className={
                            c.tipo === "numero" ? "num ordenavel" : "ordenavel"
                          }
                          onClick={() => aoOrdenar(c.key)}
                        >
                          {c.rotulo}
                          {ordena === c.key && (
                            <span className="seta">{ordemAsc ? "▲" : "▼"}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginaRows.map((r) => (
                      <tr key={r.romaneio}>
                        <td>{r.romaneio}</td>
                        <td>{r.data.toLocaleDateString("pt-BR")}</td>
                        <td>{r.motorista}</td>
                        <td>{r.placa}</td>
                        <td>
                          {r.veiculo.trim() ? exibirVeiculo(r.veiculo) : "—"}
                        </td>
                        <td className="num">{fmtTon(r.peso)}</td>
                        <td className="num">{fmtMoney(r.valor)}</td>
                        <td className="num">
                          {r.ocupacao.toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}
                          %
                        </td>
                        <td className="num">{r.entregas}</td>
                        <td className="num">{fmtMoney(r.frete)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="paginacao">
                <button
                  disabled={paginaAtual === 0}
                  onClick={() => setPagina(paginaAtual - 1)}
                >
                  {t("comum.anterior")}
                </button>
                <span>
                  {t("comum.pagina")} {paginaAtual + 1} {t("comum.de")}{" "}
                  {totalPaginas}
                </span>
                <button
                  disabled={paginaAtual >= totalPaginas - 1}
                  onClick={() => setPagina(paginaAtual + 1)}
                >
                  {t("comum.proxima")}
                </button>
              </div>
            </section>
          </div>
        )}
        {avisoTon && (
          <div className="aviso-overlay" onClick={() => setAvisoTon(false)}>
            <div className="aviso-modal" onClick={(e) => e.stopPropagation()}>
              <svg
                className="aviso-logo"
                viewBox="0 0 1000 192"
                aria-hidden="true"
              >
                <path
                  d="M499.772 164.22C548.948 164.22 594.297 169.357 630.654 178.013L622.932 191.773C587.965 184.184 545.525 179.737 499.772 179.737C454.269 179.737 412.043 184.136 377.186 191.65L369.457 177.878C405.718 169.304 450.851 164.22 499.772 164.22ZM500.094 0C501.842 5.46379 503.829 14.9706 506.209 26.3633V26.3643C512.586 56.8871 521.792 100.946 536.828 117.058C540.102 120.565 545.165 122.226 549.279 119.756C567.045 109.086 597.96 56.5286 612.914 28.124C606.018 54.9552 595.523 112.626 608.712 128.66C622.936 135.448 673.904 87.929 698.257 57.542L634.483 171.188C597.504 161.97 550.69 156.462 499.772 156.462C449.112 156.462 402.514 161.913 365.624 171.047L301.931 57.542C326.284 87.9291 377.252 135.449 391.476 128.66C404.665 112.626 394.17 54.9552 387.274 28.124C402.228 56.5284 433.142 109.085 450.908 119.756C455.022 122.226 460.086 120.565 463.36 117.058C478.396 100.946 487.602 56.887 493.979 26.3643V26.3633C496.359 14.9706 498.346 5.46377 500.094 0Z"
                  fill={GOLD}
                />
              </svg>
              <h3 className="aviso-titulo">{t("aviso.titulo")}</h3>
              <p>{t("aviso.toneladas")}</p>
              <button onClick={() => setAvisoTon(false)}>
                {t("aviso.ok")}
              </button>
            </div>
          </div>
        )}
        {historicoAberto && (
          <div
            className="historico-overlay"
            onClick={() => setHistoricoAberto(false)}
          >
            <div
              className="historico-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="historico-fechar"
                onClick={() => setHistoricoAberto(false)}
                aria-label={t("export.cancelar")}
              >
                ×
              </button>
              <h3>{t("sino.historicoTitulo")}</h3>
              <div className="historico-lista">
                {ATUALIZACOES.map((a, i) => (
                  <div key={i} className="sino-item">
                    <span className="sino-data">{a.data}</span>
                    <ul className="sino-lista">
                      {a.itens.map((it, j) => (
                        <li key={j}>{it[lang]}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {exportModal && (
        <div
          className="export-modal-overlay"
          onClick={() => !exportando && setExportModal(false)}
        >
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("export.titulo")}</h2>
            <p className="export-sub">{t("export.sub")}</p>
            <div className="export-opcoes">
              {OPCOES_EXPORT.map((o) => (
                <label
                  key={o.key}
                  className={exportSel[o.key] ? "marcada" : ""}
                >
                  <input
                    type="checkbox"
                    checked={!!exportSel[o.key]}
                    onChange={() =>
                      setExportSel({ ...exportSel, [o.key]: !exportSel[o.key] })
                    }
                  />
                  <span>{o.rotulo}</span>
                </label>
              ))}
            </div>
            <div className="export-acoes">
              <button
                className="export-cancelar"
                onClick={() => setExportModal(false)}
              >
                {t("export.cancelar")}
              </button>
              <button
                className="export-confirmar"
                onClick={confirmarExportar}
                disabled={!OPCOES_EXPORT.some((o) => exportSel[o.key])}
              >
                {t("export.exportar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </I18nContext.Provider>
  );
}
