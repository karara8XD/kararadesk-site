# KararaDesk Website v1.5.0

This is a static GitHub Pages site. No npm install or build step is required.

## Production endpoints

- Website: `https://karara8xd.github.io/kararadesk-site/`
- Enterprise API: `https://kararadesk.duckdns.org/api/enterprise`
- OAuth callback: `https://kararadesk.duckdns.org/api/enterprise/oauth/callback`
- Terms: `https://karara8xd.github.io/kararadesk-site/terms.html`
- Privacy: `https://karara8xd.github.io/kararadesk-site/privacy.html`

## Publish

Replace the repository-root files in `karara8XD/kararadesk-site` with the contents of `kararadesk-site-main`, commit, and push to `main`.

GitHub Pages should use:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

## Enterprise flow

1. User authorizes Discord scopes `identify email guilds.join`.
2. The API adds the user to the KararaDesk support server.
3. Membership Screening must be completed.
4. The page polls membership status.
5. The form creates a private Discord Enterprise ticket.
6. The page displays `OPENED TICKET` and redirects to the channel.

Never place a Discord Client Secret, bot token, webhook URL, private key, or payment secret in this repository.
