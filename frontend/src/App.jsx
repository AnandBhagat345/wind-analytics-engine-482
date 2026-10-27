import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Wind,
  Activity,
  Target,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: 1,
  });
}

function formatHour(value) {
  if (!value) return "";
  return value.slice(5, 13).replace("T", " ");
}

function MetricCard({ title, value, unit, description, icon: Icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <div className="metric-icon">
          <Icon size={19} />
        </div>
      </div>
      <div className="metric-value">
        {value} <small>{unit}</small>
      </div>
      <p>{description}</p>
    </article>
  );
}

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/accuracy`);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!Array.isArray(result.data) || result.data.length === 0) {
        throw new Error("No comparison data was returned.");
      }

      setReport(result);
    } catch (err) {
      setError(
        `${err.message}. Make sure the FastAPI backend is running on port 8000.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const chartData = report?.data.map((row) => ({
    ...row,
    time: formatHour(row.startTime),
  })) ?? [];

  const largestErrors = [...(report?.data ?? [])]
    .sort((a, b) => b.absolute_error - a.absolute_error)
    .slice(0, 10);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wind size={25} />
          </div>
          <div>
            <strong>WindScope</strong>
            <span>ENERGY INTELLIGENCE</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active">
          <Activity size={18} />
          <span>Forecast overview</span>
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Analytics workspace</strong>
            <span>Historical data analysis</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Analytics <span>/</span> Wind generation
          </div>
          <div className="topbar-right">
            <span className="period-badge">JAN 2026</span>
            <button
              className="refresh-button"
              onClick={loadReport}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Refresh data
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">UK RENEWABLE ENERGY · NATIONAL WIND</div>
            <h1>Wind forecast analytics</h1>
            <p>
              Evaluate forecast performance against actual wind generation
              to support day-ahead electricity purchasing decisions.
            </p>
          </div>
          <div className="data-source">
            <span className="source-indicator" />
            Elexon BMRS data
          </div>
        </section>

        {loading && (
          <div className="notice">
            <RefreshCw size={18} className="spin" />
            Loading January 2026 analysis...
          </div>
        )}

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to load analytics</strong>
              <p>{error}</p>
              <button onClick={loadReport}>Try again</button>
            </div>
          </div>
        )}

        {!loading && !error && report && (
          <>
            <section className="summary-strip">
              <div>
                <span>REPORTING PERIOD</span>
                <strong>1 Jan – 31 Jan 2026</strong>
              </div>
              <div>
                <span>COMPARISON FREQUENCY</span>
                <strong>Hourly average · MW</strong>
              </div>
              <div>
                <span>FORECAST DECISION CUTOFF</span>
                <strong>{report.decision_cutoff}</strong>
              </div>
            </section>

            <section className="metrics-grid">
              <MetricCard
                title="Mean absolute error"
                value={formatNumber(report.mae_mw)}
                unit="MW"
                description="Average absolute difference"
                icon={Target}
              />
              <MetricCard
                title="Root mean squared error"
                value={formatNumber(report.rmse_mw)}
                unit="MW"
                description="Penalises larger errors"
                icon={Activity}
              />
              <MetricCard
                title="Forecast bias"
                value={`${report.bias_mw > 0 ? "+" : ""}${formatNumber(report.bias_mw)}`}
                unit="MW"
                description={
                  report.bias_mw > 0
                    ? "Forecasts were higher on average"
                    : "Forecasts were lower on average"
                }
                icon={TrendingUp}
              />
              <MetricCard
                title="Matched intervals"
                value={formatNumber(report.matched_intervals)}
                unit="/ 744"
                description="Hourly forecast-actual pairs"
                icon={Wind}
              />
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Forecast vs actual generation</h2>
                  <p>Hourly wind generation throughout January 2026</p>
                </div>
                <div className="chart-unit">MEGAWATTS (MW)</div>
              </div>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="startTime"
                      tickFormatter={(value) => value.slice(5, 10)}
                      minTickGap={45}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `${(value / 1000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11 }}
                      width={48}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }) + " UTC"
                      }
                      formatter={(value, name) => [
                        `${formatNumber(value)} MW`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Day-ahead forecast"
                      stroke="#6478e8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual generation"
                      stroke="#16a085"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="lower-grid">
              <div className="panel error-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Largest forecast errors</h2>
                    <p>Intervals with the greatest absolute error</p>
                  </div>
                </div>

                <div className="chart-container compact-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={largestErrors}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="startTime"
                        tickFormatter={(value) =>
                          value.slice(5, 10)
                        }
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `${(value / 1000).toFixed(1)}k`
                        }
                        tick={{ fontSize: 10 }}
                        width={45}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(value)} MW`,
                          "Absolute error",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="absolute_error"
                        name="Absolute error"
                        stroke="#e59b39"
                        fill="#f6d8a8"
                        fillOpacity={0.55}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel interpretation-panel">
                <div className="panel-heading">
                  <div>
                    <h2>How to read these metrics</h2>
                    <p>Decision-support context</p>
                  </div>
                </div>

                <div className="insight-item">
                  <span className="insight-marker purple" />
                  <div>
                    <strong>MAE</strong>
                    <p>
                      The typical size of the forecast error. Lower values
                      indicate forecasts closer to actual generation.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <span className="insight-marker orange" />
                  <div>
                    <strong>RMSE</strong>
                    <p>
                      Highlights large misses more strongly than MAE.
                      Useful for spotting potentially costly forecast errors.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <span className="insight-marker green" />
                  <div>
                    <strong>Forecast bias</strong>
                    <p>
                      Positive bias means forecasts exceeded actual
                      generation on average. Negative bias means they fell
                      below actual generation.
                    </p>
                  </div>
                </div>

                <div className="methodology-note">
                  <strong>Methodology note</strong>
                  <p>
                    Forecasts are selected using their publication timestamp
                    and the configured day-ahead cutoff. The cutoff is an
                    explicit working assumption and should be confirmed with
                    the client.
                  </p>
                </div>
              </div>
            </section>

            <section className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h2>Hourly comparison data</h2>
                  <p>
                    {report.data.length} matched records · Values in MW
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Target interval (UTC)</th>
                      <th>Forecast</th>
                      <th>Actual</th>
                      <th>Error</th>
                      <th>Absolute error</th>
                      <th>Published at (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((row) => (
                      <tr key={row.startTime}>
                        <td>{row.startTime.replace("T", " ").replace("Z", "")}</td>
                        <td>{formatNumber(row.forecast)}</td>
                        <td>{formatNumber(row.actual)}</td>
                        <td
                          className={
                            row.error > 0
                              ? "positive-error"
                              : row.error < 0
                                ? "negative-error"
                                : ""
                          }
                        >
                          {row.error > 0 ? "+" : ""}
                          {formatNumber(row.error)}
                        </td>
                        <td>{formatNumber(row.absolute_error)}</td>
                        <td>
                          {row.publishedAt
                            .replace("T", " ")
                            .replace("+00:00", "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="footer">
          <span>WindScope · UK wind generation analysis</span>
          <span>Historical reporting period: January 2026 · All timestamps UTC</span>
        </footer>
      </main>
    </div>
  );
}