import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAppStore } from '../../store/AppStore';
import DateField from '../../components/DateField';
import { STATUS_COLORS, type BookingStatus } from '../../types';
import { formatOmr } from '../../utils/currency';
import { toIsoDate } from '../../utils/dates';
import { computeMetrics } from '../../utils/metrics';

const PIE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

export default function DashboardScreen() {
  const { bookings, costs, costTypes } = useAppStore();
  const [fromDate, setFromDate] = useState<string>(toIsoDate(startOfMonth(new Date())));
  const [toDate, setToDate] = useState<string>(toIsoDate(endOfMonth(new Date())));

  const metrics = useMemo(
    () => computeMetrics(bookings, costs, costTypes, fromDate, toDate),
    [bookings, costs, costTypes, fromDate, toDate],
  );

  const busiestWeekday = useMemo(() => {
    const sorted = [...metrics.weekdayCounts].sort((a, b) => b.nights - a.nights);
    return sorted[0]?.nights > 0 ? sorted[0].weekday : '—';
  }, [metrics.weekdayCounts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="from">From</label>
          <DateField id="from" value={fromDate} onChange={setFromDate} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <DateField id="to" value={toDate} onChange={setToDate} />
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Booked Nights"
          value={String(metrics.bookedNights)}
          sub={`of ${metrics.totalNights} nights`}
        />
        <KpiCard label="Occupancy" value={`${metrics.occupancyPct.toFixed(0)}%`} />
        <KpiCard label="Revenue" value={formatOmr(metrics.revenue)} />
        <KpiCard label="Total Costs" value={formatOmr(metrics.totalCosts)} />
        <KpiCard
          label="Net Profit"
          value={formatOmr(metrics.netProfit)}
          sub={metrics.netProfit >= 0 ? 'profit' : 'loss'}
        />
        <KpiCard
          label="Bookings"
          value={String(metrics.bookingCount)}
          sub={`Busiest: ${busiestWeekday}`}
        />
        <KpiCard label="Insurance Held" value={formatOmr(metrics.insuranceHeld)} />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Revenue vs Costs (by month)</h3>
          {metrics.trend.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={metrics.trend}>
                <CartesianGrid stroke="#26334d" strokeDasharray="3 3" />
                <XAxis dataKey="period" stroke="#93a1b8" fontSize={12} />
                <YAxis stroke="#93a1b8" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => formatOmr(value)}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} />
                <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Booked Nights by Weekday</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={metrics.weekdayCounts}>
              <CartesianGrid stroke="#26334d" strokeDasharray="3 3" />
              <XAxis dataKey="weekday" stroke="#93a1b8" fontSize={12} />
              <YAxis stroke="#93a1b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1b273d' }} />
              <Bar dataKey="nights" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Bookings by Status</h3>
          {metrics.statusCounts.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={metrics.statusCounts}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {metrics.statusCounts.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status as BookingStatus]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Costs by Type</h3>
          {metrics.costBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={metrics.costBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {metrics.costBreakdown.map((entry, index) => (
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
    </div>
  );
}

const tooltipStyle = {
  background: '#131c2e',
  border: '1px solid #26334d',
  borderRadius: 8,
  color: '#e8edf5',
};

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function Empty() {
  return <div className="empty-state">No data in this range.</div>;
}
