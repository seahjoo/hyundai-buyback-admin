# Hyundai Buyback Admin

## Deployment-ready Google Sheets setup

The dashboard can read Google Sheets privately without publishing CSV links.

### Local development

1. Put the Google service-account JSON file at:
   `credentials/google-service-account.json`
2. Share the Hyundai Google Sheets files with the service-account email as a viewer.
3. Make sure `Google Sheets API` is enabled in the Google Cloud project.

### Vercel deployment

Do not upload the JSON file to GitHub.

Instead, add these environment variables in Vercel:

```text
GOOGLE_SERVICE_ACCOUNT_JSON={...full JSON on one line...}
GOOGLE_SHEETS_INTAKE_SPREADSHEET_ID=1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc
GOOGLE_SHEETS_INTAKE_GID=1131119813
GOOGLE_SHEETS_INTAKE_TITLE=item_raw
GOOGLE_SHEETS_CREDIT_RAW_SPREADSHEET_ID=1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc
GOOGLE_SHEETS_CREDIT_RAW_TITLE=credit_raw
GOOGLE_SHEETS_USERS_RAW_SPREADSHEET_ID=1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc
GOOGLE_SHEETS_USERS_RAW_TITLE=users_raw
GOOGLE_SHEETS_CONFIRMED_SPREADSHEET_ID=1uLyqwopZnGlQ_q6vSVHYumV3ZPrfRnXhiyhPtS1i-nA
GOOGLE_SHEETS_CONFIRMED_GID=236160086
```

`GOOGLE_SERVICE_ACCOUNT_JSON` should be the full service-account JSON content pasted as one line.
Enable `Google Sheets API` in the same Google Cloud project.

## Notes

- Login accounts are configured in `lib/auth/session.ts`.
- Google service-account JSON should stay out of Git and be supplied through Vercel environment variables in production.
