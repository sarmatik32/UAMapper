# UkraineAlarm API (official)

In Vercel → Project → Settings → Environment Variables, add:

- Name: `UKRAINEALARM_API_TOKEN`
- Value: your API token
- Environments: Production, Preview (and Development if needed)

Redeploy after saving. The token is read only by the serverless API function and is not sent to the browser.

Available same-origin endpoints:

- `/api/ukrainealarm?resource=alerts` — current alert statuses
- `/api/ukrainealarm?resource=regions` — regions and identifiers
- `/api/ukrainealarm?resource=status` — last action status/index
- `/api/ukrainealarm?resource=history` — latest region alert history
- `/api/ukrainealarm?resource=region&regionId=REGION_ID` — status for one region

Successful responses have a `data` property containing the upstream UkraineAlarm API response. The endpoint applies a short server-side cache to avoid unnecessary polling. API errors are returned with an HTTP error status; alert data is not fabricated when the upstream service is unavailable.

Official docs: https://api.ukrainealarm.com/swagger/index.html
