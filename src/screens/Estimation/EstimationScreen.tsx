import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../../store/AppStore';
import { formatOmr, parseAmount } from '../../utils/currency';
import {
  computeEstimation,
  computeEstimationDefaults,
  type EstimationInputs,
} from '../../utils/estimation';

interface VarConfig {
  key: keyof EstimationInputs;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

const VAR_CONFIG: VarConfig[] = [
  {
    key: 'projectCost',
    label: 'Project cost (investment)',
    hint: 'One-off capital to build / buy the chalet',
    min: 0,
    max: 300000,
    step: 1000,
    suffix: 'OMR',
  },
  {
    key: 'fullDayPerMonth',
    label: 'Full-day bookings / month',
    hint: 'Average overnight stays each month',
    min: 0,
    max: 31,
    step: 1,
    suffix: 'days',
  },
  {
    key: 'fullDayPrice',
    label: 'Full-day price',
    hint: 'Average price of one full-day booking',
    min: 0,
    max: 300,
    step: 1,
    suffix: 'OMR',
  },
  {
    key: 'halfDayPerMonth',
    label: 'Half-day bookings / month',
    hint: 'Average half-day bookings each month',
    min: 0,
    max: 31,
    step: 1,
    suffix: 'days',
  },
  {
    key: 'halfDayPrice',
    label: 'Half-day price',
    hint: 'Average price of one half-day booking',
    min: 0,
    max: 300,
    step: 1,
    suffix: 'OMR',
  },
  {
    key: 'monthlyCost',
    label: 'Monthly operating cost',
    hint: 'Bills, cleaning, maintenance per month',
    min: 0,
    max: 5000,
    step: 10,
    suffix: 'OMR',
  },
];

const PIE_COLORS = ['#7a4f2e', '#c9923f'];

export default function EstimationScreen() {
  const { bookings, costs } = useAppStore();

  const defaults = useMemo(
    () => computeEstimationDefaults(bookings, costs),
    [bookings, costs],
  );

  const [inputs, setInputs] = useState<EstimationInputs>(() => ({
    projectCost: defaults.projectCost,
    fullDayPerMonth: defaults.fullDayPerMonth,
    fullDayPrice: defaults.fullDayPrice,
    halfDayPerMonth: defaults.halfDayPerMonth,
    halfDayPrice: defaults.halfDayPrice,
    monthlyCost: defaults.monthlyCost,
  }));

  const result = useMemo(() => computeEstimation(inputs), [inputs]);

  const setVar = (key: keyof EstimationInputs, value: number) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const resetToAverages = () =>
    setInputs({
      projectCost: defaults.projectCost,
      fullDayPerMonth: defaults.fullDayPerMonth,
      fullDayPrice: defaults.fullDayPrice,
      halfDayPerMonth: defaults.halfDayPerMonth,
      halfDayPrice: defaults.halfDayPrice,
      monthlyCost: defaults.monthlyCost,
    });

  const paybackLabel = Number.isFinite(result.paybackYears)
    ? `${result.paybackYears.toFixed(1)} yrs`
    : 'Never';
  const paybackSub = Number.isFinite(result.paybackYears)
    ? `≈ ${Math.round(result.paybackYears * 12)} months`
    : 'No profit at these values';

  const composition = [
    { name: 'Full-day', value: result.fullDayRevenue },
    { name: 'Half-day', value: result.halfDayRevenue },
  ].filter((entry) => entry.value > 0);

  const monthlyBars = [
    { name: 'Revenue', value: result.monthlyRevenue },
    { name: 'Cost', value: inputs.monthlyCost },
    { name: 'Net', value: result.monthlyNet },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Estimation</h1>
        <button className="btn" onClick={resetToAverages}>
          ↺ Reset to averages
        </button>
      </div>

      <div className="banner">
        Values start from your real averages over the last{' '}
        <strong>{defaults.monthsOfData}</strong>{' '}
        month{defaults.monthsOfData === 1 ? '' : 's'} of bookings and costs. Adjust any
        variable to plan scenarios — nothing here changes your saved data.
      </div>

      <div className="est-layout">
        {/* ---------- Variables panel ---------- */}
        <section className="est-vars chart-card">
          <h3 className="chart-title">Planning variables</h3>
          {VAR_CONFIG.map((cfg) => (
            <div className="est-var" key={cfg.key}>
              <div className="est-var-head">
                <label htmlFor={`var-${cfg.key}`}>{cfg.label}</label>
                <div className="est-var-input">
                  <input
                    id={`var-${cfg.key}`}
                    type="number"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={inputs[cfg.key]}
                    onChange={(e) => setVar(cfg.key, parseAmount(e.target.value))}
                  />
                  {cfg.suffix && <span className="est-var-suffix">{cfg.suffix}</span>}
                </div>
              </div>
              <input
                className="est-slider"
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={Math.min(inputs[cfg.key], cfg.max)}
                onChange={(e) => setVar(cfg.key, parseAmount(e.target.value))}
              />
              <div className="est-var-hint">{cfg.hint}</div>
            </div>
          ))}
        </section>

        {/* ---------- Results ---------- */}
        <section className="est-results">
          <div className="kpi-grid">
            <KpiCard
              label="Payback period"
              value={paybackLabel}
              sub={paybackSub}
              highlight
            />
            <KpiCard label="Monthly revenue" value={formatOmr(result.monthlyRevenue)} />
            <KpiCard
              label="Monthly net"
              value={formatOmr(result.monthlyNet)}
              sub={result.monthlyNet >= 0 ? 'profit' : 'loss'}
            />
            <KpiCard label="Annual net" value={formatOmr(result.annualNet)} />
            <KpiCard
              label="Return on investment"
              value={`${result.roiPct.toFixed(1)}%`}
              sub="per year"
            />
            <KpiCard label="Annual revenue" value={formatOmr(result.annualRevenue)} />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Cumulative profit vs. investment</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={result.projection}>
                  <defs>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7a4f2e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#7a4f2e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e0cdb0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    stroke="#8a6f55"
                    fontSize={12}
                    tickFormatter={(y) => `Y${y}`}
                  />
                  <YAxis
                    stroke="#8a6f55"
                    fontSize={12}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatOmr(value)}
                    labelFormatter={(y) => `Year ${y}`}
                    contentStyle={tooltipStyle}
                  />
                  <Legend />
                  {Number.isFinite(result.paybackYears) && (
                    <ReferenceLine
                      x={Math.round(result.paybackYears)}
                      stroke="#16a34a"
                      strokeDasharray="4 4"
                      label={{ value: 'Break-even', fill: '#16a34a', fontSize: 11 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    name="Cumulative profit"
                    stroke="#7a4f2e"
                    strokeWidth={2}
                    fill="url(#profitFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="investment"
                    name="Investment"
                    stroke="#b23a2e"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Monthly money flow</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyBars}>
                  <CartesianGrid stroke="#e0cdb0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#8a6f55" fontSize={12} />
                  <YAxis stroke="#8a6f55" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => formatOmr(value)}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(122, 79, 46, 0.08)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {monthlyBars.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === 'Cost'
                            ? '#b23a2e'
                            : entry.value >= 0
                              ? '#7a4f2e'
                              : '#b23a2e'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Revenue composition</h3>
              {composition.length === 0 ? (
                <div className="empty-state">Add some bookings to see this.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={composition}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label={(entry) => entry.name}
                    >
                      {composition.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatOmr(value)}
                      contentStyle={tooltipStyle}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#fcf6ec',
  border: '1px solid #e0cdb0',
  borderRadius: 8,
  color: '#3d2a1a',
};

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`kpi-card${highlight ? ' kpi-card-accent' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
