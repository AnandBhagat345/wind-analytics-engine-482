# Wind Forecast Analytics

A web-based analytics dashboard for evaluating UK wind power generation forecasts against actual generation data for January 2026, using data from Elexon BMRS.

## Live Application

**Dashboard:** [https://wind-analytics-engine-482.vercel.app/](https://wind-analytics-engine-482.vercel.app/)

**Backend API:** [https://wind-analytics-engine-482-api.onrender.com](https://wind-analytics-engine-482-api.onrender.com)

**API Documentation:** [https://wind-analytics-engine-482-api.onrender.com/docs](https://wind-analytics-engine-482-api.onrender.com/docs)

## Project Overview

Wind generation forecasts are important for electricity market participants who need to understand forecast accuracy and deviations from actual generation.

Wind Forecast Analytics processes forecast and actual wind generation data for January 2026 and presents the results through an interactive dashboard.

The application helps users explore forecast performance, identify periods with large errors, and understand the differences between forecast and actual wind generation.

## Features

- **Forecast Accuracy Metrics:** Displays Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and forecast bias.
- **Forecast vs Actual Chart:** Visual comparison of forecast and actual wind generation over time.
- **Largest Forecast Errors:** Highlights intervals with the largest absolute forecast errors.
- **Hourly Data Table:** Provides interval-level forecast, actual generation, and error values.
- **Automated Data Retrieval:** Retrieves data from the Elexon BMRS API.
- **REST API:** Uses FastAPI to retrieve, process, and serve analytics data.
- **Interactive Dashboard:** Built with React and Recharts.

## Technology Stack

### Frontend

- React
- Vite
- Recharts
- Lucide React
- CSS

### Backend

- Python
- FastAPI
- HTTPX
- Pandas

### Deployment

- Vercel for the frontend
- Render for the backend
- GitHub for version control

### Data Source

- Elexon BMRS API

## Project Structure

```text
wind-forecast-analytics/
├── backend/
│   └── app/
│       ├── __init__.py
│       └── main.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── ...
├── Dockerfile
├── .dockerignore
├── .gitignore
└── requirements.txt
```

## Getting Started

### Prerequisites

Install the following:

- Python 3.12 or a compatible Python version
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/wind-analytics-engine-482.git
cd wind-analytics-engine-482
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

### 2. Set Up the Backend

Create and activate a virtual environment.

**Windows PowerShell:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
pip install -r requirements.txt
```

Start the FastAPI server from the repository root:

```powershell
python -m uvicorn backend.app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Set Up the Frontend

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` directory with the following content:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend development server:

```bash
npm run dev
```

Open the local dashboard at:

```text
http://localhost:5173
```

**Note:** Keep the backend and frontend servers running in separate terminals. The backend must be available for the dashboard to retrieve analytics data.

## API Endpoints

| Endpoint                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `GET /`                   | Root endpoint                                      |
| `GET /health`             | Backend health check                               |
| `GET /api/actuals`        | Retrieves actual wind generation data              |
| `GET /api/forecasts`      | Retrieves wind generation forecast data            |
| `GET /api/actuals/hourly` | Provides hourly actual generation data             |
| `GET /api/accuracy`       | Returns forecast accuracy metrics and matched data |

The complete interactive API documentation is available at `/docs`.

## Forecast Evaluation Methodology

The application retrieves forecast and actual generation data for January 2026 and processes them into comparable hourly intervals.

The evaluation workflow consists of:

1. Retrieving actual wind generation data from Elexon BMRS.
2. Retrieving wind generation forecasts covering the evaluation period.
3. Aggregating actual generation records into hourly values.
4. Selecting forecast records according to the implemented publication-time cutoff.
5. Matching forecast values with actual generation for comparable hourly intervals.
6. Calculating forecast errors and summary accuracy metrics.

### Error Definition

Forecast error is calculated as:

`Error = Forecast - Actual`

A positive error indicates that the forecast was higher than actual generation. A negative error indicates that the forecast was lower than actual generation.

### Evaluation Metrics

**Mean Absolute Error (MAE)**

The average absolute difference between forecast and actual generation. Lower values indicate smaller average errors.

**Root Mean Squared Error (RMSE)**

The square root of the average squared forecast error. Larger errors have a greater influence on this metric.

**Forecast Bias**

The average signed forecast error. Positive bias indicates overforecasting on average, while negative bias indicates underforecasting.

### Forecast Selection Assumption

The current implementation uses a cutoff of **12:00 UTC on the previous day** when selecting eligible forecast publications. This is an implementation assumption for the evaluation and should not be interpreted as a universally applicable electricity-market rule.

## Limitations

- Results depend on the availability and quality of data returned by the upstream Elexon BMRS API.
- Forecast accuracy depends on the selected publication-time cutoff and interval-matching methodology.
- Aggregation and matching decisions affect the resulting metrics.
- The evaluation covers January 2026 rather than a full-year or multi-year period.
- The dashboard is an analytical tool and does not provide electricity trading recommendations.

## Running with Docker

The repository includes a Dockerfile for the FastAPI backend.

Build the image from the repository root:

```bash
docker build -t wind-forecast-analytics .
```

Run the container:

```bash
docker run -p 8000:8000 wind-forecast-analytics
```

The API will be available at `http://localhost:8000`.

## AI Assistance Disclosure

AI tools were used to assist with development, debugging, and documentation. The implementation was reviewed and tested during development.

## Author

Developed as a wind forecast analytics application using publicly accessible electricity-market data.
