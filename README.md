# Tradie Toolkit AU
Deployable Next.js starter for Railway.

## Features
- Customer-facing quote builder
- Detailed job-description hint for exact product matching
- Editable hourly/fixed labour, materials/labour markup, other fees and GST
- Supplier comparison UI
- Server-side `/api/quote` route
- Connector architecture for authorised supplier APIs/catalogues
- Demo fallback that is clearly labelled and never presented as live pricing

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. `npm run dev`

## Railway
Create a Railway project, deploy this repo, add PostgreSQL, and set the environment variables. Keep supplier and AI credentials server-side.

## Live pricing rule
Only mark a price `live` when returned from an authorised supplier connector. Public-web fallback results should be marked `web_unverified` and require verification before becoming a final quote.
