from fastapi import FastAPI, HTTPException
import httpx, math
from datetime import datetime, timedelta, date, timezone
from fastapi.middleware.cors import CORSMiddleware

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Wind Forecast Analytics",
    description="UK wind power forecast and actual generation analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://wind-analytics-engine-482.vercel.app/",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"


@app.get("/")
def home():
    return {"message": "Wind Forecast Analytics API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/actuals")
async def get_actual_generation():
    """Fetch January 2026 actual wind generation in 7-day batches."""

    url = f"{ELEXON_BASE_URL}/datasets/FUELHH"
    all_records = []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            start_date = date(2026, 1, 1)
            end_date = date(2026, 2, 1)

            current_date = start_date

            while current_date < end_date:
                batch_end = min(
                    current_date + timedelta(days=6),
                    end_date - timedelta(days=1),
                )

                params = {
                    "settlementDateFrom": current_date.isoformat(),
                    "settlementDateTo": batch_end.isoformat(),
                    "format": "json",
                }

                response = await client.get(url, params=params)
                response.raise_for_status()
                result = response.json()

                records = (
                    result.get("data", [])
                    if isinstance(result, dict)
                    else result
                )

                all_records.extend(
                    record
                    for record in records
                    if record.get("fuelType") == "WIND"
                )

                current_date = batch_end + timedelta(days=1)

        return {
            "month": "January 2026",
            "dataset": "FUELHH",
            "total_records": len(all_records),
            "data": all_records[:20],
        }

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Elexon API request failed: {exc}",
        ) from exc
        
        
@app.get("/api/forecasts")
async def get_forecasts():
    """Fetch January 2026 wind forecast records."""

    url = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

    params = {
    "publishDateTimeFrom": "2026-01-01T00:00:00Z",
    "publishDateTimeTo": "2026-02-01T00:00:00Z",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()

        records = result.get("data", []) if isinstance(result, dict) else result

        return {
            "dataset": "WINDFOR",
            "total_records": len(records),
            "data": records[:20],
        }

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Elexon forecast request failed: {exc}",
        ) from exc
        
        
@app.get("/api/actuals/hourly")
async def get_hourly_actuals():
    """Convert 30-minute FUELHH records into hourly wind generation."""
    url = f"{ELEXON_BASE_URL}/datasets/FUELHH"
    all_records = []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            start_date = date(2026, 1, 1)
            end_date = date(2026, 2, 1)
            current_date = start_date

            while current_date < end_date:
                batch_end = min(
                    current_date + timedelta(days=6),
                    end_date - timedelta(days=1),
                )

                params = {
                    "settlementDateFrom": current_date.isoformat(),
                    "settlementDateTo": batch_end.isoformat(),
                    "format": "json",
                }

                response = await client.get(url, params=params)
                response.raise_for_status()

                result = response.json()
                records = (
                    result.get("data", [])
                    if isinstance(result, dict)
                    else result
                )

                all_records.extend(
                    record for record in records
                    if record.get("fuelType") == "WIND"
                )

                current_date = batch_end + timedelta(days=1)

        hourly = {}

        for record in all_records:
            start_time = record.get("startTime")
            generation = record.get("generation")

            if start_time is None or generation is None:
                continue

            
            hour_key = start_time[:13] + ":00:00Z"

            hourly.setdefault(hour_key, []).append(float(generation))

        hourly_data = [
            {
                "startTime": hour,
                "generation": sum(values) / len(values),
                "intervals_found": len(values),
            }
            for hour, values in sorted(hourly.items())
        ]

        return {
            "dataset": "FUELHH",
            "month": "January 2026",
            "total_half_hourly_records": len(all_records),
            "total_hourly_records": len(hourly_data),
            "data": hourly_data[:20],
        }

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Elexon actuals request failed: {exc}",
        ) from exc
        

@app.get("/api/accuracy")
async def get_forecast_accuracy():
    """Compare day-ahead wind forecasts with actual generation."""
    actual_url = f"{ELEXON_BASE_URL}/datasets/FUELHH"
    forecast_url = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

    actual_records = []
    forecast_records = []

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:

            current_date = date(2026, 1, 1)
            end_date = date(2026, 2, 1)

            while current_date < end_date:
                batch_end = min(
                    current_date + timedelta(days=6),
                    end_date - timedelta(days=1),
                )

                response = await client.get(
                    actual_url,
                    params={
                        "settlementDateFrom": current_date.isoformat(),
                        "settlementDateTo": batch_end.isoformat(),
                        "format": "json",
                    },
                )
                response.raise_for_status()

                result = response.json()
                records = (
                    result.get("data", [])
                    if isinstance(result, dict)
                    else result
                )

                actual_records.extend(
                    r for r in records
                    if r.get("fuelType") == "WIND"
                )

                current_date = batch_end + timedelta(days=1)

            response = await client.get(
                forecast_url,
                params={
                    "publishDateTimeFrom": "2025-12-30T00:00:00Z",
                    "publishDateTimeTo": "2026-02-01T00:00:00Z",
                },
            )
            response.raise_for_status()

            result = response.json()
            forecast_records = (
                result.get("data", [])
                if isinstance(result, dict)
                else result
            )

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Elexon API request failed: {exc}",
        ) from exc

    actual_groups = {}
    for record in actual_records:
        start_time = record.get("startTime")
        generation = record.get("generation")

        if not start_time or generation is None:
            continue

        hour_key = start_time[:13]

        actual_groups.setdefault(hour_key, []).append(float(generation))

    hourly_actuals = {
        hour: sum(values) / len(values)
        for hour, values in actual_groups.items()
        if len(values) == 2
    }

    selected_half_hour_forecasts = {}

    january_start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    february_start = datetime(2026, 2, 1, tzinfo=timezone.utc)

    for record in forecast_records:
        start_time = record.get("startTime")
        publish_time = record.get("publishTime")
        generation = record.get("generation")

        if not start_time or not publish_time or generation is None:
            continue

        target_time = datetime.fromisoformat(
            start_time.replace("Z", "+00:00")
        )
        published_at = datetime.fromisoformat(
            publish_time.replace("Z", "+00:00")
        )

        if not (january_start <= target_time < february_start):
            continue

        cutoff = (
            target_time.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            - timedelta(days=1)
            + timedelta(hours=12)
        )

        if published_at > cutoff:
            continue

        interval_key = target_time.isoformat()
        previous = selected_half_hour_forecasts.get(interval_key)

        if previous is None or published_at > previous["published_at"]:
            selected_half_hour_forecasts[interval_key] = {
                "generation": float(generation),
                "published_at": published_at,
                "target_time": target_time,
            }

    forecast_groups = {}

    for item in selected_half_hour_forecasts.values():
        hour_key = item["target_time"].strftime("%Y-%m-%dT%H")

        forecast_groups.setdefault(hour_key, []).append(item)

    hourly_forecasts = {
        hour: {
            "forecast": sum(
                item["generation"] for item in items
            ) / len(items),
            "published_at": max(
                item["published_at"] for item in items
            ),
            "intervals_found": len(items),
        }
        for hour, items in forecast_groups.items()
    }

    comparisons = []

    for hour in sorted(hourly_forecasts):
        if hour not in hourly_actuals:
            continue

        forecast = hourly_forecasts[hour]["forecast"]
        actual = hourly_actuals[hour]
        error = forecast - actual

        comparisons.append({
            "startTime": hour + ":00:00Z",
            "forecast": round(forecast, 2),
            "actual": round(actual, 2),
            "error": round(error, 2),
            "absolute_error": round(abs(error), 2),
            "publishedAt": hourly_forecasts[hour][
                "published_at"
            ].isoformat(),
        })

    if not comparisons:
        group_size_counts = {}

        for items in forecast_groups.values():
            size = len(items)
            group_size_counts[size] = (
                group_size_counts.get(size, 0) + 1
            )

        return {
            "debug": True,
            "selected_forecast_count": len(
                selected_half_hour_forecasts
            ),
            "forecast_hour_groups": len(forecast_groups),
            "group_size_counts": group_size_counts,
            "sample_forecast_groups": [
                {
                    "hour": hour,
                    "intervals_found": len(items),
                    "target_times": [
                        item["target_time"].isoformat()
                        for item in items
                    ],
                }
                for hour, items in list(forecast_groups.items())[:10]
            ],
            "sample_selected_forecasts": [
                {
                    "target_time": item["target_time"].isoformat(),
                    "published_at": item["published_at"].isoformat(),
                    "generation": item["generation"],
                }
                for item in list(
                    selected_half_hour_forecasts.values()
                )[:5]
            ],
        }
        detail=(
                "No matching forecast and actual records found. "
                "Check API date filters and forecast publication coverage."
        ),
        

    errors = [row["error"] for row in comparisons]
    absolute_errors = [abs(error) for error in errors]

    mae = sum(absolute_errors) / len(absolute_errors)
    rmse = math.sqrt(
        sum(error ** 2 for error in errors) / len(errors)
    )
    bias = sum(errors) / len(errors)

    return {
        "month": "January 2026",
        "decision_cutoff": "12:00 UTC on the previous day",
        "matched_intervals": len(comparisons),
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "bias_mw": round(bias, 2),
        "error_definition": "forecast - actual",
        "data": comparisons,
    }