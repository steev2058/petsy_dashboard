# Development login prefill

The login form is empty by default. A development deployment can opt in using
`frontend/.env.local` (not committed):

```dotenv
EXPO_PUBLIC_DEV_LOGIN_ENABLED=true
EXPO_PUBLIC_DEV_LOGIN_EMAIL=development.demo@petsy.company
EXPO_PUBLIC_DEV_LOGIN_PASSWORD=<dedicated demo account password>
```

These values are public in the exported frontend. Only use a dedicated ordinary
demo user, never an administrator or a real user's credentials. The form remains
editable and authentication still goes through the normal login endpoint.

The current development account is marked `development_demo: true` in MongoDB.
Do not store personal data in this shared account.

Before production, set `EXPO_PUBLIC_DEV_LOGIN_ENABLED=false`, remove the two
credential variables, rebuild the web export, and deploy it. Disable/delete the
demo user and its sessions as part of ending the development environment.
Changing the environment file alone does not change an already exported build.
